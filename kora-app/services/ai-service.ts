import axios from 'axios';
import { Paths, File } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Buffer } from 'buffer'; // Requires polyfill installation
import { getOnboardingPrompt } from './kora-onboarding-prompt';
import { getConversationPrompt, INTENT_CLASSIFIER_PROMPT } from './kora-conversation-prompt';

// Configuration (Should be in .env in production)
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const MISTRAL_API_KEY = process.env.EXPO_PUBLIC_MISTRAL_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Default Rachel voice

export interface AIResponse {
    text: string;
    action?: string;
    data?: any;
    nextStep?: string;
    shouldAdvance?: boolean;
}

export class AIService {
    /**
     * Transcribe audio using OpenAI Whisper
     */
    static async transcribe(audioUri: string): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: audioUri,
                name: 'audio.m4a',
                type: 'audio/m4a',
            } as any);
            formData.append('model', 'whisper-1');

            const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data.text;
        } catch (error) {
            console.error('Whisper Error:', error);
            throw new Error('Failed to transcribe audio.');
        }
    }

    /**
     * Generate response handling both Onboarding and Conversation flows
     */
    static async generateResponse(userText: string, context: any): Promise<AIResponse> {
        try {
            // Determine if we are in onboarding or conversation mode
            // Onboarding context usually has a 'step' or explicit mode flag
            if (context.isOnboarding || (context.step && context.step !== 'COMPLETE')) {
                return await this.handleOnboardingFlow(userText, context);
            } else {
                return await this.handleConversationFlow(userText, context);
            }
        } catch (error) {
            console.error('AI Service Error:', error);
            return {
                text: "I'm having a little trouble connecting to my brain right now. Can you say that again?",
                action: 'ERROR'
            };
        }
    }

    /**
     * Handle the Onboarding Loop
     */
    private static async handleOnboardingFlow(userText: string, context: any): Promise<AIResponse> {
        try {
            const systemPrompt = getOnboardingPrompt({
                step: context.step,
                currency: context.currency || 'NGN',
                collectedData: context.collectedData || {},
                userMessage: userText
            });

            const completion = await this.callLLM(systemPrompt, userText);

            return {
                text: completion.response,
                action: completion.shouldAdvance ? 'NEXT_STEP' : 'DATA_EXTRACTED',
                data: completion.extracted || {},
                nextStep: completion.nextStep,
                shouldAdvance: completion.shouldAdvance
            };
        } catch (error) {
            console.error('Onboarding Flow Error:', error);
            throw error;
        }
    }

    /**
     * Handle General Conversation with Intent Classification
     */
    private static async handleConversationFlow(userText: string, context: any): Promise<AIResponse> {
        try {
            // 1. Classify Intent
            const intentPrompt = INTENT_CLASSIFIER_PROMPT.replace('{message}', userText);
            const classification = await this.callLLM(intentPrompt, userText);

            const intent = classification.intent || 'GENERAL';
            console.log('Classified Intent:', intent, classification);

            // 2. Generate Contextual Response
            const systemPrompt = getConversationPrompt({
                intent,
                currency: context.currency || 'NGN',
                userProfile: context.userProfile || {
                    income: 0,
                    payday: 1,
                    fixedExpenses: 0,
                    currentBalance: 0
                },
                financialState: context.financialState || {
                    safeSpendToday: 0,
                    daysToPayday: 1,
                    spentToday: 0,
                    upcomingBills: 0,
                    flexibleRemaining: 0
                },
                patterns: context.patterns,
                userMessage: userText,
                detectedEmotion: classification.extracted?.emotion,
                extractedAmount: classification.extracted?.amount,
                extractedItem: classification.extracted?.item
            });

            const completion = await this.callLLM(systemPrompt, userText);

            return {
                text: completion.response,
                action: intent,
                data: {
                    ...completion.analysis,
                    ...completion.data,
                    classification: classification
                }
            };
        } catch (error) {
            console.error('Conversation Flow Error:', error);
            throw error;
        }
    }

    /**
     * Helper to call Mistral LLM
     */
    private static async callLLM(systemPrompt: string, userMessage: string): Promise<any> {
        const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-tiny',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Parse JSON content
        const contentStr = response.data.choices[0].message.content;
        try {
            return JSON.parse(contentStr);
        } catch {
            console.error("Failed to parse LLM JSON response:", contentStr);
            throw new Error("Invalid JSON from LLM");
        }
    }

    /**
     * Text-to-Speech using ElevenLabs with fallback to Expo Speech
     */
    static async speak(text: string): Promise<string | null> {
        try {
            // Try ElevenLabs
            const response = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
                {
                    text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                },
                {
                    headers: {
                        'xi-api-key': ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'arraybuffer'
                }
            );

            // Save to temporary file using new expo-file-system API
            const speechFile = new File(Paths.cache, 'speech.mp3');
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            speechFile.write(base64, { encoding: 'base64' });

            return speechFile.uri;

        } catch (error) {
            console.log('ElevenLabs failed, using fallback:', error);
            Speech.speak(text);
            return null; // Return null so UI knows we used native speech
        }
    }
}
