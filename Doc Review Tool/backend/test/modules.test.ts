import { describe, it, expect } from 'vitest';
import {
  getModule,
  hasSpecializedModule,
  buildModulePrompt,
  getMandatoryChecklist,
  getSpecializedDocumentTypes,
} from '../src/modules/registry';
import { formatChecklistPrompt, getRoleFraming } from '../src/modules/base';
import { lpaModule } from '../src/modules/lpa';
import { ppmModule } from '../src/modules/ppm';
import { subDocModule } from '../src/modules/sub-doc';
import { sideLetterModule } from '../src/modules/side-letter';
import { coInvestModule } from '../src/modules/co-invest';
import { generalModule } from '../src/modules/general';
import type { DocumentType } from '@shared/types';

describe('review modules', () => {
  describe('registry', () => {
    it('returns specialized modules for known doc types', () => {
      expect(getModule('lpa')).toBe(lpaModule);
      expect(getModule('ppm')).toBe(ppmModule);
      expect(getModule('sub-doc')).toBe(subDocModule);
      expect(getModule('side-letter')).toBe(sideLetterModule);
      expect(getModule('co-invest')).toBe(coInvestModule);
    });

    it('falls back to general module for unknown types', () => {
      expect(getModule('amendment')).toBe(generalModule);
      expect(getModule('capital-call')).toBe(generalModule);
      expect(getModule('other')).toBe(generalModule);
      expect(getModule('fund-notice')).toBe(generalModule);
    });

    it('correctly identifies specialized doc types', () => {
      expect(hasSpecializedModule('lpa')).toBe(true);
      expect(hasSpecializedModule('ppm')).toBe(true);
      expect(hasSpecializedModule('sub-doc')).toBe(true);
      expect(hasSpecializedModule('side-letter')).toBe(true);
      expect(hasSpecializedModule('co-invest')).toBe(true);
      expect(hasSpecializedModule('amendment')).toBe(false);
      expect(hasSpecializedModule('other')).toBe(false);
    });

    it('lists all specialized document types', () => {
      const types = getSpecializedDocumentTypes();
      expect(types).toContain('lpa');
      expect(types).toContain('ppm');
      expect(types).toContain('sub-doc');
      expect(types).toContain('side-letter');
      expect(types).toContain('co-invest');
      expect(types).toHaveLength(5);
    });
  });

  describe('module structure', () => {
    const allModules = [lpaModule, ppmModule, subDocModule, sideLetterModule, coInvestModule, generalModule];

    it('every module has required fields', () => {
      for (const module of allModules) {
        expect(module.documentType).toBeTruthy();
        expect(module.name).toBeTruthy();
        expect(module.checklist.length).toBeGreaterThan(0);
        expect(module.systemPromptAddendum).toBeTruthy();
        expect(module.gpFraming).toBeTruthy();
        expect(module.lpFraming).toBeTruthy();
      }
    });

    it('every checklist item has required fields', () => {
      for (const module of allModules) {
        for (const item of module.checklist) {
          expect(item.id).toBeTruthy();
          expect(item.label).toBeTruthy();
          expect(item.description).toBeTruthy();
          expect(typeof item.required).toBe('boolean');
        }
      }
    });

    it('checklist IDs are unique within each module', () => {
      for (const module of allModules) {
        const ids = module.checklist.map((c) => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });
  });

  describe('checklist counts', () => {
    it('LPA has 13 mandatory + 3 optional items', () => {
      const mandatory = lpaModule.checklist.filter((c) => c.required);
      const optional = lpaModule.checklist.filter((c) => !c.required);
      expect(mandatory).toHaveLength(13);
      expect(optional).toHaveLength(3);
    });

    it('PPM has 8 mandatory + 2 optional items', () => {
      const mandatory = ppmModule.checklist.filter((c) => c.required);
      const optional = ppmModule.checklist.filter((c) => !c.required);
      expect(mandatory).toHaveLength(8);
      expect(optional).toHaveLength(2);
    });

    it('Sub-doc has 9 mandatory + 2 optional items', () => {
      const mandatory = subDocModule.checklist.filter((c) => c.required);
      const optional = subDocModule.checklist.filter((c) => !c.required);
      expect(mandatory).toHaveLength(9);
      expect(optional).toHaveLength(2);
    });

    it('Side letter has 8 mandatory + 2 optional items', () => {
      const mandatory = sideLetterModule.checklist.filter((c) => c.required);
      const optional = sideLetterModule.checklist.filter((c) => !c.required);
      expect(mandatory).toHaveLength(8);
      expect(optional).toHaveLength(2);
    });

    it('General has 6 mandatory + 0 optional items', () => {
      const mandatory = generalModule.checklist.filter((c) => c.required);
      const optional = generalModule.checklist.filter((c) => !c.required);
      expect(mandatory).toHaveLength(6);
      expect(optional).toHaveLength(0);
    });
  });

  describe('buildModulePrompt', () => {
    it('includes module addendum, role framing, and checklist', () => {
      const prompt = buildModulePrompt('lpa', 'lp');
      // Should contain module-specific content
      expect(prompt).toContain('LPA-SPECIFIC ANALYSIS');
      // Should contain LP framing
      expect(prompt).toContain('LP counsel');
      // Should contain checklist items
      expect(prompt).toContain('MANDATORY CHECKLIST');
      expect(prompt).toContain('Management Fee');
      expect(prompt).toContain('Carried Interest');
    });

    it('uses GP framing for GP role', () => {
      const prompt = buildModulePrompt('lpa', 'gp');
      expect(prompt).toContain('GP counsel');
      expect(prompt).not.toContain('LP counsel');
    });

    it('uses general module for unknown types', () => {
      const prompt = buildModulePrompt('amendment', 'lp');
      expect(prompt).toContain('GENERAL REVIEW APPROACH');
    });
  });

  describe('getMandatoryChecklist', () => {
    it('returns only required items', () => {
      const items = getMandatoryChecklist('lpa', 'lp');
      expect(items.every((i) => i.required)).toBe(true);
      expect(items).toHaveLength(13);
    });

    it('returns general + sub-type checklist for non-specialized types', () => {
      const items = getMandatoryChecklist('capital-call', 'gp');
      expect(items.every((i) => i.required)).toBe(true);
      // general (6) + capital-call sub-type (4) = 10
      expect(items).toHaveLength(10);
    });
  });

  describe('formatChecklistPrompt', () => {
    it('separates mandatory and optional items', () => {
      const prompt = formatChecklistPrompt(lpaModule.checklist);
      expect(prompt).toContain('MANDATORY CHECKLIST');
      expect(prompt).toContain('ADDITIONAL ITEMS');
      expect(prompt).toContain('[lpa-01]');
      expect(prompt).toContain('[lpa-14]'); // optional item
    });

    it('omits ADDITIONAL ITEMS section when no optional items', () => {
      const prompt = formatChecklistPrompt(generalModule.checklist);
      expect(prompt).toContain('MANDATORY CHECKLIST');
      expect(prompt).not.toContain('ADDITIONAL ITEMS');
    });
  });

  describe('getRoleFraming', () => {
    it('returns GP framing for GP role', () => {
      const framing = getRoleFraming(lpaModule, 'gp');
      expect(framing).toContain('GP counsel');
    });

    it('returns LP framing for LP role', () => {
      const framing = getRoleFraming(lpaModule, 'lp');
      expect(framing).toContain('LP counsel');
    });
  });
});
