/**
 * Sample TypeScript file for testing CodeJanitor
 * Contains various code quality issues for demonstration
 */

// Unused imports (should be detected)
import { unused1, unused2 } from './utils';
import * as fs from 'fs';

// Used import
import { helper } from './helper';

// Unused variable (should be detected)
const unusedVariable = 'This is never used';

// Unused function (should be detected)
function unusedFunction() {
  return 'This function is never called';
}

// Complex function (high cyclomatic complexity)
function complexFunction(x: number, y: number, z: number): number {
  if (x > 0) {
    if (y > 0) {
      if (z > 0) {
        return x + y + z;
      } else {
        return x + y;
      }
    } else {
      if (z > 0) {
        return x + z;
      } else {
        return x;
      }
    }
  } else {
    if (y > 0) {
      if (z > 0) {
        return y + z;
      } else {
        return y;
      }
    } else {
      if (z > 0) {
        return z;
      } else {
        return 0;
      }
    }
  }
}

// Security issue: hardcoded secret (should be detected)
const API_KEY = 'sk-1234567890abcdef';
const PASSWORD = 'hardcoded-password-123';

// Security issue: SQL injection vulnerability (should be detected)
function getUserById(userId: string) {
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  return query;
}

// Used function
export function usedFunction() {
  return helper();
}

// Dead export (not imported anywhere)
export function deadExport() {
  return 'This is exported but never imported';
}

// Accessibility issue: missing alt text
export function renderImage() {
  return '<img src="photo.jpg" />';
}

// Performance anti-pattern: inefficient loop
export function inefficientLoop(items: any[]) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      result.push(items[i] + items[j]);
    }
  }
  return result;
}

// Code duplication (similar to another function)
export function calculateTotal1(items: number[]): number {
  let total = 0;
  for (const item of items) {
    total += item;
  }
  return total;
}

// Duplicate code
export function calculateTotal2(values: number[]): number {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}
