import type { QuoteVerification, QuoteVerificationStatus } from '@shared/types';

// Thresholds from stress-test POC (verified: real quotes avg 0.862, hallucinated avg 0.173)
const VERIFIED_THRESHOLD = 0.75;
const REVIEW_THRESHOLD = 0.50;

/**
 * Verify a quote against the source document using algorithmic matching.
 * 3-tier system: VERIFIED (>0.75) / REVIEW (0.50-0.75) / REJECTED (<0.50)
 *
 * Uses three signals:
 * 1. N-gram precision: what fraction of the quote's word n-grams appear in the source
 * 2. LCS ratio: longest common subsequence relative to quote length
 * 3. Contiguity: how clustered the matching words are in the source
 *
 * The combined score is a weighted average: ngram 0.5, lcs 0.3, contiguity 0.2
 */
export function verifyQuote(quote: string, documentText: string): QuoteVerification {
  if (!quote || !documentText) {
    return {
      originalQuote: quote || '',
      bestMatch: '',
      score: 0,
      status: 'rejected',
      matchDetails: { lcsRatio: 0, contiguity: 0, ngramPrecision: 0 },
    };
  }

  const normalizedQuote = normalize(quote);
  const normalizedDoc = normalize(documentText);

  if (!normalizedQuote || !normalizedDoc) {
    return {
      originalQuote: quote,
      bestMatch: '',
      score: 0,
      status: 'rejected',
      matchDetails: { lcsRatio: 0, contiguity: 0, ngramPrecision: 0 },
    };
  }

  // Find the best matching window in the document
  const { bestMatch, ngramPrecision, lcsRatio, contiguity } = findBestMatch(
    normalizedQuote,
    normalizedDoc,
  );

  // Weighted score
  const score = ngramPrecision * 0.5 + lcsRatio * 0.3 + contiguity * 0.2;

  let status: QuoteVerificationStatus;
  if (score >= VERIFIED_THRESHOLD) {
    status = 'verified';
  } else if (score >= REVIEW_THRESHOLD) {
    status = 'review';
  } else {
    status = 'rejected';
  }

  return {
    originalQuote: quote,
    bestMatch,
    score: Math.round(score * 1000) / 1000,
    status,
    matchDetails: {
      lcsRatio: Math.round(lcsRatio * 1000) / 1000,
      contiguity: Math.round(contiguity * 1000) / 1000,
      ngramPrecision: Math.round(ngramPrecision * 1000) / 1000,
    },
  };
}

/**
 * Verify all quotes in an array of issues against the document.
 */
export function verifyQuotes(
  quotes: Array<{ id: string; quote: string }>,
  documentText: string,
): Map<string, QuoteVerification> {
  const results = new Map<string, QuoteVerification>();
  for (const { id, quote } of quotes) {
    results.set(id, verifyQuote(quote, documentText));
  }
  return results;
}

// === Internal helpers ===

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

/**
 * Find the best matching window in the document for the given quote.
 * Uses a sliding window approach with n-gram matching.
 */
function findBestMatch(
  normalizedQuote: string,
  normalizedDoc: string,
): {
  bestMatch: string;
  ngramPrecision: number;
  lcsRatio: number;
  contiguity: number;
} {
  const quoteTokens = tokenize(normalizedQuote);
  const docTokens = tokenize(normalizedDoc);

  if (quoteTokens.length === 0 || docTokens.length === 0) {
    return { bestMatch: '', ngramPrecision: 0, lcsRatio: 0, contiguity: 0 };
  }

  // Build n-gram sets for the quote (bigrams and trigrams)
  const quoteBigrams = buildNgrams(quoteTokens, 2);
  const quoteTrigrams = buildNgrams(quoteTokens, 3);

  // Sliding window: try windows of size quoteLen * 0.5 to quoteLen * 2
  const windowMin = Math.max(3, Math.floor(quoteTokens.length * 0.5));
  const windowMax = Math.min(docTokens.length, Math.ceil(quoteTokens.length * 2.5));

  let bestScore = 0;
  let bestStart = 0;
  let bestEnd = 0;
  let bestNgram = 0;
  let bestLcs = 0;
  let bestContiguity = 0;

  // Step size: skip by 1 for short quotes, larger steps for long docs
  const step = quoteTokens.length < 20 ? 1 : Math.max(1, Math.floor(quoteTokens.length / 4));

  for (let start = 0; start < docTokens.length - windowMin; start += step) {
    for (
      let windowSize = windowMin;
      windowSize <= windowMax && start + windowSize <= docTokens.length;
      windowSize += Math.max(1, Math.floor(quoteTokens.length / 3))
    ) {
      const windowTokens = docTokens.slice(start, start + windowSize);

      // Quick pre-filter: check if at least 30% of quote words are in window
      const windowSet = new Set(windowTokens);
      const overlapCount = quoteTokens.filter((t) => windowSet.has(t)).length;
      if (overlapCount / quoteTokens.length < 0.3) continue;

      // N-gram precision
      const windowBigrams = buildNgrams(windowTokens, 2);
      const windowTrigrams = buildNgrams(windowTokens, 3);

      const bigramHits = countIntersection(quoteBigrams, windowBigrams);
      const trigramHits = countIntersection(quoteTrigrams, windowTrigrams);

      const bigramPrecision = quoteBigrams.size > 0 ? bigramHits / quoteBigrams.size : 0;
      const trigramPrecision = quoteTrigrams.size > 0 ? trigramHits / quoteTrigrams.size : 0;
      const ngramPrecision = bigramPrecision * 0.4 + trigramPrecision * 0.6;

      // LCS ratio (use token-level for speed)
      const lcsLen = lcsLength(quoteTokens, windowTokens);
      const lcsRatio = lcsLen / quoteTokens.length;

      // Contiguity: what fraction of matching tokens are in a contiguous run
      const contiguity = computeContiguity(quoteTokens, windowTokens);

      const score = ngramPrecision * 0.5 + lcsRatio * 0.3 + contiguity * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestStart = start;
        bestEnd = start + windowSize;
        bestNgram = ngramPrecision;
        bestLcs = lcsRatio;
        bestContiguity = contiguity;
      }

      // Early exit if we found a very good match
      if (bestScore > 0.95) break;
    }
    if (bestScore > 0.95) break;
  }

  const bestMatchTokens = docTokens.slice(bestStart, bestEnd);
  return {
    bestMatch: bestMatchTokens.join(' '),
    ngramPrecision: bestNgram,
    lcsRatio: bestLcs,
    contiguity: bestContiguity,
  };
}

function buildNgrams(tokens: string[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function countIntersection(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count++;
  }
  return count;
}

/**
 * Token-level LCS length (O(n*m) but bounded by window size).
 * For very long sequences, samples to avoid O(n^2) blowup.
 */
function lcsLength(a: string[], b: string[]): number {
  // If either is very long, use a sampled approximation
  const maxLen = 200;
  const sa = a.length > maxLen ? sampleTokens(a, maxLen) : a;
  const sb = b.length > maxLen ? sampleTokens(b, maxLen) : b;

  const m = sa.length;
  const n = sb.length;
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (sa[i - 1] === sb[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j];
      curr[j] = 0;
    }
  }

  // Scale back up if sampled
  const scale = a.length > maxLen ? a.length / maxLen : 1;
  return Math.round(prev[n] * scale);
}

function sampleTokens(tokens: string[], maxLen: number): string[] {
  if (tokens.length <= maxLen) return tokens;
  const step = tokens.length / maxLen;
  const sampled: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    sampled.push(tokens[Math.floor(i * step)]);
  }
  return sampled;
}

/**
 * Compute contiguity: what fraction of the quote's matched words
 * appear in the longest contiguous run within the window.
 */
function computeContiguity(quoteTokens: string[], windowTokens: string[]): number {
  const quoteSet = new Set(quoteTokens);
  let maxRun = 0;
  let currentRun = 0;

  for (const token of windowTokens) {
    if (quoteSet.has(token)) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return quoteTokens.length > 0 ? Math.min(1, maxRun / quoteTokens.length) : 0;
}
