// * Author: gpt-5-codex
// * Date: 2025-10-17 18:40 UTC
// * PURPOSE: Augment export utilities to embed jury annotations and phase metadata in debate exports.
// * SRP/DRY check: Pass - Maintains focused export helpers without duplicating state management.
/**
 * Export Utilities - Generate downloadable files from model responses
 *
 * This module provides utilities for exporting model comparison results
 * to various formats including Markdown and plain text files.
 *
 * Author: gpt-5-codex
 * Date: October 17, 2025 at 19:10 UTC
 * PURPOSE: Export utilities that support debate turn history exports with jury annotations while preserving
 *          compatibility for comparison/battle exports.
 * SRP/DRY check: Pass - Centralized formatting logic for exports without duplicating mode-specific code elsewhere.
 */

import type { AIModel, ModelResponse } from "@/types/ai-models";
import type { DebatePhase, JuryAnnotationsMap } from "@/hooks/useDebateSession";

export interface ExportJuryAnnotation {
  verdict?: string;
  summary?: string;
  winnerModelId?: string;
  score?: number;
  confidence?: number;
}

export interface ExportTimelineEntry {
  model: AIModel;
  response: ModelResponse;
  turnNumber?: number;
  jury?: ExportJuryAnnotation;
  createdAt?: string | number | Date;
}

export interface ExportData {
  prompt: string;
  timestamp: Date;
  models: ExportTimelineEntry[];
  mode?: "comparison" | "battle" | "debate";
  jurySummary?: ExportJuryAnnotation | null;
}

function formatMetadataList(response: ModelResponse): string {
  const metadata: string[] = [];

  if (response.responseTime) {
    metadata.push(`- Response Time: ${(response.responseTime / 1000).toFixed(1)}s`);
  }

  if (response.tokenUsage) {
    const base = `${response.tokenUsage.input} → ${response.tokenUsage.output}`;
    const reasoning = response.tokenUsage.reasoning ? ` (+${response.tokenUsage.reasoning} reasoning)` : "";
    metadata.push(`- Tokens: ${base}${reasoning}`);
  }

  if (response.cost) {
    const base = `$${response.cost.total.toFixed(6)}`;
    const reasoning = response.cost.reasoning ? ` (+$${response.cost.reasoning.toFixed(6)} reasoning)` : "";
    metadata.push(`- Cost: ${base}${reasoning}`);
  }

  return metadata.length > 0 ? `${metadata.join("\n")}` : "";
}

function formatDebateMarkdown(data: ExportData): string {
  const header = `# Debate Session Export\n\n`;
  let markdown = header;

  markdown += `**Generated:** ${data.timestamp.toLocaleString()}\n\n`;
  markdown += `## Topic\n\n${data.prompt}\n\n`;

  if (data.jurySummary?.summary || data.jurySummary?.verdict) {
    markdown += `## Jury Summary\n\n`;
    if (data.jurySummary.verdict) {
      markdown += `- Verdict: ${data.jurySummary.verdict}\n`;
    }
    if (data.jurySummary.summary) {
      markdown += `- Summary: ${data.jurySummary.summary}\n`;
    }
    if (data.jurySummary.winnerModelId) {
      markdown += `- Winner: ${data.jurySummary.winnerModelId}\n`;
    }
    if (data.jurySummary.score !== undefined) {
      markdown += `- Score: ${data.jurySummary.score}\n`;
    }
    if (data.jurySummary.confidence !== undefined) {
      markdown += `- Confidence: ${(data.jurySummary.confidence * 100).toFixed(1)}%\n`;
    }
    markdown += `\n`;
  }

  markdown += `## Transcript\n\n`;

  const orderedEntries = [...data.models].sort((a, b) => {
    if (a.turnNumber === undefined || b.turnNumber === undefined) {
      return 0;
    }
    return a.turnNumber - b.turnNumber;
  });

  orderedEntries.forEach((item, index) => {
    const heading = item.turnNumber !== undefined
      ? `### Turn ${item.turnNumber} - ${item.model.name}`
      : `### Entry ${index + 1} - ${item.model.name}`;

    markdown += `${heading}\n\n`;

    if (item.response.status === "success") {
      markdown += `${item.response.content}\n\n`;

      const metadata = formatMetadataList(item.response);
      if (metadata) {
        markdown += `<details>\n<summary>Metadata</summary>\n\n${metadata}\n\n</details>\n\n`;
      }

      if (item.response.reasoning) {
        markdown += `<details>\n<summary>Reasoning</summary>\n\n\`\`\`\n${item.response.reasoning}\n\`\`\`\n\n</details>\n\n`;
      }
    } else if (item.response.status === "error") {
      markdown += `*Error: ${item.response.error || "An error occurred"}*\n\n`;
    } else {
      markdown += `*No response available*\n\n`;
    }

    if (item.jury?.summary || item.jury?.verdict) {
      markdown += `> Jury: ${item.jury.summary || item.jury.verdict}\n\n`;
    }

    markdown += `---\n\n`;
  });

  markdown += `*Generated with ModelCompare*\n`;
  return markdown;
}

export function generateMarkdownExport(data: ExportData): string {
  const isDebateMode = data.mode === "debate" || data.models.some(item => item.turnNumber !== undefined);

  if (isDebateMode) {
    return formatDebateMarkdown(data);
  }

  const modelIds = data.models.map(item => item.model.id);
  const uniqueModelIds = Array.from(new Set(modelIds));
  const isChatConversation = modelIds.length > uniqueModelIds.length;

  let markdown = isChatConversation
    ? `# AI Model Battle Chat Export\n\n`
    : `# Model Comparison Results\n\n`;

  markdown += `**Generated:** ${data.timestamp.toLocaleString()}\n\n`;
  markdown += `## Prompt\n\n${data.prompt}\n\n`;

  if (isChatConversation) {
    markdown += `## Conversation\n\n`;
    data.models.forEach((item, index) => {
      const { model, response } = item;
      const messageNumber = index + 1;

      markdown += `**Message ${messageNumber} - ${model.name}**\n\n`;

      if (response.status === "success") {
        markdown += `${response.content}\n\n`;

        const metadata = formatMetadataList(response);
        if (metadata) {
          markdown += `<details>\n<summary>Metadata</summary>\n\n${metadata}\n\n</details>\n\n`;
        }

        if (response.reasoning) {
          markdown += `<details>\n<summary>Reasoning</summary>\n\n\`\`\`\n${response.reasoning}\n\`\`\`\n\n</details>\n\n`;
        }
      } else if (response.status === "error") {
        markdown += `*Error: ${response.error || "An error occurred"}*\n\n`;
      } else {
        markdown += `*No response available*\n\n`;
      }

      markdown += `---\n\n`;
    });
  } else {
    markdown += `## Responses\n\n`;
    data.models.forEach((item, index) => {
      const { model, response } = item;

      markdown += `### ${index + 1}. ${model.name} (${model.provider})\n\n`;

      if (response.status === "success") {
        markdown += `${response.content}\n\n`;

        const metadata = formatMetadataList(response);
        if (metadata) {
          markdown += `**Metadata:**\n${metadata}\n\n`;
        }

        if (response.reasoning) {
          markdown += `**Reasoning:**\n\n\`\`\`\n${response.reasoning}\n\`\`\`\n\n`;
        }
      } else if (response.status === "error") {
        markdown += `*Error: ${response.error || "An error occurred"}*\n\n`;
      } else {
        markdown += `*No response available*\n\n`;
      }

      markdown += `---\n\n`;
    });
  }

  markdown += `*Generated with ModelCompare*\n`;

  return markdown;
}

function formatDebateText(data: ExportData): string {
  let text = `DEBATE SESSION EXPORT\n=====================\n\n`;
  text += `Generated: ${data.timestamp.toLocaleString()}\n\n`;
  text += `TOPIC:\n${data.prompt}\n\n`;

  if (data.jurySummary?.summary || data.jurySummary?.verdict) {
    text += `JURY SUMMARY:\n`;
    if (data.jurySummary.verdict) {
      text += `Verdict: ${data.jurySummary.verdict}\n`;
    }
    if (data.jurySummary.summary) {
      text += `Summary: ${data.jurySummary.summary}\n`;
    }
    if (data.jurySummary.winnerModelId) {
      text += `Winner: ${data.jurySummary.winnerModelId}\n`;
    }
    if (data.jurySummary.score !== undefined) {
      text += `Score: ${data.jurySummary.score}\n`;
    }
    if (data.jurySummary.confidence !== undefined) {
      text += `Confidence: ${(data.jurySummary.confidence * 100).toFixed(1)}%\n`;
    }
    text += `\n`;
  }

  text += `TRANSCRIPT:\n\n`;

  const orderedEntries = [...data.models].sort((a, b) => {
    if (a.turnNumber === undefined || b.turnNumber === undefined) {
      return 0;
    }
    return a.turnNumber - b.turnNumber;
  });

  orderedEntries.forEach((item, index) => {
    const heading = item.turnNumber !== undefined
      ? `TURN ${item.turnNumber} - ${item.model.name}`
      : `ENTRY ${index + 1} - ${item.model.name}`;

    text += `${heading}\n${"=".repeat(heading.length)}\n\n`;

    if (item.response.status === "success") {
      text += `${item.response.content}\n\n`;

      const metadata = formatMetadataList(item.response);
      if (metadata) {
        text += `METADATA:\n${metadata}\n\n`;
      }

      if (item.response.reasoning) {
        text += `REASONING:\n${item.response.reasoning}\n\n`;
      }
    } else if (item.response.status === "error") {
      text += `Error: ${item.response.error || "An error occurred"}\n\n`;
    } else {
      text += `No response available\n\n`;
    }

    if (item.jury?.summary || item.jury?.verdict) {
      text += `JURY: ${item.jury.summary || item.jury.verdict}\n\n`;
    }

    text += `${"-".repeat(50)}\n\n`;
  });

  text += `Generated with ModelCompare\n`;
  return text;
}

export function generateTextExport(data: ExportData): string {
  const isDebateMode = data.mode === "debate" || data.models.some(item => item.turnNumber !== undefined);

  if (isDebateMode) {
    return formatDebateText(data);
  }

  const modelIds = data.models.map(item => item.model.id);
  const uniqueModelIds = Array.from(new Set(modelIds));
  const isChatConversation = modelIds.length > uniqueModelIds.length;

  let text = isChatConversation
    ? `AI MODEL BATTLE CHAT EXPORT\n============================\n\n`
    : `MODEL COMPARISON RESULTS\n========================\n\n`;

  text += `Generated: ${data.timestamp.toLocaleString()}\n\n`;
  text += `PROMPT:\n${data.prompt}\n\n`;

  if (isChatConversation) {
    text += `CONVERSATION:\n\n`;
    data.models.forEach((item, index) => {
      const { model, response } = item;
      const messageNumber = index + 1;

      text += `MESSAGE ${messageNumber} - ${model.name}\n`;
      text += `${"=".repeat(50)}\n\n`;

      if (response.status === "success") {
        text += `${response.content}\n\n`;

        const metadata = formatMetadataList(response);
        if (metadata) {
          text += `METADATA:\n${metadata}\n\n`;
        }

        if (response.reasoning) {
          text += `REASONING:\n${response.reasoning}\n\n`;
        }
      } else if (response.status === "error") {
        text += `Error: ${response.error || "An error occurred"}\n\n`;
      } else {
        text += `No response available\n\n`;
      }

      text += `${"-".repeat(50)}\n\n`;
    });
  } else {
    text += `RESPONSES:\n\n`;
    data.models.forEach((item, index) => {
      const { model, response } = item;

      text += `${index + 1}. ${model.name} (${model.provider})\n`;
      text += `${"=".repeat(50)}\n\n`;

      if (response.status === "success") {
        text += `${response.content}\n\n`;

        const metadata = formatMetadataList(response);
        if (metadata) {
          text += `METADATA:\n${metadata}\n\n`;
        }

        if (response.reasoning) {
          text += `REASONING:\n${response.reasoning}\n\n`;
        }
      } else if (response.status === "error") {
        text += `Error: ${response.error || "An error occurred"}\n\n`;
      } else {
        text += `No response available\n\n`;
      }

      text += `${"-".repeat(50)}\n\n`;
    });
  }

  text += `Generated with ModelCompare\n`;

  return text;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function generateSafeFilename(base: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sanitizedBase = base
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${sanitizedBase || "modelcompare"}-${timestamp}.${extension}`;
}

export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}
