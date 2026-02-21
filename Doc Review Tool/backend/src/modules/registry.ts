import type { DocumentType, UserRole, ReviewChecklistItem } from '@shared/types';
import type { ReviewModuleDefinition } from './base';
import { getChecklistForRole, getRoleFraming, formatChecklistPrompt } from './base';
import { lpaModule } from './lpa';
import { ppmModule } from './ppm';
import { subDocModule } from './sub-doc';
import { sideLetterModule } from './side-letter';
import { generalModule } from './general';

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
 */
export function buildModulePrompt(documentType: DocumentType, userRole: UserRole): string {
  const module = getModule(documentType);
  const checklist = getChecklistForRole(module, userRole);
  const roleFraming = getRoleFraming(module, userRole);

  return `${module.systemPromptAddendum}\n\n${roleFraming}\n\n${formatChecklistPrompt(checklist)}`;
}

/**
 * Get the mandatory checklist items for post-analysis verification.
 * Returns only the required items — used to check if the LLM missed anything.
 */
export function getMandatoryChecklist(
  documentType: DocumentType,
  userRole: UserRole,
): ReviewChecklistItem[] {
  const module = getModule(documentType);
  return getChecklistForRole(module, userRole).filter((item) => item.required);
}

/**
 * Get all registered document types that have specialized modules.
 */
export function getSpecializedDocumentTypes(): DocumentType[] {
  return Array.from(MODULE_REGISTRY.keys());
}
