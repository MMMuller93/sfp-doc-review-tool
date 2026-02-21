import { describe, it, expect } from 'vitest';
import {
  getModule,
  hasSpecializedModule,
  buildModulePrompt,
  getMandatoryChecklist,
  getSpecializedDocumentTypes,
} from '../src/modules/registry';
import { coInvestModule } from '../src/modules/co-invest';
import { generalModule, getSubTypeEnhancements } from '../src/modules/general';
import type { DocumentType } from '@shared/types';

describe('Phase 4: General Review & Co-Investment Module', () => {
  // === CO-INVEST MODULE ===
  describe('co-invest module', () => {
    it('is registered as a specialized module', () => {
      expect(hasSpecializedModule('co-invest')).toBe(true);
      expect(getModule('co-invest')).toBe(coInvestModule);
    });

    it('has 10 mandatory + 2 optional items', () => {
      const mandatory = coInvestModule.checklist.filter((c) => c.required);
      const optional = coInvestModule.checklist.filter((c) => !c.required);
      expect(mandatory).toHaveLength(10);
      expect(optional).toHaveLength(2);
    });

    it('has unique checklist IDs with ci- prefix', () => {
      const ids = coInvestModule.checklist.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
      expect(ids.every((id) => id.startsWith('ci-'))).toBe(true);
    });

    it('covers key co-invest topics', () => {
      const labels = coInvestModule.checklist.map((c) => c.label.toLowerCase());
      expect(labels.some((l) => l.includes('allocation'))).toBe(true);
      expect(labels.some((l) => l.includes('fee') || l.includes('carry'))).toBe(true);
      expect(labels.some((l) => l.includes('exit') || l.includes('liquidity'))).toBe(true);
      expect(labels.some((l) => l.includes('follow-on'))).toBe(true);
      expect(labels.some((l) => l.includes('conflict'))).toBe(true);
    });

    it('includes co-invest in specialized document types list', () => {
      const types = getSpecializedDocumentTypes();
      expect(types).toContain('co-invest');
      expect(types).toHaveLength(5); // lpa, ppm, sub-doc, side-letter, co-invest
    });

    it('builds module prompt with co-invest-specific content', () => {
      const prompt = buildModulePrompt('co-invest', 'lp');
      expect(prompt).toContain('CO-INVESTMENT-SPECIFIC');
      expect(prompt).toContain('LP counsel');
      expect(prompt).toContain('MANDATORY CHECKLIST');
      expect(prompt).toContain('Allocation');
    });

    it('returns 10 mandatory items from getMandatoryChecklist', () => {
      const items = getMandatoryChecklist('co-invest', 'lp');
      expect(items).toHaveLength(10);
      expect(items.every((i) => i.required)).toBe(true);
    });
  });

  // === SUB-TYPE ENHANCEMENTS ===
  describe('sub-type enhancements', () => {
    it('returns enhancements for amendment type', () => {
      const enhancements = getSubTypeEnhancements('amendment');
      expect(enhancements).not.toBeNull();
      expect(enhancements!.additionalChecklist.length).toBeGreaterThan(0);
      expect(enhancements!.promptAddendum).toContain('AMENDMENT');
    });

    it('returns enhancements for capital-call type', () => {
      const enhancements = getSubTypeEnhancements('capital-call');
      expect(enhancements).not.toBeNull();
      expect(enhancements!.additionalChecklist.length).toBe(4);
      expect(enhancements!.promptAddendum).toContain('CAPITAL CALL');
    });

    it('returns enhancements for consent type', () => {
      const enhancements = getSubTypeEnhancements('consent');
      expect(enhancements).not.toBeNull();
      expect(enhancements!.additionalChecklist.length).toBe(4);
      expect(enhancements!.promptAddendum).toContain('CONSENT');
    });

    it('returns enhancements for distribution-notice type', () => {
      const enhancements = getSubTypeEnhancements('distribution-notice');
      expect(enhancements).not.toBeNull();
      expect(enhancements!.additionalChecklist.length).toBe(4);
      expect(enhancements!.promptAddendum).toContain('DISTRIBUTION');
    });

    it('returns enhancements for fund-notice type', () => {
      const enhancements = getSubTypeEnhancements('fund-notice');
      expect(enhancements).not.toBeNull();
      expect(enhancements!.additionalChecklist.length).toBe(2);
    });

    it('returns enhancements for advisory-materials type', () => {
      const enhancements = getSubTypeEnhancements('advisory-materials');
      expect(enhancements).not.toBeNull();
      expect(enhancements!.additionalChecklist.length).toBe(2);
      expect(enhancements!.promptAddendum).toContain('ADVISORY');
    });

    it('returns null for types with specialized modules', () => {
      // These have their own modules, so no general sub-type enhancement
      expect(getSubTypeEnhancements('lpa')).toBeNull();
      expect(getSubTypeEnhancements('ppm')).toBeNull();
      expect(getSubTypeEnhancements('co-invest')).toBeNull();
    });

    it('returns null for generic "other" type', () => {
      expect(getSubTypeEnhancements('other')).toBeNull();
    });

    it('all sub-type checklist items have unique IDs', () => {
      const allSubTypes: DocumentType[] = [
        'amendment', 'capital-call', 'consent',
        'distribution-notice', 'fund-notice', 'advisory-materials',
      ];
      const allIds: string[] = [];
      for (const type of allSubTypes) {
        const enhancements = getSubTypeEnhancements(type);
        if (enhancements) {
          allIds.push(...enhancements.additionalChecklist.map((c) => c.id));
        }
      }
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });

  // === INTEGRATED BEHAVIOR ===
  describe('registry integration with sub-type enhancements', () => {
    it('buildModulePrompt includes sub-type guidance for amendment', () => {
      const prompt = buildModulePrompt('amendment', 'lp');
      // Should have general module base
      expect(prompt).toContain('GENERAL REVIEW APPROACH');
      // Should also have amendment-specific content
      expect(prompt).toContain('AMENDMENT-SPECIFIC ANALYSIS');
      // Should have both general and amendment checklist items
      expect(prompt).toContain('gen-01');
      expect(prompt).toContain('amd-01');
    });

    it('buildModulePrompt includes sub-type guidance for capital-call', () => {
      const prompt = buildModulePrompt('capital-call', 'gp');
      expect(prompt).toContain('GENERAL REVIEW APPROACH');
      expect(prompt).toContain('CAPITAL CALL-SPECIFIC');
      expect(prompt).toContain('cc-01');
      expect(prompt).toContain('GP counsel');
    });

    it('buildModulePrompt does NOT inject sub-type for specialized modules', () => {
      const prompt = buildModulePrompt('lpa', 'lp');
      // Should have LPA-specific content only
      expect(prompt).toContain('LPA-SPECIFIC ANALYSIS');
      // Should NOT have general module content
      expect(prompt).not.toContain('GENERAL REVIEW APPROACH');
      // Should NOT have any sub-type amendment content
      expect(prompt).not.toContain('AMENDMENT-SPECIFIC');
    });

    it('getMandatoryChecklist includes sub-type items for amendment', () => {
      const items = getMandatoryChecklist('amendment', 'lp');
      // General (6) + amendment-specific (4) = 10
      expect(items).toHaveLength(10);
      expect(items.some((i) => i.id.startsWith('gen-'))).toBe(true);
      expect(items.some((i) => i.id.startsWith('amd-'))).toBe(true);
    });

    it('getMandatoryChecklist includes sub-type items for capital-call', () => {
      const items = getMandatoryChecklist('capital-call', 'gp');
      // General (6) + capital-call-specific (4) = 10
      expect(items).toHaveLength(10);
      expect(items.some((i) => i.id.startsWith('gen-'))).toBe(true);
      expect(items.some((i) => i.id.startsWith('cc-'))).toBe(true);
    });

    it('getMandatoryChecklist returns only general items for "other"', () => {
      const items = getMandatoryChecklist('other', 'lp');
      expect(items).toHaveLength(6);
      expect(items.every((i) => i.id.startsWith('gen-'))).toBe(true);
    });

    it('getMandatoryChecklist unchanged for specialized modules', () => {
      const items = getMandatoryChecklist('lpa', 'lp');
      expect(items).toHaveLength(13);
      expect(items.every((i) => i.id.startsWith('lpa-'))).toBe(true);
    });
  });
});
