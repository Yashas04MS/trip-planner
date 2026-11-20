import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { env } from '../config/env';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (!env.hasGemini) return null;
  if (!client) {
    client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return client;
}

export async function generateConciergeSpokenReply(params: {
  systemInstruction: string;
  userGoal: string;
  factsSummary: string;
}): Promise<{ text: string; usedGemini: boolean; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      text: params.factsSummary,
      usedGemini: false,
    };
  }

  try {
    const model = env.GEMINI_MODEL || 'gemini-4-hydrogen';
    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [
          `User said: "${params.userGoal}"`,
          `Verified tool facts to communicate concisely (max 3 short spoken sentences, no markdown, no bullets, natural numbers):`,
          params.factsSummary,
        ].join('\n\n'),
        config: {
          systemInstruction: params.systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini spoken reply timed out')), 8000),
      ),
    ]);

    const text = response.text?.trim();
    if (!text) {
      return { text: params.factsSummary, usedGemini: true };
    }
    return { text, usedGemini: true };
  } catch (err) {
    return {
      text: params.factsSummary,
      usedGemini: false,
      error: err instanceof Error ? err.message : 'Gemini call failed',
    };
  }
}
