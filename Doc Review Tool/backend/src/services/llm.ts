import { callClaude, isAnthropicAvailable } from './claude';
import { callGPT, isOpenAIAvailable } from './openai-client';
import type { LLMProvider, LLMResponse } from '@shared/types';

// Model constants — single source of truth
export const MODELS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-6',
  OPUS: 'claude-opus-4-6',
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
 * Handles: clean JSON, markdown-wrapped JSON, and truncated JSON (max_tokens hit).
 *
 * Pass `requiredKeys` to validate that the parsed result contains all expected
 * top-level fields. This prevents silently returning corrupt data when truncation
 * removes required fields.
 */
export function parseJSONResponse<T>(
  content: string,
  requiredKeys?: string[],
): T {
  // Try direct parse first
  try {
    const result = JSON.parse(content) as T;
    validateRequiredKeys(result, requiredKeys);
    return result;
  } catch (e) {
    if (e instanceof JSONValidationError) throw e;

    // Strip markdown code fences
    let cleaned = content.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '');

    try {
      const result = JSON.parse(cleaned) as T;
      validateRequiredKeys(result, requiredKeys);
      return result;
    } catch (e2) {
      if (e2 instanceof JSONValidationError) throw e2;

      // Attempt to repair truncated JSON (output cut off at max_tokens).
      // Strategy: close any open strings, arrays, and objects.
      cleaned = cleaned.trimEnd();

      // If it ends mid-string, close the string
      const quoteCount = (cleaned.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        cleaned += '"';
      }

      // Close open brackets/braces from innermost out
      const stack: string[] = [];
      let inString = false;
      for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        // Correct escape detection: count consecutive preceding backslashes
        if (ch === '"' && !isEscapedQuote(cleaned, i)) {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (ch === '{' || ch === '[') stack.push(ch);
        if (ch === '}' || ch === ']') stack.pop();
      }

      // Close unclosed brackets (innermost first)
      while (stack.length > 0) {
        const open = stack.pop();
        // Remove trailing comma before closing
        cleaned = cleaned.replace(/,\s*$/, '');
        cleaned += open === '{' ? '}' : ']';
      }

      console.warn(
        `[parseJSONResponse] Repaired truncated JSON (original: ${content.length} chars, repaired: ${cleaned.length} chars)`,
      );
      const result = JSON.parse(cleaned) as T;
      validateRequiredKeys(result, requiredKeys);
      return result;
    }
  }
}

/** Check if a quote character at `pos` is escaped by an odd number of preceding backslashes. */
function isEscapedQuote(s: string, pos: number): boolean {
  let count = 0;
  let i = pos - 1;
  while (i >= 0 && s[i] === '\\') {
    count++;
    i--;
  }
  return count % 2 !== 0;
}

export class JSONValidationError extends Error {
  constructor(missingKeys: string[]) {
    super(
      `Parsed JSON is missing required keys: ${missingKeys.join(', ')}. ` +
      `This likely indicates truncated LLM output.`,
    );
    this.name = 'JSONValidationError';
  }
}

function validateRequiredKeys<T>(result: T, requiredKeys?: string[]): void {
  if (!requiredKeys || !result || typeof result !== 'object') return;
  const obj = result as Record<string, unknown>;
  const missing = requiredKeys.filter((key) => !(key in obj));
  if (missing.length > 0) {
    throw new JSONValidationError(missing);
  }
}
