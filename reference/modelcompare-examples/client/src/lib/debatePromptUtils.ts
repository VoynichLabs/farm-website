/*
 * Author: gpt-5-codex
 * Date: 2025-10-19 02:25 UTC
 * PURPOSE: Provide reusable helpers that apply debate template tokens case-insensitively and format opponent quotes consistently across the client.
 * SRP/DRY check: Pass - Centralizes prompt token handling without duplicating business logic in hooks or services.
 */

import { replaceTemplatePlaceholders } from "@shared/template-tokens.ts";

export type DebateTemplateReplacements = Record<string, string>;

export function applyTemplateReplacements(template: string, replacements: DebateTemplateReplacements): string {
  return replaceTemplatePlaceholders(template, replacements);
}

export function formatOpponentQuote(opponentMessage: string | null | undefined): string {
  const trimmed = opponentMessage?.trim();
  if (!trimmed) {
    return "";
  }
  return `Opponent's latest statement:\n"""\n${trimmed}\n"""\n\n`;
}
