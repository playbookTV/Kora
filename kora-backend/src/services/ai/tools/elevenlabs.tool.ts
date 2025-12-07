import axios from 'axios';
import { env } from '../../../config/env.js';

export class ElevenLabsTool {
  private static readonly baseUrl = 'https://api.elevenlabs.io/v1';

  static async synthesize(text: string): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${env.ELEVENLABS_VOICE_ID}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  static async getVoices() {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
        },
      });

      return response.data.voices;
    } catch (error) {
      console.error('ElevenLabs get voices error:', error);
      throw new Error('Failed to fetch voices');
    }
  }
}
