/**
 * Prompt Parser Utility
 *
 * Parses the compare-prompts.md file to extract prompt categories and templates
 * dynamically, making the prompt system truly modular and extensible.
 *
 * Author: Cascade Claude 4 Sonnet Thinking
 * Date: August 11, 2025
 */

import {
  extractDebateInstructions,
  type DebateFlowTemplates,
  type DebateInstructions,
  type DebateTopic,
} from '@shared/debate-instructions.ts';

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface PromptCategory {
  id: string;
  name: string;
  prompts: PromptTemplate[];
}

/**
 * Debate prompt structures parsed from docs/debate-prompts.md
 */
export type { DebateTopic, DebateInstructions, DebateFlowTemplates };

/**
 * Parses markdown content to extract prompt categories and templates
 */
export async function parsePromptsFromMarkdown(): Promise<PromptCategory[]> {
  try {
    // Fetch the markdown file
    const response = await fetch('/docs/compare-prompts.md');
    if (!response.ok) {
      throw new Error('Failed to fetch compare-prompts.md');
    }
    const markdown = await response.text();
    
    const categories: PromptCategory[] = [];
    const lines = markdown.split('\n');
    
    let currentCategory: PromptCategory | null = null;
    let currentPrompt: PromptTemplate | null = null;
    let collectingContent = false;
    let contentLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Category header (## Category Name)
      if (line.startsWith('## ') && !line.includes('Author') && !line.includes('Date')) {
        // Save previous prompt if exists
        if (currentPrompt && currentCategory) {
          currentPrompt.content = contentLines.join('\n').trim();
          currentCategory.prompts.push(currentPrompt);
        }
        
        // Save previous category if exists
        if (currentCategory) {
          categories.push(currentCategory);
        }
        
        // Start new category
        const categoryName = line.substring(3).trim();
        currentCategory = {
          id: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: categoryName,
          prompts: []
        };
        currentPrompt = null;
        collectingContent = false;
        contentLines = [];
      }
      // Prompt header (### Prompt Name)
      else if (line.startsWith('### ') && currentCategory) {
        // Save previous prompt if exists
        if (currentPrompt) {
          currentPrompt.content = contentLines.join('\n').trim();
          currentCategory.prompts.push(currentPrompt);
        }
        
        // Start new prompt
        const promptName = line.substring(4).trim();
        currentPrompt = {
          id: promptName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: promptName,
          content: ''
        };
        collectingContent = true;
        contentLines = [];
      }
      // Content lines
      else if (collectingContent && currentPrompt && line !== '') {
        contentLines.push(line);
      }
      // Empty line - continue collecting if we're in content mode
      else if (collectingContent && line === '') {
        contentLines.push('');
      }
    }
    
    // Save final prompt and category
    if (currentPrompt && currentCategory) {
      currentPrompt.content = contentLines.join('\n').trim();
      currentCategory.prompts.push(currentPrompt);
    }
    if (currentCategory) {
      categories.push(currentCategory);
    }
    
    return categories;
  } catch (error) {
    console.error('Error parsing prompts from markdown:', error);
    return [];
  }
}

/**
 * Parses a markdown file at a given public docs path using the standardized parser.
 * Example path: '/docs/vixra-prompts.md'
 */
export async function parsePromptsFromMarkdownFile(path: string): Promise<PromptCategory[]> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}`);
    }
    const markdown = await response.text();
    return await parsePromptsFromStandardMarkdown(markdown);
  } catch (error) {
    console.error('Error parsing prompts from markdown file:', error);
    return [];
  }
}

/**
 * Battle-specific prompt interfaces for PersonX and Challenger prompts
 */
export interface BattlePromptPair {
  id: string;
  name: string;
  personX: string;
  challenger: string;
}

export interface BattlePromptCategory {
  id: string;
  name: string;
  prompts: BattlePromptPair[];
}

/**
 * Parses battle-prompts.md to extract PersonX/Challenger prompt pairs
 * Now uses standardized format matching compare-prompts.md structure
 */
export async function parseBattlePromptsFromMarkdown(): Promise<BattlePromptCategory[]> {
  try {
    // Fetch the battle prompts markdown file
    const response = await fetch('/docs/battle-prompts.md');
    if (!response.ok) {
      throw new Error('Failed to fetch battle-prompts.md');
    }
    const markdown = await response.text();
    
    // Use the existing parser to get all prompts
    const standardCategories = await parsePromptsFromStandardMarkdown(markdown);
    
    // Convert to battle prompt pairs
    const battleCategories: BattlePromptCategory[] = [];
    
    for (const category of standardCategories) {
      const battleCategory: BattlePromptCategory = {
        id: category.id,
        name: category.name,
        prompts: []
      };
      
      // Group prompts into PersonX/Challenger pairs
      const promptMap = new Map<string, { personX?: string; challenger?: string }>();
      
      for (const prompt of category.prompts) {
        const baseName = prompt.name.replace(/\s+(PersonX|Challenger)$/i, '');
        const baseId = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        if (!promptMap.has(baseId)) {
          promptMap.set(baseId, {});
        }
        
        const pair = promptMap.get(baseId)!;
        
        if (prompt.name.toLowerCase().includes('personx')) {
          pair.personX = prompt.content;
        } else if (prompt.name.toLowerCase().includes('challenger')) {
          pair.challenger = prompt.content;
        } else {
          // If no PersonX/Challenger suffix, treat as PersonX
          pair.personX = prompt.content;
        }
        
        // If we have both PersonX and Challenger, create the pair
        if (pair.personX && pair.challenger) {
          const battlePrompt: BattlePromptPair = {
            id: baseId,
            name: baseName,
            personX: pair.personX,
            challenger: pair.challenger
          };
          battleCategory.prompts.push(battlePrompt);
          promptMap.delete(baseId); // Remove completed pair
        }
      }
      
      // Handle any remaining PersonX prompts without challengers
      for (const [baseId, pair] of Array.from(promptMap)) {
        if (pair.personX) {
          const baseName = baseId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          const battlePrompt: BattlePromptPair = {
            id: baseId,
            name: baseName,
            personX: pair.personX,
            challenger: 'You are a LLM trying to help the user weigh the advice of PersonX. Original user prompt was: "{originalPrompt}". Assume that PersonX is dangerously overconfident and incorrect or missing key points. PersonX told the user this: "{response}". Push back on this information or advice. Explain why the user shouldn\'t trust the reply or should be wary. Be critical but constructive in your analysis.'
          };
          battleCategory.prompts.push(battlePrompt);
        }
      }
      
      if (battleCategory.prompts.length > 0) {
        battleCategories.push(battleCategory);
      }
    }
    
    return battleCategories;
  } catch (error) {
    console.error('Error parsing battle prompts from markdown:', error);
    return [];
  }
}

/**
 * Helper function to parse standardized markdown format
 */
async function parsePromptsFromStandardMarkdown(markdown: string): Promise<PromptCategory[]> {
  const categories: PromptCategory[] = [];
  const lines = markdown.split('\n');
  
  let currentCategory: PromptCategory | null = null;
  let currentPrompt: PromptTemplate | null = null;
  let collectingContent = false;
  let contentLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Category header (## Category Name)
    if (line.startsWith('## ') && !line.includes('Author') && !line.includes('Date')) {
      // Save previous prompt if exists
      if (currentPrompt && currentCategory) {
        currentPrompt.content = contentLines.join('\n').trim();
        currentCategory.prompts.push(currentPrompt);
      }
      
      // Save previous category if exists
      if (currentCategory) {
        categories.push(currentCategory);
      }
      
      // Start new category
      const categoryName = line.substring(3).trim();
      currentCategory = {
        id: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: categoryName,
        prompts: []
      };
      currentPrompt = null;
      collectingContent = false;
      contentLines = [];
    }
    // Prompt header (### Prompt Name)
    else if (line.startsWith('### ') && currentCategory) {
      // Save previous prompt if exists
      if (currentPrompt) {
        currentPrompt.content = contentLines.join('\n').trim();
        currentCategory.prompts.push(currentPrompt);
      }
      
      // Start new prompt
      const promptName = line.substring(4).trim();
      currentPrompt = {
        id: promptName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: promptName,
        content: ''
      };
      collectingContent = true;
      contentLines = [];
    }
    // Content lines
    else if (collectingContent && currentPrompt && line !== '') {
      contentLines.push(line);
    }
    // Empty line - continue collecting if we're in content mode
    else if (collectingContent && line === '') {
      contentLines.push('');
    }
  }
  
  // Save final prompt and category
  if (currentPrompt && currentCategory) {
    currentPrompt.content = contentLines.join('\n').trim();
    currentCategory.prompts.push(currentPrompt);
  }
  if (currentCategory) {
    categories.push(currentCategory);
  }
  
  return categories;
}

/**
 * Parses debate-prompts.md to extract:
 * - Base debate instructions template
 * - Intensity level guidance (1..4)
 * - Structured topic list with propositions
 * - Flow templates (opening, rebuttal, closing)
 */
export async function parseDebatePromptsFromMarkdown(): Promise<DebateInstructions | null> {
  try {
    const response = await fetch('/docs/debate-prompts.md');
    if (!response.ok) throw new Error('Failed to fetch debate-prompts.md');
    const markdown = await response.text();
    return extractDebateInstructions(markdown);
  } catch (err) {
    console.error('Error parsing debate prompts from markdown:', err);
    return null;
  }
}

/**
 * Get a specific prompt template by category and prompt ID
 */
export function findPromptTemplate(
  categories: PromptCategory[], 
  categoryId: string, 
  promptId: string
): PromptTemplate | null {
  const category = categories.find(cat => cat.id === categoryId);
  if (!category) return null;
  
  return category.prompts.find(prompt => prompt.id === promptId) || null;
}

/**
 * Find a specific battle prompt pair by category and prompt ID
 */
export function findBattlePromptPair(
  categories: BattlePromptCategory[],
  categoryId: string,
  promptId: string
): BattlePromptPair | null {
  const category = categories.find(cat => cat.id === categoryId);
  if (!category) return null;
  
  return category.prompts.find(prompt => prompt.id === promptId) || null;
}

/**
 * Parses creative-combat-prompts.md to extract Original/Enhancement prompt pairs
 * for the Creative Combat mode using the standard markdown format
 */
export async function parseCreativePromptsFromMarkdown(): Promise<PromptCategory[]> {
  try {
    // Fetch the creative combat prompts markdown file
    const response = await fetch('/docs/creative-combat-prompts.md');
    if (!response.ok) {
      throw new Error('Failed to fetch creative-combat-prompts.md');
    }
    const markdown = await response.text();
    
    // Use the existing standardized parser
    return await parsePromptsFromStandardMarkdown(markdown);
  } catch (error) {
    console.error('Error parsing creative prompts from markdown:', error);
    return [];
  }
}
