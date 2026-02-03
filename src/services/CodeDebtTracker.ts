/**
 * Code Debt Tracker Service
 * 
 * Tracks and manages technical debt across projects:
 * - Technical debt quantification and prioritization
 * - Business impact assessment for quality issues
 * - Debt trend forecasting with historical analysis
 * 
 * Requirements: 2.5, 8.7
 */

import { EnterpriseCodeIssue, Priority, TechnicalDebtMetrics, DebtPriority } from '../models/enterprise';

/**
 * Debt item representing a quantified technical debt
 */
export interface DebtItem {
  /** Unique identifier */
  id: string;
  /** Associated issue */
  issue: EnterpriseCodeIssue;
  /** Estimated effort to fix (minutes) */
  effortMinutes: number;
  /** Business impact score (0-100) */
  businessImpact: number;
  /** Priority based on impact and effort */
  priority: Priority;
  /** Debt category */
  category: DebtCategory;
  /** When the debt was first identified */
  identifiedAt: Date;
  /** Age in days */
  ageDays: number;
  /** Interest rate (how much the debt grows over time) */
  interestRate: number;
}

/**
 * Debt category types
 */
export type DebtCategory =
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'reliability'
  | 'duplication'
  | 'complexity'
  | 'testing';

/**
 * Business impact assessment
 */
export interface BusinessImpactAssessment {
  /** Issue being assessed */
  issueId: string;
  /** Impact score (0-100) */
  score: number;
  /** Impact factors */
  factors: {
    /** User impact (0-100) */
    userImpact: number;
    /** Revenue impact (0-100) */
    revenueImpact: number;
    /** Security impact (0-100) */
    securityImpact: number;
    /** Maintenance impact (0-100) */
    maintenanceImpact: number;
    /** Team velocity impact (0-100) */
    velocityImpact: number;
  };
  /** Affected user count estimate */
  affectedUsers?: number;
  /** Estimated cost impact */
  estimatedCost?: number;
  /** Assessment notes */
  notes?: string;
}

/**
 * Debt trend data point
 */
export interface DebtTrendPoint {
  /** Timestamp */
  timestamp: Date;
  /** Total debt in minutes */
  totalDebt: number;
  /** Debt by category */
  byCategory: Record<DebtCategory, number>;
  /** Number of debt items */
  itemCount: number;
  /** Average age of debt items */
  averageAge: number;
}

/**
 * Debt forecast
 */
export interface DebtForecast {
  /** Forecast period */
  period: {
    start: Date;
    end: Date;
  };
  /** Predicted debt values */
  predictions: Array<{
    date: Date;
    predictedDebt: number;
    confidence: number; // 0-1
  }>;
  /** Trend direction */
  trend: 'increasing' | 'stable' | 'decreasing';
  /** Growth rate (percentage per month) */
  growthRate: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Debt prioritization result
 */
export interface PrioritizedDebt {
  /** High priority items */
  high: DebtItem[];
  /** Medium priority items */
  medium: DebtItem[];
  /** Low priority items */
  low: DebtItem[];
  /** Total debt minutes */
  totalMinutes: number;
  /** Prioritization strategy used */
  strategy: 'impact' | 'effort' | 'balanced' | 'age';
}

/**
 * Debt reduction plan
 */
export interface DebtReductionPlan {
  /** Plan identifier */
  id: string;
  /** Plan name */
  name: string;
  /** Target debt reduction (minutes) */
  targetReduction: number;
  /** Timeline (days) */
  timelineDays: number;
  /** Prioritized items to address */
  items: DebtItem[];
  /** Estimated completion date */
  estimatedCompletion: Date;
  /** Required team capacity (hours per week) */
  requiredCapacity: number;
  /** Expected ROI */
  expectedROI: number;
}

/**
 * Code Debt Tracker Service
 */
export class CodeDebtTracker {
  private debtItems: Map<string, DebtItem> = new Map();
  private trendHistory: DebtTrendPoint[] = [];
  private impactAssessments: Map<string, BusinessImpactAssessment> = new Map();

  /**
   * Quantify technical debt from issues
   */
  quantifyDebt(issues: EnterpriseCodeIssue[]): TechnicalDebtMetrics {
    const debtItems: DebtItem[] = [];
    let totalMinutes = 0;

    const breakdown: TechnicalDebtMetrics['breakdown'] = {
      security: 0,
      performance: 0,
      maintainability: 0,
      reliability: 0,
      duplications: 0,
    };

    for (const issue of issues) {
      const debtItem = this.createDebtItem(issue);
      debtItems.push(debtItem);
      totalMinutes += debtItem.effortMinutes;

      // Add to breakdown
      const category = this.mapCategoryToBreakdown(debtItem.category);
      if (category) {
        breakdown[category] += debtItem.effortMinutes;
      }

      // Store debt item
      this.debtItems.set(debtItem.id, debtItem);
    }

    // Calculate trend
    const previousTotal = this.trendHistory.length > 0
      ? this.trendHistory[this.trendHistory.length - 1]?.totalDebt || 0
      : totalMinutes;

    const trend = this.calculateTrendDirection(totalMinutes, previousTotal);

    // Record trend point
    this.recordTrendPoint(totalMinutes, debtItems);

    return {
      totalMinutes,
      breakdown,
      trend,
      priority: this.prioritizeDebtItems(debtItems),
    };
  }

  /**
   * Assess business impact of an issue
   */
  assessBusinessImpact(
    issue: EnterpriseCodeIssue,
    factors: Partial<BusinessImpactAssessment['factors']>,
    affectedUsers?: number,
    estimatedCost?: number,
    notes?: string
  ): BusinessImpactAssessment {
    // Default factors
    const defaultFactors: BusinessImpactAssessment['factors'] = {
      userImpact: 0,
      revenueImpact: 0,
      securityImpact: 0,
      maintenanceImpact: 0,
      velocityImpact: 0,
      ...factors,
    };

    // Calculate overall impact score (weighted average)
    const weights = {
      userImpact: 0.25,
      revenueImpact: 0.25,
      securityImpact: 0.25,
      maintenanceImpact: 0.15,
      velocityImpact: 0.10,
    };

    const score =
      defaultFactors.userImpact * weights.userImpact +
      defaultFactors.revenueImpact * weights.revenueImpact +
      defaultFactors.securityImpact * weights.securityImpact +
      defaultFactors.maintenanceImpact * weights.maintenanceImpact +
      defaultFactors.velocityImpact * weights.velocityImpact;

    const assessment: BusinessImpactAssessment = {
      issueId: issue.id,
      score,
      factors: defaultFactors,
      affectedUsers,
      estimatedCost,
      notes,
    };

    this.impactAssessments.set(issue.id, assessment);
    return assessment;
  }

  /**
   * Prioritize debt items
   */
  prioritizeDebt(
    items: DebtItem[],
    strategy: PrioritizedDebt['strategy'] = 'balanced'
  ): PrioritizedDebt {
    const sortedItems = [...items].sort((a, b) => {
      switch (strategy) {
        case 'impact':
          return b.businessImpact - a.businessImpact;
        case 'effort':
          return a.effortMinutes - b.effortMinutes;
        case 'age':
          return b.ageDays - a.ageDays;
        case 'balanced':
        default:
          // Balanced: high impact, low effort, considering age
          const scoreA = this.calculateBalancedScore(a);
          const scoreB = this.calculateBalancedScore(b);
          return scoreB - scoreA;
      }
    });

    const high: DebtItem[] = [];
    const medium: DebtItem[] = [];
    const low: DebtItem[] = [];

    for (const item of sortedItems) {
      if (item.priority === 'critical' || item.priority === 'high') {
        high.push(item);
      } else if (item.priority === 'medium') {
        medium.push(item);
      } else {
        low.push(item);
      }
    }

    const totalMinutes = items.reduce((sum, item) => sum + item.effortMinutes, 0);

    return {
      high,
      medium,
      low,
      totalMinutes,
      strategy,
    };
  }

  /**
   * Forecast debt trends
   */
  forecastDebt(
    currentMetrics: TechnicalDebtMetrics,
    historicalData: DebtTrendPoint[],
    forecastDays: number = 90
  ): DebtForecast {
    const now = new Date();
    const endDate = new Date(now.getTime() + forecastDays * 24 * 60 * 60 * 1000);

    // Calculate growth rate from historical data
    const growthRate = this.calculateGrowthRate(historicalData);

    // Generate predictions
    const predictions: DebtForecast['predictions'] = [];
    const daysToPredict = forecastDays;
    const currentDebt = currentMetrics.totalMinutes;

    for (let day = 0; day <= daysToPredict; day += 7) {
      // Weekly predictions
      const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
      const predictedDebt = currentDebt * Math.pow(1 + growthRate / 100, day / 30);
      
      // Confidence decreases over time
      const confidence = Math.max(0.3, 1 - (day / daysToPredict) * 0.7);

      predictions.push({
        date,
        predictedDebt,
        confidence,
      });
    }

    // Determine trend
    let trend: DebtForecast['trend'] = 'stable';
    if (growthRate > 5) {
      trend = 'increasing';
    } else if (growthRate < -5) {
      trend = 'decreasing';
    }

    // Generate recommendations
    const recommendations = this.generateForecastRecommendations(trend, growthRate, currentDebt);

    return {
      period: {
        start: now,
        end: endDate,
      },
      predictions,
      trend,
      growthRate,
      recommendations,
    };
  }

  /**
   * Create a debt reduction plan
   */
  createReductionPlan(
    targetReduction: number,
    timelineDays: number,
    _availableCapacityHours: number
  ): DebtReductionPlan {
    const allItems = Array.from(this.debtItems.values());
    const prioritized = this.prioritizeDebt(allItems, 'balanced');

    // Select items that fit within the target reduction
    const selectedItems: DebtItem[] = [];
    let totalReduction = 0;

    for (const item of [...prioritized.high, ...prioritized.medium]) {
      if (totalReduction + item.effortMinutes <= targetReduction) {
        selectedItems.push(item);
        totalReduction += item.effortMinutes;
      }
    }

    const requiredCapacity = (totalReduction / 60) / (timelineDays / 7); // Hours per week
    const estimatedCompletion = new Date(Date.now() + timelineDays * 24 * 60 * 60 * 1000);

    // Calculate ROI (simplified)
    const expectedROI = this.calculateROI(selectedItems, timelineDays);

    return {
      id: this.generateId('plan'),
      name: `Debt Reduction Plan - ${new Date().toISOString().split('T')[0]}`,
      targetReduction,
      timelineDays,
      items: selectedItems,
      estimatedCompletion,
      requiredCapacity,
      expectedROI,
    };
  }

  /**
   * Get debt trend history
   */
  getTrendHistory(): DebtTrendPoint[] {
    return [...this.trendHistory];
  }

  /**
   * Get all debt items
   */
  getAllDebtItems(): DebtItem[] {
    return Array.from(this.debtItems.values());
  }

  /**
   * Get debt item by ID
   */
  getDebtItem(id: string): DebtItem | undefined {
    return this.debtItems.get(id);
  }

  /**
   * Get business impact assessment
   */
  getImpactAssessment(issueId: string): BusinessImpactAssessment | undefined {
    return this.impactAssessments.get(issueId);
  }

  /**
   * Private helper methods
   */

  private createDebtItem(issue: EnterpriseCodeIssue): DebtItem {
    const effortMinutes = this.estimateEffort(issue);
    const businessImpact = this.calculateBusinessImpact(issue);
    const category = this.categorizeDebt(issue);
    const identifiedAt = issue.firstDetected || new Date();
    const ageDays = Math.floor((Date.now() - identifiedAt.getTime()) / (1000 * 60 * 60 * 24));
    const interestRate = this.calculateInterestRate(category, ageDays);

    // Determine priority based on impact and effort
    let priority: Priority = 'medium';
    if (businessImpact > 70 || issue.priority === 'critical') {
      priority = 'critical';
    } else if (businessImpact > 50 || issue.priority === 'high') {
      priority = 'high';
    } else if (businessImpact < 30) {
      priority = 'low';
    }

    return {
      id: `debt-${issue.id}`,
      issue,
      effortMinutes,
      businessImpact,
      priority,
      category,
      identifiedAt,
      ageDays,
      interestRate,
    };
  }

  private estimateEffort(issue: EnterpriseCodeIssue): number {
    // Base effort by issue type
    const baseEffort: Record<string, number> = {
      unused_import: 5,
      unused_variable: 10,
      dead_function: 30,
      dead_export: 20,
      circular_dependency: 60,
      complexity: 45,
      security: 90,
      accessibility: 30,
      performance: 60,
      duplication: 40,
    };

    const base = baseEffort[issue.type] || 15;

    // Adjust by priority
    const priorityMultiplier: Record<string, number> = {
      critical: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 0.8,
    };

    const multiplier = priorityMultiplier[issue.priority || 'medium'] || 1.0;

    return Math.round(base * multiplier);
  }

  private calculateBusinessImpact(issue: EnterpriseCodeIssue): number {
    // Check if we have a stored assessment
    const assessment = this.impactAssessments.get(issue.id);
    if (assessment) {
      return assessment.score;
    }

    // Default impact calculation based on issue properties
    let impact = 50; // Base impact

    // Adjust by priority
    if (issue.priority === 'critical') {
      impact += 30;
    } else if (issue.priority === 'high') {
      impact += 20;
    } else if (issue.priority === 'low') {
      impact -= 20;
    }

    // Adjust by type
    const typeImpact: Record<string, number> = {
      security: 30,
      performance: 20,
      reliability: 20,
      accessibility: 15,
      maintainability: 10,
    };

    const category = this.categorizeDebt(issue);
    impact += typeImpact[category] || 0;

    return Math.max(0, Math.min(100, impact));
  }

  private categorizeDebt(issue: EnterpriseCodeIssue): DebtCategory {
    const typeMapping: Record<string, DebtCategory> = {
      security: 'security',
      performance: 'performance',
      accessibility: 'maintainability',
      complexity: 'complexity',
      duplication: 'duplication',
      circular_dependency: 'maintainability',
      unused_import: 'maintainability',
      unused_variable: 'maintainability',
      dead_function: 'maintainability',
      dead_export: 'maintainability',
    };

    return typeMapping[issue.type] || 'maintainability';
  }

  private calculateInterestRate(category: DebtCategory, ageDays: number): number {
    // Interest rate: how much the debt "costs" over time
    const baseRates: Record<DebtCategory, number> = {
      security: 0.05, // 5% per month
      performance: 0.03,
      reliability: 0.04,
      maintainability: 0.02,
      complexity: 0.025,
      duplication: 0.02,
      testing: 0.015,
    };

    const baseRate = baseRates[category] || 0.02;
    
    // Increase rate for older debt
    const ageMultiplier = 1 + (ageDays / 365) * 0.5;
    
    return baseRate * ageMultiplier;
  }

  private calculateBalancedScore(item: DebtItem): number {
    // Balanced score: high impact, low effort, considering age
    const impactScore = item.businessImpact;
    const effortScore = Math.max(0, 100 - (item.effortMinutes / 120) * 100); // Normalize effort
    const ageScore = Math.min(100, (item.ageDays / 90) * 50); // Age bonus up to 50 points

    return impactScore * 0.5 + effortScore * 0.3 + ageScore * 0.2;
  }

  private calculateTrendDirection(current: number, previous: number): 'improving' | 'stable' | 'degrading' {
    const change = ((current - previous) / previous) * 100;
    
    if (change < -5) {
      return 'improving';
    } else if (change > 5) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  private recordTrendPoint(totalDebt: number, items: DebtItem[]): void {
    const byCategory: Record<DebtCategory, number> = {
      security: 0,
      performance: 0,
      maintainability: 0,
      reliability: 0,
      duplication: 0,
      complexity: 0,
      testing: 0,
    };

    for (const item of items) {
      byCategory[item.category] += item.effortMinutes;
    }

    const averageAge = items.length > 0
      ? items.reduce((sum, item) => sum + item.ageDays, 0) / items.length
      : 0;

    this.trendHistory.push({
      timestamp: new Date(),
      totalDebt,
      byCategory,
      itemCount: items.length,
      averageAge,
    });

    // Keep only last 100 points
    if (this.trendHistory.length > 100) {
      this.trendHistory.shift();
    }
  }

  private calculateGrowthRate(historicalData: DebtTrendPoint[]): number {
    if (historicalData.length < 2) {
      return 0;
    }

    const recent = historicalData[historicalData.length - 1];
    const older = historicalData[0];

    if (!recent || !older || older.totalDebt === 0) {
      return 0;
    }

    const daysDiff = (recent.timestamp.getTime() - older.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const debtChange = recent.totalDebt - older.totalDebt;
    const percentChange = (debtChange / older.totalDebt) * 100;

    // Normalize to monthly rate
    return (percentChange / daysDiff) * 30;
  }

  private generateForecastRecommendations(
    trend: DebtForecast['trend'],
    growthRate: number,
    currentDebt: number
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'increasing') {
      recommendations.push('Technical debt is growing. Consider allocating dedicated time for debt reduction.');
      
      if (growthRate > 10) {
        recommendations.push('Growth rate is high. Implement stricter code review processes.');
      }
      
      if (currentDebt > 1000) {
        recommendations.push('Current debt is significant. Create a debt reduction plan with specific targets.');
      }
    } else if (trend === 'stable') {
      recommendations.push('Debt is stable. Maintain current practices while addressing high-priority items.');
    } else {
      recommendations.push('Debt is decreasing. Continue current debt reduction efforts.');
    }

    return recommendations;
  }

  private calculateROI(items: DebtItem[], _timelineDays: number): number {
    // Simplified ROI calculation
    const totalEffort = items.reduce((sum, item) => sum + item.effortMinutes, 0);
    const totalImpact = items.reduce((sum, item) => sum + item.businessImpact, 0);
    
    // ROI = (Impact - Effort) / Effort
    // Normalize to percentage
    const roi = ((totalImpact - (totalEffort / 10)) / (totalEffort / 10)) * 100;
    
    return Math.round(roi);
  }

  private prioritizeDebtItems(items: DebtItem[]): DebtPriority[] {
    const sorted = [...items].sort((a, b) => {
      const scoreA = this.calculateBalancedScore(a);
      const scoreB = this.calculateBalancedScore(b);
      return scoreB - scoreA;
    });

    return sorted.slice(0, 10).map(item => ({
      issueId: item.issue.id,
      score: this.calculateBalancedScore(item),
      effort: item.effortMinutes,
      impact: item.issue.businessImpact || {
        category: 'maintainability',
        severity: 'medium',
        riskLevel: 'medium',
      },
    }));
  }

  private mapCategoryToBreakdown(category: DebtCategory): keyof TechnicalDebtMetrics['breakdown'] | null {
    const mapping: Record<DebtCategory, keyof TechnicalDebtMetrics['breakdown'] | null> = {
      security: 'security',
      performance: 'performance',
      maintainability: 'maintainability',
      reliability: 'reliability',
      duplication: 'duplications',
      complexity: 'maintainability',
      testing: 'reliability',
    };

    return mapping[category] || null;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
