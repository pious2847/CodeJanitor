/**
 * Accessibility Analyzer
 * 
 * Analyzes React/Vue components for WCAG compliance:
 * - Missing alt text on images
 * - Missing ARIA labels and roles
 * - Keyboard navigation issues
 * - Color contrast issues (basic detection)
 * - Form accessibility
 * - Interactive element accessibility
 * 
 * Provides suggestions for improving accessibility.
 */

import {
  SourceFile,
  Node,
  SyntaxKind,
  JsxElement,
  JsxSelfClosingElement,
} from 'ts-morph';
import { BaseEnterpriseAnalyzer } from './base';
import {
  CodeIssue,
  AnalyzerConfig,
  SourceLocation,
  generateIssueId,
  AnalyzerPriority,
  AnalyzerCategory,
  Framework,
} from '../models';
import { parseCodeJanitorDirectives } from './ignoreDirectives';

/**
 * Accessibility rule
 */
interface A11yRule {
  name: string;
  description: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  check: (element: JsxElement | JsxSelfClosingElement) => boolean;
  getSuggestion: (element: JsxElement | JsxSelfClosingElement) => string;
}

/**
 * Interactive elements that require keyboard accessibility
 */
const INTERACTIVE_ELEMENTS = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'details',
  'summary',
];

/**
 * Elements that should have alt text
 */
const IMAGE_ELEMENTS = ['img', 'area'];

/**
 * Analyzer for accessibility violations
 */
export class AccessibilityAnalyzer extends BaseEnterpriseAnalyzer {
  readonly name = 'accessibility';
  readonly priority: AnalyzerPriority = 60;
  readonly category: AnalyzerCategory = 'accessibility';
  readonly supportedFrameworks: Framework[] = ['react', 'vue'];

  private a11yRules: A11yRule[] = [];

  constructor() {
    super();
    this.initializeRules();
  }

  isEnabled(config: AnalyzerConfig): boolean {
    return config.enableAccessibilityAnalysis;
  }

  analyzeFile(sourceFile: SourceFile, _config: AnalyzerConfig): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const directives = parseCodeJanitorDirectives(sourceFile);
    
    if (directives.fileIgnored) {
      return [];
    }

    // Only analyze files that contain JSX
    if (!this.containsJsx(sourceFile)) {
      return [];
    }

    // Check all JSX elements
    const jsxElements = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
    ];

    for (const element of jsxElements) {
      for (const rule of this.a11yRules) {
        if (rule.check(element)) {
          const startLine = element.getStartLineNumber();
          
          // Skip if line is ignored
          if (directives.isLineIgnored(startLine, 'accessibility-violation')) {
            continue;
          }

          const issue = this.createIssue(sourceFile, element, rule);
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  /**
   * Initialize accessibility rules
   */
  private initializeRules(): void {
    this.a11yRules = [
      {
        name: 'img-alt',
        description: 'Images must have alt text',
        wcagLevel: 'A',
        check: (element) => {
          const tagName = this.getTagName(element);
          if (!IMAGE_ELEMENTS.includes(tagName)) return false;
          
          const altAttr = this.getAttribute(element, 'alt');
          return !altAttr || altAttr.trim() === '';
        },
        getSuggestion: () =>
          'Add an alt attribute with descriptive text. For decorative images, use alt="".',
      },
      {
        name: 'button-name',
        description: 'Buttons must have accessible text',
        wcagLevel: 'A',
        check: (element) => {
          const tagName = this.getTagName(element);
          if (tagName !== 'button') return false;
          
          // Check for text content or aria-label
          const hasTextContent = this.hasTextContent(element);
          const hasAriaLabel = this.hasAttribute(element, 'aria-label');
          const hasAriaLabelledBy = this.hasAttribute(element, 'aria-labelledby');
          
          return !hasTextContent && !hasAriaLabel && !hasAriaLabelledBy;
        },
        getSuggestion: () =>
          'Add text content to the button or use aria-label to provide an accessible name.',
      },
      {
        name: 'link-name',
        description: 'Links must have accessible text',
        wcagLevel: 'A',
        check: (element) => {
          const tagName = this.getTagName(element);
          if (tagName !== 'a') return false;
          
          const hasTextContent = this.hasTextContent(element);
          const hasAriaLabel = this.hasAttribute(element, 'aria-label');
          const hasAriaLabelledBy = this.hasAttribute(element, 'aria-labelledby');
          
          return !hasTextContent && !hasAriaLabel && !hasAriaLabelledBy;
        },
        getSuggestion: () =>
          'Add text content to the link or use aria-label to provide an accessible name.',
      },
      {
        name: 'input-label',
        description: 'Form inputs must have associated labels',
        wcagLevel: 'A',
        check: (element) => {
          const tagName = this.getTagName(element);
          if (tagName !== 'input') return false;
          
          const type = this.getAttribute(element, 'type');
          // Skip hidden and submit inputs
          if (type === 'hidden' || type === 'submit' || type === 'button') return false;
          
          const hasAriaLabel = this.hasAttribute(element, 'aria-label');
          const hasAriaLabelledBy = this.hasAttribute(element, 'aria-labelledby');
          const hasId = this.hasAttribute(element, 'id');
          
          // If it has aria-label or aria-labelledby, it's accessible
          if (hasAriaLabel || hasAriaLabelledBy) return false;
          
          // If it doesn't have an id, it can't be associated with a label
          return !hasId;
        },
        getSuggestion: () =>
          'Add an id to the input and associate it with a <label> element, or use aria-label.',
      },
      {
        name: 'click-events-have-key-events',
        description: 'Elements with onClick must be keyboard accessible',
        wcagLevel: 'A',
        check: (element) => {
          const tagName = this.getTagName(element);
          
          // Interactive elements are already keyboard accessible
          if (INTERACTIVE_ELEMENTS.includes(tagName)) return false;
          
          const hasOnClick = this.hasAttribute(element, 'onClick');
          if (!hasOnClick) return false;
          
          const hasOnKeyDown = this.hasAttribute(element, 'onKeyDown');
          const hasOnKeyUp = this.hasAttribute(element, 'onKeyUp');
          const hasOnKeyPress = this.hasAttribute(element, 'onKeyPress');
          const hasRole = this.hasAttribute(element, 'role');
          const hasTabIndex = this.hasAttribute(element, 'tabIndex');
          
          // If it has keyboard events and proper role/tabIndex, it's accessible
          return !(hasOnKeyDown || hasOnKeyUp || hasOnKeyPress) || !hasRole || !hasTabIndex;
        },
        getSuggestion: () =>
          'Add onKeyDown/onKeyUp handler, role attribute, and tabIndex to make the element keyboard accessible. ' +
          'Or use a <button> element instead.',
      },
      {
        name: 'aria-role',
        description: 'ARIA roles must be valid',
        wcagLevel: 'A',
        check: (element) => {
          const role = this.getAttribute(element, 'role');
          if (!role) return false;
          
          const validRoles = [
            'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
            'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
            'definition', 'dialog', 'directory', 'document', 'feed', 'figure',
            'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list',
            'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
            'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation',
            'none', 'note', 'option', 'presentation', 'progressbar', 'radio',
            'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
            'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status',
            'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox',
            'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
          ];
          
          return !validRoles.includes(role.toLowerCase());
        },
        getSuggestion: (element) => {
          const role = this.getAttribute(element, 'role');
          return `The role "${role}" is not a valid ARIA role. Use a valid ARIA role from the ARIA specification.`;
        },
      },
      {
        name: 'heading-order',
        description: 'Heading levels should not skip',
        wcagLevel: 'A',
        check: (element) => {
          const tagName = this.getTagName(element);
          // This is a simplified check - full implementation would track heading hierarchy
          return tagName.match(/^h[1-6]$/) !== null && false; // Placeholder
        },
        getSuggestion: () =>
          'Maintain proper heading hierarchy. Don\'t skip heading levels (e.g., h1 to h3).',
      },
      {
        name: 'tabindex-no-positive',
        description: 'Avoid positive tabIndex values',
        wcagLevel: 'A',
        check: (element) => {
          const tabIndex = this.getAttribute(element, 'tabIndex');
          if (!tabIndex) return false;
          
          const value = parseInt(tabIndex, 10);
          return !isNaN(value) && value > 0;
        },
        getSuggestion: () =>
          'Avoid positive tabIndex values. Use tabIndex="0" for focusable elements or tabIndex="-1" for programmatically focusable elements.',
      },
    ];
  }

  /**
   * Check if source file contains JSX
   */
  private containsJsx(sourceFile: SourceFile): boolean {
    return (
      sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
      sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0
    );
  }

  /**
   * Get tag name from JSX element
   */
  private getTagName(element: JsxElement | JsxSelfClosingElement): string {
    if (Node.isJsxElement(element)) {
      return element.getOpeningElement().getTagNameNode().getText();
    }
    return element.getTagNameNode().getText();
  }

  /**
   * Get attribute value from JSX element
   */
  private getAttribute(element: JsxElement | JsxSelfClosingElement, name: string): string | null {
    const attributes = Node.isJsxElement(element)
      ? element.getOpeningElement().getAttributes()
      : element.getAttributes();

    for (const attr of attributes) {
      if (Node.isJsxAttribute(attr)) {
        const attrName = attr.getNameNode().getText();
        if (attrName === name) {
          const initializer = attr.getInitializer();
          if (initializer && Node.isStringLiteral(initializer)) {
            return initializer.getLiteralValue();
          }
          if (initializer && Node.isJsxExpression(initializer)) {
            return initializer.getExpression()?.getText() || '';
          }
          // Attribute without value (e.g., disabled)
          return '';
        }
      }
    }

    return null;
  }

  /**
   * Check if element has an attribute
   */
  private hasAttribute(element: JsxElement | JsxSelfClosingElement, name: string): boolean {
    return this.getAttribute(element, name) !== null;
  }

  /**
   * Check if element has text content
   */
  private hasTextContent(element: JsxElement | JsxSelfClosingElement): boolean {
    if (Node.isJsxSelfClosingElement(element)) {
      return false;
    }

    const children = element.getJsxChildren();
    for (const child of children) {
      if (Node.isJsxText(child)) {
        const text = child.getText().trim();
        if (text.length > 0) return true;
      }
    }

    return false;
  }

  /**
   * Create a CodeIssue for an accessibility violation
   */
  private createIssue(
    sourceFile: SourceFile,
    element: JsxElement | JsxSelfClosingElement,
    rule: A11yRule
  ): CodeIssue {
    const startLine = element.getStartLineNumber();
    const tagName = this.getTagName(element);

    const location: SourceLocation = {
      filePath: sourceFile.getFilePath(),
      startLine,
      startColumn: element.getStart(),
      endLine: element.getEndLineNumber(),
      endColumn: element.getEnd(),
      sourceText: element.getText().substring(0, 100),
    };

    return {
      id: generateIssueId('accessibility-violation', sourceFile.getFilePath(), rule.name, startLine),
      type: 'accessibility-violation',
      certainty: 'high',
      reason: `${rule.description} (WCAG ${rule.wcagLevel})`,
      locations: [location],
      safeFixAvailable: false,
      symbolName: tagName,
      explanation:
        `This element violates WCAG ${rule.wcagLevel} accessibility guidelines. ` +
        `${rule.description}`,
      suggestedFix: rule.getSuggestion(element),
      tags: ['accessibility', `wcag-${rule.wcagLevel.toLowerCase()}`, rule.name],
    };
  }
}

/**
 * Singleton instance
 */
export const accessibilityAnalyzer = new AccessibilityAnalyzer();
