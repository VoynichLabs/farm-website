/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-01-29
 * PURPOSE: Centralized formatting utilities for cost, tokens, and response time display.
 *          Provides consistent formatting across all components with proper fallbacks for missing data.
 *          Eliminates duplicate formatCost implementations in debate.tsx and other pages.
 * SRP/DRY check: Pass - Single responsibility (formatting), eliminates duplicate formatters
 * shadcn/ui: Pass - Pure utility functions, no UI components
 */

export interface TokenUsage {
  input: number;
  output: number;
  reasoning?: number;
}

export interface Cost {
  input: number;
  output: number;
  reasoning?: number;
  total: number;
}

/**
 * Format cost value with consistent precision and fallbacks
 * @param cost - Cost value or undefined
 * @returns Formatted cost string or fallback
 */
export function formatCost(cost?: number): string {
  if (cost === undefined || cost === null || isNaN(cost)) {
    return '—';
  }
  if (cost === 0) {
    return '$0.0000';
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token usage with input/output display and optional reasoning
 * @param usage - Token usage object or undefined
 * @returns Formatted token string or fallback
 */
export function formatTokens(usage?: TokenUsage): string {
  if (!usage || usage.input === undefined || usage.output === undefined) {
    return '—';
  }
  
  const baseTokens = `${usage.input}→${usage.output}`;
  
  if (usage.reasoning && usage.reasoning > 0) {
    return `${baseTokens} +${usage.reasoning}`;
  }
  
  return baseTokens;
}

/**
 * Format response time in seconds with appropriate precision
 * @param ms - Response time in milliseconds or undefined
 * @returns Formatted time string or fallback
 */
export function formatResponseTime(ms?: number): string {
  if (ms === undefined || ms === null || isNaN(ms) || ms <= 0) {
    return '—';
  }
  
  const seconds = ms / 1000;
  
  if (seconds < 1) {
    return '<1s';
  }
  
  return `${seconds.toFixed(1)}s`;
}

/**
 * Format cost breakdown with input/output/reasoning components
 * @param cost - Cost object with breakdown
 * @returns Object with formatted cost components
 */
export function formatCostBreakdown(cost?: Cost): {
  input: string;
  output: string;
  reasoning?: string;
  total: string;
} {
  if (!cost) {
    return {
      input: '—',
      output: '—',
      total: '—'
    };
  }
  
  const result = {
    input: formatCost(cost.input),
    output: formatCost(cost.output),
    total: formatCost(cost.total)
  };
  
  if (cost.reasoning && cost.reasoning > 0) {
    return {
      ...result,
      reasoning: formatCost(cost.reasoning)
    };
  }
  
  return result;
}
