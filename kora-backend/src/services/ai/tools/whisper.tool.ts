import OpenAI from 'openai';
import { env } from '../../../config/env.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class WhisperTool {
  static async transcribe(audioBuffer: Buffer, filename: string = 'audio.m4a'): Promise<string> {
    try {
      // Create a File object from the buffer
      const file = new File([audioBuffer], filename, {
        type: 'audio/m4a',
      });

      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
      });

      return response.text;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
}
