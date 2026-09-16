import { describe, it, expect } from 'vitest';
import { DeadFunctionsAnalyzer, deadFunctionsAnalyzer } from './deadFunctionsAnalyzer';

describe('DeadFunctionsAnalyzer initialization', () => {
  it('should have the correct name property', () => {
    const analyzer = new DeadFunctionsAnalyzer();
    expect(analyzer.name).toBe('dead-functions');
  });

  it('should export a valid singleton instance', () => {
    expect(deadFunctionsAnalyzer).toBeInstanceOf(DeadFunctionsAnalyzer);
    expect(deadFunctionsAnalyzer.name).toBe('dead-functions');
  });
});
