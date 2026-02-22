import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

let client: Anthropic | null = null;

/**
 * Get or create the Anthropic client.
 * Lazy initialization — only creates client when first called.
 * Warns but doesn't crash if API key is missing.
 */
export function getAnthropicClient(): Anthropic | null {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set — Claude API calls will fail');
    return null;
  }

  client = new Anthropic({ apiKey });
  return client;
}

/**
 * Check if Anthropic client is available.
 */
export function isAnthropicAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Call Claude with a message. Returns the text response.
 * This is the low-level helper — pipeline stages will use this.
 */
export async function callClaude(params: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  cacheSystemPrompt?: boolean;
}): Promise<{
  content: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number };
  latencyMs: number;
}> {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    throw new Error('Anthropic client not initialized — check ANTHROPIC_API_KEY');
  }

  const start = Date.now();

  // Note: Anthropic prompt caching requires minimum 4096 tokens for Opus/Sonnet
  // (2048 for Haiku). Below the threshold, cache_control is silently ignored.
  const systemContent: Anthropic.MessageCreateParams['system'] = params.cacheSystemPrompt
    ? [
        {
          type: 'text',
          text: params.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ]
    : params.systemPrompt;

  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 4096,
    temperature: params.temperature ?? 0.2,
    system: systemContent,
    messages: [{ role: 'user', content: params.userMessage }],
  });

  const latencyMs = Date.now() - start;

  if (response.stop_reason === 'max_tokens') {
    console.warn(`[claude] Response truncated (max_tokens hit) for model ${params.model}. Output tokens: ${response.usage.output_tokens}`);
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  const content = textBlock ? textBlock.text : '';

  return {
    content,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: (response.usage as unknown as Record<string, number>).cache_read_input_tokens,
    },
    latencyMs,
  };
}
