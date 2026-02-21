import { callClaude, isAnthropicAvailable } from './claude';
import { callGPT, isOpenAIAvailable } from './openai-client';
import type { LLMProvider, LLMResponse } from '@shared/types';

// Model constants — single source of truth
export const MODELS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-6-20250116',
  OPUS: 'claude-opus-4-6-20250116',
  GPT52: 'gpt-5.2',
} as const;

export interface LLMCallParams {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature: number;
  maxTokens?: number;
  cacheSystemPrompt?: boolean;
  responseFormat?: 'text' | 'json_object';
}

/**
 * Unified LLM call interface.
 * Routes to the correct provider (Anthropic or OpenAI) and returns a standardized response.
 * All pipeline stages use this — never call claude.ts or openai-client.ts directly.
 */
export async function callLLM(params: LLMCallParams): Promise<LLMResponse> {
  switch (params.provider) {
    case 'anthropic':
      return callAnthropicLLM(params);
    case 'openai':
      return callOpenAILLM(params);
    default:
      throw new Error(`Unsupported LLM provider: ${params.provider}`);
  }
}

async function callAnthropicLLM(params: LLMCallParams): Promise<LLMResponse> {
  if (!isAnthropicAvailable()) {
    throw new Error('Anthropic API key not configured');
  }

  const result = await callClaude({
    model: params.model,
    systemPrompt: params.systemPrompt,
    userMessage: params.userMessage,
    temperature: params.temperature,
    maxTokens: params.maxTokens ?? 4096,
    cacheSystemPrompt: params.cacheSystemPrompt ?? false,
  });

  return {
    content: result.content,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      cacheReadTokens: result.usage.cacheReadTokens,
    },
    model: params.model,
    latencyMs: result.latencyMs,
  };
}

async function callOpenAILLM(params: LLMCallParams): Promise<LLMResponse> {
  if (!isOpenAIAvailable()) {
    throw new Error('OpenAI API key not configured');
  }

  const result = await callGPT({
    model: params.model,
    systemPrompt: params.systemPrompt,
    userMessage: params.userMessage,
    temperature: params.temperature,
    maxTokens: params.maxTokens ?? 4096,
    responseFormat: params.responseFormat,
  });

  return {
    content: result.content,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
    model: params.model,
    latencyMs: result.latencyMs,
  };
}

/**
 * Parse JSON from an LLM response.
 * Uses structured output (json_object mode) so responses should be clean JSON.
 * Falls back to extracting from markdown code blocks if needed.
 */
export function parseJSONResponse<T>(content: string): T {
  // Try direct parse first (structured output should give clean JSON)
  try {
    return JSON.parse(content) as T;
  } catch {
    // Fall back: strip markdown code fences if the model wrapped it
    const stripped = content.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '');
    return JSON.parse(stripped) as T;
  }
}
