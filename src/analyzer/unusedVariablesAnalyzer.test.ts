import { describe, it, expect } from 'vitest';
import { unusedVariablesAnalyzer } from './unusedVariablesAnalyzer';
import { AnalyzerConfig } from '../models';

describe('UnusedVariablesAnalyzer', () => {
  const defaultConfig: AnalyzerConfig = {
    enableUnusedImports: true,
    enableUnusedVariables: true,
    enableDeadFunctions: true,
    enableDeadExports: true,
    enableMissingImplementations: true,
    autoFixOnSave: false,
    ignorePatterns: [],
    respectUnderscoreConvention: true,
  };

  describe('isEnabled', () => {
    it('returns true when config.enableUnusedVariables is true', () => {
      expect(unusedVariablesAnalyzer.isEnabled(defaultConfig)).toBe(true);
    });

    it('returns false when config.enableUnusedVariables is false', () => {
      expect(unusedVariablesAnalyzer.isEnabled({ ...defaultConfig, enableUnusedVariables: false })).toBe(false);
    });
  });

  describe('initialization', () => {
    it('has the correct analyzer name', () => {
      expect(unusedVariablesAnalyzer.name).toBe('unused-variables');
    });
  });
});
