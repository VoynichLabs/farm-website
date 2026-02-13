/*
 * Author: GPT-5 Codex
 * Date: 2025-10-17 19:10 UTC
 * PURPOSE: Provide reusable helpers for chunk intensity thresholds and proportional weighting analytics.
 * SRP/DRY check: Pass - Module only handles numeric analytics for streaming chunks.
 */

import type { StreamChunkBase } from '@/hooks/useAdvancedStreaming';

export interface WeightedChunk<T extends StreamChunkBase> {
  chunk: T;
  weight: number;
  cumulativeWeight: number;
}

export const computeInflectionThreshold = <T extends StreamChunkBase>(chunks: T[]): number => {
  if (!chunks.length) {
    return Number.POSITIVE_INFINITY;
  }
  const intensities = chunks.map(chunk => chunk.intensity);
  const average = intensities.reduce((sum, value) => sum + value, 0) / intensities.length;
  const variance = intensities.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / intensities.length;
  const stdDeviation = Math.sqrt(variance);
  return average + stdDeviation * 1.25;
};

export const weightChunks = <T extends StreamChunkBase>(chunks: T[]): WeightedChunk<T>[] => {
  if (!chunks.length) {
    return [];
  }
  const totalChars = chunks.reduce((sum, chunk) => sum + Math.max(chunk.charCount, 1), 0);
  if (totalChars <= 0) {
    return chunks.map(chunk => ({ chunk, weight: 0, cumulativeWeight: 0 }));
  }

  let cumulative = 0;
  return chunks.map(chunk => {
    const weight = Math.max(chunk.charCount, 1) / totalChars;
    cumulative += weight;
    return {
      chunk,
      weight,
      cumulativeWeight: cumulative
    };
  });
};
