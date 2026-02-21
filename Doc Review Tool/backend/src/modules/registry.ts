import type { DocumentType, UserRole, ReviewChecklistItem } from '@shared/types';
import type { ReviewModuleDefinition } from './base';
import { getChecklistForRole, getRoleFraming, formatChecklistPrompt } from './base';
import { lpaModule } from './lpa';
import { ppmModule } from './ppm';
import { subDocModule } from './sub-doc';
import { sideLetterModule } from './side-letter';
import { coInvestModule } from './co-invest';
import { generalModule, getSubTypeEnhancements } from './general';

/**
 * Registry of all review modules, keyed by document type.
 * Modules are loaded eagerly since they're just data (no heavy imports).
 */
const MODULE_REGISTRY: Map<DocumentType, ReviewModuleDefinition> = new Map();

// Register all modules
function registerModule(module: ReviewModuleDefinition): void {
  MODULE_REGISTRY.set(module.documentType, module);
}

registerModule(lpaModule);
registerModule(ppmModule);
registerModule(subDocModule);
registerModule(sideLetterModule);
registerModule(coInvestModule);
// General module is the fallback, not registered by document type

/**
 * Get the review module for a document type.
 * Falls back to the general module for unrecognized types.
 */
export function getModule(documentType: DocumentType): ReviewModuleDefinition {
  return MODULE_REGISTRY.get(documentType) || generalModule;
}

/**
 * Check if a document type has a specialized (deep review) module.
 */
export function hasSpecializedModule(documentType: DocumentType): boolean {
  return MODULE_REGISTRY.has(documentType);
}

/**
 * Build the complete module-specific system prompt addendum.
 * Combines: module addendum + role framing + checklist.
 *
 * For non-specialized types that fall back to the general module,
 * sub-type-specific guidance is layered on top (e.g., amendment-specific
 * checklist items and prompt text for documents classified as "amendment").
 */
export function buildModulePrompt(documentType: DocumentType, userRole: UserRole): string {
  const module = getModule(documentType);
  const checklist = getChecklistForRole(module, userRole);
  const roleFraming = getRoleFraming(module, userRole);

  // Check for sub-type enhancements (only applies when using the general module)
  const subTypeEnhancements = !hasSpecializedModule(documentType)
    ? getSubTypeEnhancements(documentType)
    : null;

  let prompt = module.systemPromptAddendum;

  // Inject sub-type-specific prompt guidance
  if (subTypeEnhancements) {
    prompt += `\n\n${subTypeEnhancements.promptAddendum}`;
  }

  prompt += `\n\n${roleFraming}`;

  // Merge sub-type checklist items with the general checklist
  const fullChecklist = subTypeEnhancements
    ? [...checklist, ...subTypeEnhancements.additionalChecklist]
    : checklist;

  prompt += `\n\n${formatChecklistPrompt(fullChecklist)}`;

  return prompt;
}

/**
 * Get the mandatory checklist items for post-analysis verification.
 * Returns only the required items — used to check if the LLM missed anything.
 * Includes sub-type-specific items for non-specialized document types.
 */
export function getMandatoryChecklist(
  documentType: DocumentType,
  userRole: UserRole,
): ReviewChecklistItem[] {
  const module = getModule(documentType);
  const baseItems = getChecklistForRole(module, userRole).filter((item) => item.required);

  // Add sub-type-specific mandatory items when using the general module
  if (!hasSpecializedModule(documentType)) {
    const subTypeEnhancements = getSubTypeEnhancements(documentType);
    if (subTypeEnhancements) {
      const subTypeRequired = subTypeEnhancements.additionalChecklist.filter((item) => item.required);
      return [...baseItems, ...subTypeRequired];
    }
  }

  return baseItems;
}

/**
 * Get all registered document types that have specialized modules.
 */
export function getSpecializedDocumentTypes(): DocumentType[] {
  return Array.from(MODULE_REGISTRY.keys());
}
