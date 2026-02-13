/**
 * Vixra Assembly Line Workflow Engine
 * 
 * Implements the sequential paper generation workflow where each section
 * depends on previous sections and proper variable passing occurs.
 * NEEDS AUDIT!
 * Author: Claude Code
 * Date: 2025-08-18
 */

import { VariableEngine } from "../../../shared/variable-engine";
import type { UnifiedMessage, GenerateRequest, GenerateResponse, ModelSeat } from "../../../shared/api-types";

export interface SectionTemplate {
  id: string;
  name: string;
  content: string;
  dependencies: string[];
  required: boolean;
}

export interface SectionOutput {
  sectionId: string;
  content: string;
  modelId: string;
  timestamp: number;
  tokenUsage?: { input: number; output: number; reasoning?: number };
  cost?: { total: number; input: number; output: number; reasoning?: number };
}

export interface WorkflowState {
  sectionOutputs: Map<string, SectionOutput>;
  userVariables: Record<string, string>;
  dependencyMap: Map<string, string[]>;
  enabledSections: Set<string>;
  processingSection: string | null;
  currentStep: number;
  totalSteps: number;
}

export interface WorkflowSession {
  sessionId: string;
  templateVersion: string;
  templates: Map<string, SectionTemplate>;
  state: WorkflowState;
  selectedModels: string[];
}

// Define the assembly line order and dependencies based on the plan
const SECTION_DEPENDENCIES: Record<string, string[]> = {
  abstract: [], // No dependencies - uses only user variables
  introduction: ['abstract'], // Depends on abstract
  methodology: ['introduction'], // Depends on introduction
  results: ['abstract', 'methodology'], // Depends on abstract and methodology
  discussion: ['results'], // Depends on results
  conclusion: ['discussion'], // Depends on discussion
  citations: ['abstract', 'results'], // Optional - depends on abstract and results
  acknowledgments: ['conclusion'], // Optional - depends on conclusion
  'peer-review': ['conclusion'] // Optional - depends on all previous (via conclusion)
};

const REQUIRED_SECTIONS = new Set(['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion']);

/**
 * Parse section templates from markdown content with section markers
 */
export function parseVixraTemplates(markdownContent: string): Map<string, SectionTemplate> {
  const sectionRegex = /<!-- SECTION_START:(\w+) -->(.*?)<!-- SECTION_END:\1 -->/g;
  const templates = new Map<string, SectionTemplate>();
  
  let match;
  while ((match = sectionRegex.exec(markdownContent)) !== null) {
    const [, sectionId, content] = match;
    
    // Extract the section name from the content (first ### line)
    const nameMatch = content.match(/###\s+(.+)/);
    const name = nameMatch ? nameMatch[1].trim() : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    
    const dependencies = SECTION_DEPENDENCIES[sectionId] || [];
    const required = REQUIRED_SECTIONS.has(sectionId);
    
    templates.set(sectionId, {
      id: sectionId,
      name,
      content: content.trim(),
      dependencies,
      required
    });
  }
  
  return templates;
}

/**
 * Auto-generate missing user variables
 */
export function autoGenerateVariables(
  userVariables: Record<string, string>,
  scienceCategory: string
): Record<string, string> {
  const generated = { ...userVariables };
  
  // Auto-generate Title if not provided
  if (!generated.Title || generated.Title.trim() === '') {
    const titlePrefixes = [
      'Revolutionary Breakthrough in',
      'Quantum Insights into',
      'Advanced Theoretical Framework for',
      'Pioneering Discovery of',
      'Fundamental Principles of',
      'Novel Approach to',
      'Unprecedented Analysis of',
      'Groundbreaking Study on'
    ];
    
    const subjects: Record<string, string[]> = {
      'Physics - Quantum Physics': ['Quantum Coffee Dynamics', 'Subatomic Breakfast Particles', 'Wave-Particle Sandwich Duality'],
      'Mathematics - General Mathematics': ['Infinite Pizza Division', 'The Mathematics of Sock Disappearance', 'Algebraic Relationship Between Cats and Physics'],
      'Biology - Mind Science': ['Telepathic Plant Communication', 'The Consciousness of Kitchen Appliances', 'Quantum Entanglement in Pet Behavior'],
      'Computer Science - Artificial Intelligence': ['AI-Powered Toaster Intelligence', 'Machine Learning for Predicting Netflix Choices', 'Neural Networks in Garden Gnomes'],
      'default': ['Universal Background Radiation', 'Cosmic String Theory', 'Dimensional Phase Transitions']
    };
    
    const categorySubjects = subjects[scienceCategory] || subjects['default'];
    const prefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
    const subject = categorySubjects[Math.floor(Math.random() * categorySubjects.length)];
    
    generated.Title = `${prefix} ${subject}`;
  }
  
  // Auto-generate other missing fields
  if (!generated.ResearcherName || generated.ResearcherName.trim() === '') {
    const firstNames = ['Dr. Quantum', 'Prof. Cosmic', 'Dr. Infinite', 'Prof. Ethereal', 'Dr. Mystical'];
    const lastNames = ['Pseudoscience', 'Paradigm', 'Breakthrough', 'Discovery', 'Revolution'];
    generated.ResearcherName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }
  
  if (!generated.Authors || generated.Authors.trim() === '') {
    generated.Authors = `${generated.ResearcherName}, Independent Researcher`;
  }
  
  if (!generated.Institution || generated.Institution.trim() === '') {
    const institutions = [
      'Institute for Advanced Pseudoscience',
      'University of Cosmic Awareness',
      'Academy of Quantum Enlightenment',
      'Center for Metaphysical Research',
      'Institute of Theoretical Everything'
    ];
    generated.Institution = institutions[Math.floor(Math.random() * institutions.length)];
  }
  
  if (!generated.Keywords || generated.Keywords.trim() === '') {
    generated.Keywords = 'quantum, consciousness, paradigm shift, breakthrough, revolutionary';
  }
  
  if (!generated.Methodology || generated.Methodology.trim() === '') {
    const methodologies = [
      'quantum consciousness measurement',
      'interdimensional analysis',
      'cosmic resonance testing',
      'metaphysical data collection',
      'paradigmatic observation'
    ];
    generated.Methodology = methodologies[Math.floor(Math.random() * methodologies.length)];
  }
  
  if (!generated.Funding || generated.Funding.trim() === '') {
    const funders = [
      'Cosmic Enlightenment Foundation',
      'Institute for Paradigm Shifting',
      'Universal Consciousness Grant',
      'Quantum Awareness Fund',
      'Interdimensional Research Council'
    ];
    generated.Funding = funders[Math.floor(Math.random() * funders.length)];
  }
  
  return generated;
}

/**
 * Build variables for a specific section including dependencies
 */
export function buildVariablesForSection(
  sectionId: string,
  state: WorkflowState,
  autoGeneratedVars: Record<string, string>
): Record<string, string> {
  const dependencies = state.dependencyMap.get(sectionId) || [];
  const variables = { ...autoGeneratedVars };
  
  // Add section output variables
  dependencies.forEach(depId => {
    const output = state.sectionOutputs.get(depId);
    if (output) {
      // Create both generic {response} and specific {sectionId} variables
      variables[depId] = output.content;
      if (dependencies.length === 1) {
        variables.response = output.content; // Single dependency becomes {response}
      }
    }
  });
  
  // For results section, also add abstract content directly
  if (sectionId === 'results' && state.sectionOutputs.has('abstract')) {
    variables.Abstract = state.sectionOutputs.get('abstract')!.content;
  }
  
  return variables;
}

/**
 * Get the next sections that are ready to process
 */
export function getNextEligibleSections(state: WorkflowState): string[] {
  const eligible: string[] = [];
  
  state.enabledSections.forEach(sectionId => {
    // Skip if already processed
    if (state.sectionOutputs.has(sectionId)) return;
    
    // Skip if currently processing
    if (state.processingSection === sectionId) return;
    
    // Check if all dependencies are complete
    const dependencies = state.dependencyMap.get(sectionId) || [];
    const allDepsMet = dependencies.every(dep => 
      !state.enabledSections.has(dep) || state.sectionOutputs.has(dep)
    );
    
    if (allDepsMet) {
      eligible.push(sectionId);
    }
  });
  
  return eligible;
}

/**
 * Check if workflow is complete
 */
export function isWorkflowComplete(state: WorkflowState): boolean {
  let allComplete = true;
  state.enabledSections.forEach(sectionId => {
    if (!state.sectionOutputs.has(sectionId)) {
      allComplete = false;
    }
  });
  return allComplete;
}

/**
 * Get workflow progress information
 */
export function getWorkflowProgress(state: WorkflowState): {
  completed: number;
  total: number;
  percentage: number;
  nextSections: string[];
} {
  const total = state.enabledSections.size;
  let completed = 0;
  state.enabledSections.forEach(sectionId => {
    if (state.sectionOutputs.has(sectionId)) {
      completed++;
    }
  });
  
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    nextSections: getNextEligibleSections(state)
  };
}

/**
 * Create initial workflow state
 */
export function createWorkflowState(
  templates: Map<string, SectionTemplate>,
  enabledSections: string[] = Array.from(REQUIRED_SECTIONS)
): WorkflowState {
  const dependencyMap = new Map<string, string[]>();
  const enabledSet = new Set(enabledSections);
  
  // Build dependency map from templates
  templates.forEach((template, sectionId) => {
    if (enabledSet.has(sectionId)) {
      dependencyMap.set(sectionId, template.dependencies);
    }
  });
  
  return {
    sectionOutputs: new Map(),
    userVariables: {},
    dependencyMap,
    enabledSections: enabledSet,
    processingSection: null,
    currentStep: 0,
    totalSteps: enabledSet.size
  };
}