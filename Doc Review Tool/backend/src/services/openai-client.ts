import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let client: OpenAI | null = null;

/**
 * Get or create the OpenAI client.
 * Lazy initialization — only creates client when first called.
 * Warns but doesn't crash if API key is missing.
 */
export function getOpenAIClient(): OpenAI | null {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set — OpenAI API calls will fail');
    return null;
  }

  client = new OpenAI({ apiKey });
  return client;
}

/**
 * Check if OpenAI client is available.
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Call GPT with a message. Returns the text response.
 * This is the low-level helper — pipeline stages will use this.
 */
export async function callGPT(params: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}): Promise<{
  content: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI client not initialized — check OPENAI_API_KEY');
  }

  const start = Date.now();

  const response = await openai.chat.completions.create({
    model: params.model,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 4096,
    response_format: params.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userMessage },
    ],
  });

  const latencyMs = Date.now() - start;

  const content = response.choices[0]?.message?.content || '';

  return {
    content,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
    latencyMs,
  };
}
