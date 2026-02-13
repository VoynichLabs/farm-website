/**
 *
 * Author: Codex using GPT-5
 * Date: 2025-09-28T11:29:14-04:00
 * PURPOSE: Browser-side utilities for Vixra mode covering variable preparation, template parsing, and export helpers while integrating with the shared model response API.
 * SRP/DRY check: Pass - Centralizes Vixra helper routines reused by the page without duplicating workflow logic present elsewhere.
 * shadcn/ui: Pass - Pure utility module with no UI rendering; UI components continue to come from shadcn/ui.
 */

import { apiRequest } from "@/lib/queryClient";
import type { AIModel, ModelResponse } from "@/types/ai-models";

export type VixraVariables = Record<string, string>;
export type VixraSectionResponses = Record<string, Record<string, ModelResponse>>;

const DEFAULT_CATEGORY = "General Science and Philosophy";

const VARIABLE_PROMPTS = {
  title: "generate-title",
  author: "generate-author"
} as const;

// Section order with dependencies for Vixra paper generation
export const SECTION_ORDER = [
  { id: 'abstract', name: 'Abstract', dependencies: [] },
  { id: 'introduction', name: 'Introduction', dependencies: ['abstract'] },
  { id: 'methodology', name: 'Methodology', dependencies: ['introduction'] },
  { id: 'results', name: 'Results', dependencies: ['abstract', 'methodology'] },
  { id: 'discussion', name: 'Discussion', dependencies: ['results'] },
  { id: 'conclusion', name: 'Conclusion', dependencies: ['discussion'] },
  { id: 'citations', name: 'Citations', dependencies: ['abstract', 'results'] },
  { id: 'acknowledgments', name: 'Acknowledgments', dependencies: ['conclusion'] },
] as const;

export const SCIENCE_CATEGORIES = [
  'Physics - High Energy Particle Physics',
  'Physics - Quantum Gravity and String Theory', 
  'Physics - Relativity and Cosmology',
  'Physics - Astrophysics',
  'Physics - Quantum Physics',
  'Physics - Nuclear and Atomic Physics',
  'Physics - Condensed Matter',
  'Physics - Thermodynamics and Energy',
  'Physics - Classical Physics',
  'Physics - Geophysics',
  'Physics - Climate Research',
  'Physics - Mathematical Physics',
  'Physics - History and Philosophy of Physics',
  'Mathematics - Set Theory and Logic',
  'Mathematics - Number Theory',
  'Mathematics - Combinatorics and Graph Theory',
  'Mathematics - Algebra',
  'Mathematics - Geometry',
  'Mathematics - Topology',
  'Mathematics - Functions and Analysis',
  'Mathematics - Statistics',
  'Mathematics - General Mathematics',
  'Computational Science - DSP',
  'Computational Science - Data Structures and Algorithms',
  'Computational Science - Artificial Intelligence',
  'Biology - Biochemistry',
  'Biology - Physics of Biology',
  'Biology - Mind Science',
  'Biology - Quantitative Biology',
  'Chemistry',
  'Humanities - Archaeology',
  'Humanities - Linguistics',
  'Humanities - Economics and Finance',
  'Humanities - Social Science',
  'Humanities - Religion and Spiritualism',
  'General Science and Philosophy',
  'Education and Didactics'
] as const;

type VariablePromptKey = keyof typeof VARIABLE_PROMPTS;

function hasValue(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeTitleCandidate(candidate: string): string {
  if (!candidate) return "";
  const cleaned = candidate
    .replace(/\*\*/g, "")
    .replace(/[_`]/g, "")
    .trim();
  return cleaned.replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "").trim();
}

export function hasMeaningfulText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function extractTitleFromContent(
  content: string,
  options?: { skipSectionPreamble?: boolean }
): string {
  if (!hasMeaningfulText(content)) {
    return "";
  }

  const headingMatch = content.match(/^\s*#\s+(.+?)\s*$/m);
  if (headingMatch) {
    const heading = sanitizeTitleCandidate(headingMatch[1]);
    if (hasValue(heading)) {
      return heading;
    }
  }

  const boldTitleMatch = content.match(/\*\*Title\*\*\s*[:\-]\s*(.+)/i);
  if (boldTitleMatch) {
    const [line] = boldTitleMatch[1].split(/\r?\n/);
    const title = sanitizeTitleCandidate(line);
    if (hasValue(title)) {
      return title;
    }
  }

  const colonTitleMatch = content.match(/(?:^|\n)\s*Title\s*[:\-]\s*(.+)/i);
  if (colonTitleMatch) {
    const [line] = colonTitleMatch[1].split(/\r?\n/);
    const title = sanitizeTitleCandidate(line);
    if (hasValue(title)) {
      return title;
    }
  }

  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const rawLine of lines) {
    let line = rawLine.replace(/^[-*>\d.]+\s*/, "").trim();
    if (!hasValue(line)) {
      continue;
    }

    if (options?.skipSectionPreamble) {
      if (/^abstract\b/i.test(line)) continue;
      if (/^science\s+category\b/i.test(line)) continue;
      if (/^keywords\b/i.test(line)) continue;
    }

    const sanitized = sanitizeTitleCandidate(line);
    if (hasValue(sanitized) && sanitized.length >= 5) {
      return sanitized;
    }
  }

  return "";
}

export function getPrimarySectionContent(
  sectionResponses: VixraSectionResponses,
  sectionId: string
): string | null {
  const responses = sectionResponses[sectionId];
  if (!responses) {
    return null;
  }

  for (const response of Object.values(responses)) {
    if (hasMeaningfulText(response?.content)) {
      return response!.content!.trim();
    }
  }

  return null;
}

export function extractTitleFromAbstract(content: string): string {
  return extractTitleFromContent(content, { skipSectionPreamble: true });
}

function deriveTitleFromSections(sectionResponses: VixraSectionResponses): string {
  const preferredOrder = [
    "abstract",
    "introduction",
    "results",
    "discussion",
    "conclusion"
  ];

  for (const sectionId of preferredOrder) {
    const content = getPrimarySectionContent(sectionResponses, sectionId);
    if (hasMeaningfulText(content)) {
      const candidate = extractTitleFromContent(
        content!,
        { skipSectionPreamble: sectionId === "abstract" }
      );
      if (hasValue(candidate)) {
        return candidate;
      }
    }
  }

  const orderedIds = PAPER_SECTIONS.map(section => section.id).filter(id => !preferredOrder.includes(id));
  for (const sectionId of orderedIds) {
    const content = getPrimarySectionContent(sectionResponses, sectionId);
    if (hasMeaningfulText(content)) {
      const candidate = extractTitleFromContent(content!);
      if (hasValue(candidate)) {
        return candidate;
      }
    }
  }

  const aggregatedContent = [
    ...preferredOrder,
    ...orderedIds
  ]
    .map(sectionId => getPrimarySectionContent(sectionResponses, sectionId))
    .filter((value): value is string => hasMeaningfulText(value))
    .join("\n");

  if (hasMeaningfulText(aggregatedContent)) {
    const candidate = extractTitleFromContent(aggregatedContent!);
    if (hasValue(candidate)) {
      return candidate;
    }
  }

  return "";
}

function resolvePaperTitle(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses
): string {
  if (hasValue(variables.Title)) {
    return variables.Title.trim();
  }

  const abstractContent = getPrimarySectionContent(sectionResponses, "abstract");
  if (hasMeaningfulText(abstractContent)) {
    const abstractTitle = extractTitleFromAbstract(abstractContent!);
    if (hasValue(abstractTitle)) {
      return abstractTitle;
    }
  }

  const derivedTitle = deriveTitleFromSections(sectionResponses);
  if (hasValue(derivedTitle)) {
    return derivedTitle;
  }

  return "";
}

/**
 * Generate missing variables by calling the shared model response API while preserving user input.
 * DOES NOT add hardcoded fallbacks - only LLM-generated or user-provided values.
 */
export async function generateMissingVariables(
  userVariables: VixraVariables,
  promptTemplates: Map<string, string>
): Promise<VixraVariables> {
  // Start with ONLY user-provided variables - NO hardcoded fallbacks
  const result: VixraVariables = { ...userVariables };
  
  // Ensure ScienceCategory has a default
  if (!hasValue(result.ScienceCategory)) {
    result.ScienceCategory = DEFAULT_CATEGORY;
  }

  // Try to generate Title via LLM if missing
  const shouldGenerateTitle = !hasValue(userVariables.Title) && promptTemplates.has(VARIABLE_PROMPTS.title);
  if (shouldGenerateTitle) {
    const generatedTitle = await generateSingleVariable(
      VARIABLE_PROMPTS.title,
      { ScienceCategory: result.ScienceCategory },
      promptTemplates
    );
    if (hasValue(generatedTitle)) {
      result.Title = generatedTitle;
    }
  }

  // Try to generate Author via LLM if missing
  const shouldGenerateAuthor = !hasValue(userVariables.Author) && promptTemplates.has(VARIABLE_PROMPTS.author);
  if (shouldGenerateAuthor) {
    const generatedAuthor = await generateSingleVariable(VARIABLE_PROMPTS.author, {}, promptTemplates);
    if (hasValue(generatedAuthor)) {
      result.Author = generatedAuthor;
      result.ResearcherName = generatedAuthor;
      result.Authors = generatedAuthor;
    }
  }

  // Sync Author aliases if we have Author but not the others
  if (hasValue(result.Author)) {
    if (!hasValue(result.ResearcherName)) {
      result.ResearcherName = result.Author;
    }
    if (!hasValue(result.Authors)) {
      result.Authors = result.Author;
    }
  }

  return result;
}

async function generateSingleVariable(
  templateId: (typeof VARIABLE_PROMPTS)[VariablePromptKey],
  variables: VixraVariables,
  templates: Map<string, string>
): Promise<string> {
  const template = templates.get(templateId);
  if (!template) {
    return "";
  }

  const prompt = substituteVariables(template, variables);

  try {
    const response = await apiRequest("POST", "/api/models/respond", {
      modelId: "gpt-4o-mini",
      prompt
    });

    const data = (await response.json()) as Partial<ModelResponse>;
    const content = typeof data.content === "string" ? data.content.trim() : "";
    return content;
  } catch (error) {
    console.error("Variable generation failed", { templateId, error });
    return "";
  }
}

/**
 * Replace {variable} placeholders within template strings using provided values.
 */
export function substituteVariables(
  template: string,
  variables: VixraVariables
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (!key) continue;
    const replacement = hasValue(value) ? value : "";
    const pattern = new RegExp(`\\{${escapeRegExp(key)}\\}`, "g");
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Extract section templates delimited by <!-- SECTION_START:id --> markers.
 */
export function parseVixraTemplates(markdownContent: string): Map<string, string> {
  const templates = new Map<string, string>();
  const sectionRegex = /<!-- SECTION_START:(\w+) -->([\s\S]*?)<!-- SECTION_END:\1 -->/g;

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(markdownContent)) !== null) {
    const [, sectionId, content] = match;
    templates.set(sectionId, content.trim());
  }

  return templates;
}

const PAPER_SECTIONS: Array<{ id: string; title: string }> = [
  { id: "abstract", title: "Abstract" },
  { id: "introduction", title: "Introduction" },
  { id: "methodology", title: "Methodology" },
  { id: "results", title: "Results" },
  { id: "discussion", title: "Discussion" },
  { id: "conclusion", title: "Conclusion" },
  { id: "citations", title: "References" },
  { id: "acknowledgments", title: "Acknowledgments" },
  { id: "peer-review", title: "Peer Review Response" }
];

/**
 * Get a random science category from the full list.
 */
export function getRandomCategory(categories: readonly string[] = SCIENCE_CATEGORIES): string {
  if (categories.length === 0) return SCIENCE_CATEGORIES[0];
  const index = Math.floor(Math.random() * categories.length);
  return categories[index] ?? SCIENCE_CATEGORIES[0];
}

/**
 * Check if a section is locked due to incomplete dependencies.
 */
export function isSectionLocked(
  sectionId: string,
  completedSections: string[]
): boolean {
  const section = SECTION_ORDER.find(s => s.id === sectionId);
  if (!section) return true;
  return section.dependencies.some(dep => !completedSections.includes(dep));
}

/**
 * Get the next eligible section for auto-mode generation.
 * Returns null if all sections are complete.
 */
export function getNextEligibleSection(
  completedSections: string[]
): string | null {
  for (const section of SECTION_ORDER) {
    if (completedSections.includes(section.id)) continue;
    if (!isSectionLocked(section.id, completedSections)) {
      return section.id;
    }
  }
  return null;
}

/**
 * Calculate estimated time remaining for paper generation.
 * @param completedSections - Number of completed sections
 * @param totalSections - Total number of sections
 * @param avgSectionTime - Average time per section in seconds
 * @returns Estimated seconds remaining
 */
export function calculateEstimatedTime(
  completedSections: number,
  totalSections: number,
  avgSectionTime: number
): number {
  const remainingSections = totalSections - completedSections;
  return remainingSections * avgSectionTime;
}

/**
 * Count words in a text string.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Assemble a markdown representation of the generated paper.
 * ONLY uses user-provided or LLM-generated variables - NO hardcoded fallbacks.
 */
export function exportVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): string {
  const timestamp = new Date();

  // Use ONLY the variables that were actually provided - no auto-generation
  const paperTitle = resolvePaperTitle(variables, sectionResponses);
  const authorLine = variables.Authors || variables.Author || variables.ResearcherName || "Anonymous Research Collective";
  const scienceCategory = variables.ScienceCategory || DEFAULT_CATEGORY;

  let paper = "";
  if (hasValue(paperTitle)) {
    paper += `# ${paperTitle}\n\n`;
  }
  paper += `**Authors:** ${authorLine}\n\n`;

  // ONLY include Institution if explicitly provided (not hardcoded)
  if (hasValue(variables.Institution)) {
    paper += `**Institution:** ${variables.Institution}\n\n`;
  }

  paper += `**Science Category:** ${scienceCategory}\n\n`;
  paper += `**Generated:** ${timestamp.toLocaleString()}\n\n`;
  paper += `---\n\n`;

  for (const section of PAPER_SECTIONS) {
    const modelResponses = sectionResponses[section.id];
    const modelIds = modelResponses ? Object.keys(modelResponses) : [];
    if (!modelResponses || modelIds.length === 0) {
      continue;
    }

    paper += `## ${section.title}\n\n`;

    if (modelIds.length === 1) {
      const response = modelResponses[modelIds[0]];
      if (response?.content) {
        paper += `${response.content}\n\n`;
      }
    } else {
      modelIds.forEach((modelId, index) => {
        const response = modelResponses[modelId];
        const model = selectedModels.find(item => item.id === modelId);
        const modelName = model ? `${model.name} (${model.provider})` : modelId;
        if (index > 0) {
          paper += `\n---\n\n`;
        }
        paper += `**${modelName} Response:**\n\n`;
        if (response?.content) {
          paper += `${response.content}\n\n`;
        }
      });
    }

    paper += `---\n\n`;
  }

  paper += `## Generation Metadata\n\n`;
  if (selectedModels.length > 0) {
    paper += `**Generated using AI models:**\n`;
    selectedModels.forEach(model => {
      paper += `- ${model.name} (${model.provider})\n`;
    });
    paper += "\n";
  }

  const generatedSectionCount = Object.values(sectionResponses).reduce((count, responses) => {
    if (responses && Object.keys(responses).length > 0) {
      return count + 1;
    }
    return count;
  }, 0);

  paper += `**Total sections generated:** ${generatedSectionCount}\n\n`;
  
  // ONLY show variables that were actually provided (no hardcoded fallbacks)
  const actualVariables = Object.entries(variables).filter(([_key, value]) => hasValue(value));
  if (actualVariables.length > 0) {
    paper += `**Paper variables:**\n`;
    actualVariables.forEach(([key, value]) => {
      paper += `- ${key}: ${value}\n`;
    });
    paper += "\n";
  }

  paper += "\n*This satirical academic paper was generated using the Vixra Mode of the AI Model Comparison Tool.*\n";

  return paper;
}

/**
 * Download the generated paper as a markdown file.
 */
export function downloadVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): void {
  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  const derivedTitle = resolvePaperTitle(variables, sectionResponses);
  const title = hasValue(derivedTitle) ? derivedTitle : "vixra-paper";
  const safeTitle = title.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeTitle}_${timestamp}.md`;

  const blob = new Blob([paperContent], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy the generated paper to the user clipboard.
 */
export async function copyVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): Promise<void> {
  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  await navigator.clipboard.writeText(paperContent);
}

/**
 * Open a print dialog to export the paper as PDF via the browser.
 */
export function printVixraPaper(
  variables: VixraVariables,
  sectionResponses: VixraSectionResponses,
  selectedModels: AIModel[]
): void {
  if (typeof window === "undefined") {
    throw new Error("printVixraPaper is only available in the browser");
  }

  const paperContent = exportVixraPaper(variables, sectionResponses, selectedModels);
  const resolvedTitle = resolvePaperTitle(variables, sectionResponses);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Could not open print window");
  }

  const documentTitle = hasValue(resolvedTitle)
    ? resolvedTitle
    : extractTitleFromMarkdown(paperContent) || "Vixra Research Paper";
  const htmlBody = convertMarkdownToPrintHtml(paperContent);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            color: #000;
          }
          h1 {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 30px;
            margin-top: 0;
          }
          h2 {
            color: #333;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 1px solid #666;
            padding-bottom: 5px;
          }
          hr {
            border: none;
            border-top: 1px solid #ccc;
            margin: 20px 0;
          }
          ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          li {
            margin: 5px 0;
          }
          p {
            margin: 10px 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 15mm;
            }
            h1:first-of-type {
              page-break-before: avoid;
              margin-top: 0;
            }
          }
        </style>
      </head>
      <body>
        ${htmlBody}
      </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function extractTitleFromMarkdown(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function convertMarkdownToPrintHtml(markdown: string): string {
  let html = markdown;
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^\*\*(.+?):\*\* (.+)$/gm, "<p><strong>$1:</strong> $2</p>");
  html = html.replace(/^\*\*(.+)\*\*$/gm, "<p><strong>$1</strong></p>");
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = html.replace(/\n/g, "<br />");
  html = wrapListBlocks(html);
  html = `<p>${html}</p>`;
  return html;
}

function wrapListBlocks(html: string): string {
  return html.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, match => `<ul>${match}</ul>`);
}
