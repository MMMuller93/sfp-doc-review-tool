import type { DocumentType, ReviewChecklistItem, UserRole } from '@shared/types';

/**
 * A ReviewModule defines document-type-specific analysis guidance.
 *
 * Each module provides:
 * - A mandatory checklist of items to cover
 * - A system prompt addendum with domain-specific analysis instructions
 * - GP and LP framing to tailor the analysis perspective
 */
export interface ReviewModuleDefinition {
  documentType: DocumentType;
  name: string;
  checklist: ReviewChecklistItem[];
  /** Additional system prompt text appended to the base analysis prompt. */
  systemPromptAddendum: string;
  /** GP-specific analysis framing. */
  gpFraming: string;
  /** LP-specific analysis framing. */
  lpFraming: string;
}

/**
 * Get the checklist items for a module, filtered by role if relevant.
 * All required items are always included. Optional items may be role-specific.
 */
export function getChecklistForRole(
  module: ReviewModuleDefinition,
  _userRole: UserRole,
): ReviewChecklistItem[] {
  // Currently all checklist items apply regardless of role.
  // Role-specific filtering can be added here later.
  return module.checklist;
}

/**
 * Get the role-specific framing text for a module.
 */
export function getRoleFraming(module: ReviewModuleDefinition, userRole: UserRole): string {
  return userRole === 'gp' ? module.gpFraming : module.lpFraming;
}

/**
 * Build the checklist portion of the analysis prompt.
 * This tells the LLM exactly which topics to cover.
 */
export function formatChecklistPrompt(checklist: ReviewChecklistItem[]): string {
  const required = checklist.filter((c) => c.required);
  const optional = checklist.filter((c) => !c.required);

  let prompt = `## MANDATORY CHECKLIST\n\nYou MUST address each of these items. If a topic is not present in the document, explicitly note its absence.\n\n`;

  for (const item of required) {
    prompt += `- **[${item.id}] ${item.label}**: ${item.description}\n`;
  }

  if (optional.length > 0) {
    prompt += `\n## ADDITIONAL ITEMS (address if present)\n\n`;
    for (const item of optional) {
      prompt += `- **[${item.id}] ${item.label}**: ${item.description}\n`;
    }
  }

  return prompt;
}
