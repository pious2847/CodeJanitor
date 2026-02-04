/**
 * Machine Learning Model Framework
 * 
 * Provides training pipeline for code smell pattern recognition,
 * bug prediction models, and anomaly detection.
 */

import { QualityMetrics } from '../models/types';

/**
 * Training data for ML models
 */
export interface TrainingData {
  /** Input features */
  features: number[];
  /** Expected output/label */
  label: number | string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Model input for predictions
 */
export interface ModelInput {
  /** Feature vector */
  features: number[];
  /** Optional context */
  context?: Record<string, any>;
}

/**
 * Prediction result
 */
export interface Prediction {
  /** Predicted value */
  value: number | string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Additional prediction metadata */
  metadata?: Record<string, any>;
}

/**
 * Model evaluation metrics
 */
export interface ModelEvaluation {
  /** Accuracy score (0-1) */
  accuracy: number;
  /** Precision score (0-1) */
  precision: number;
  /** Recall score (0-1) */
  recall: number;
  /** F1 score (0-1) */
  f1Score: number;
  /** Confusion matrix */
  confusionMatrix?: number[][];
}

/**
 * Trained ML model
 */
export interface Model {
  /** Model identifier */
  id: string;
  /** Model type */
  type: ModelType;
  /** Model version */
  version: string;
  /** Training date */
  trainedAt: Date;
  /** Model parameters */
  parameters: Record<string, any>;
  /** Model weights/coefficients */
  weights: number[];
  /** Feature names */
  featureNames: string[];
}

/**
 * Model types
 */
export type ModelType = 
  | 'code_smell_classifier'
  | 'bug_predictor'
  | 'anomaly_detector'
  | 'complexity_predictor';

/**
 * Code smell pattern
 */
export interface CodeSmellPattern {
  /** Pattern identifier */
  id: string;
  /** Pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** Confidence score */
  confidence: number;
  /** File path */
  filePath: string;
  /** Line number */
  line: number;
  /** Suggested refactoring */
  suggestedRefactoring?: string;
}

/**
 * Bug prediction result
 */
export interface BugPrediction {
  /** File path */
  filePath: string;
  /** Bug probability (0-1) */
  probability: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Contributing factors */
  factors: string[];
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Anomaly detection result
 */
export interface Anomaly {
  /** Metric name */
  metric: string;
  /** Current value */
  currentValue: number;
  /** Expected value */
  expectedValue: number;
  /** Deviation percentage */
  deviation: number;
  /** Severity */
  severity: 'low' | 'medium' | 'high';
  /** Timestamp */
  timestamp: Date;
  /** Description */
  description: string;
}

/**
 * ML Model Framework Service
 */
export class MLModelFramework {
  private models: Map<string, Model> = new Map();
  private trainingHistory: Map<string, TrainingData[]> = new Map();

  /**
   * Train a model for code smell pattern recognition
   */
  async trainCodeSmellModel(trainingData: TrainingData[]): Promise<Model> {
    // Extract features and labels
    const features = trainingData.map(d => d.features);
    const labels = trainingData.map(d => d.label);

    // Simple logistic regression implementation
    const weights = this.trainLogisticRegression(features, labels);

    const model: Model = {
      id: `code-smell-${Date.now()}`,
      type: 'code_smell_classifier',
      version: '1.0.0',
      trainedAt: new Date(),
      parameters: {
        learningRate: 0.01,
        iterations: 1000,
        regularization: 0.1,
      },
      weights,
      featureNames: [
        'complexity',
        'linesOfCode',
        'cyclomaticComplexity',
        'cognitiveComplexity',
        'nestingDepth',
        'duplications',
        'commentDensity',
      ],
    };

    this.models.set(model.id, model);
    this.trainingHistory.set(model.id, trainingData);

    return model;
  }

  /**
   * Train a bug prediction model
   */
  async trainBugPredictionModel(trainingData: TrainingData[]): Promise<Model> {
    const features = trainingData.map(d => d.features);
    const labels = trainingData.map(d => d.label);

    // Train using gradient boosting approach (simplified)
    const weights = this.trainGradientBoosting(features, labels);

    const model: Model = {
      id: `bug-predictor-${Date.now()}`,
      type: 'bug_predictor',
      version: '1.0.0',
      trainedAt: new Date(),
      parameters: {
        numTrees: 100,
        maxDepth: 5,
        learningRate: 0.1,
      },
      weights,
      featureNames: [
        'complexity',
        'changeFrequency',
        'authorCount',
        'linesChanged',
        'testCoverage',
        'issueCount',
        'codeAge',
      ],
    };

    this.models.set(model.id, model);
    this.trainingHistory.set(model.id, trainingData);

    return model;
  }

  /**
   * Train an anomaly detection model
   */
  async trainAnomalyDetectionModel(trainingData: TrainingData[]): Promise<Model> {
    const features = trainingData.map(d => d.features);

    // Calculate statistical parameters for anomaly detection
    const means = this.calculateMeans(features);
    const stdDevs = this.calculateStdDevs(features, means);

    const model: Model = {
      id: `anomaly-detector-${Date.now()}`,
      type: 'anomaly_detector',
      version: '1.0.0',
      trainedAt: new Date(),
      parameters: {
        threshold: 3.0, // 3 standard deviations
        windowSize: 10,
      },
      weights: [...means, ...stdDevs],
      featureNames: [
        'complexity',
        'issueCount',
        'changeRate',
        'testCoverage',
      ],
    };

    this.models.set(model.id, model);
    this.trainingHistory.set(model.id, trainingData);

    return model;
  }

  /**
   * Predict code smells using trained model
   */
  async predictCodeSmells(
    modelId: string,
    metrics: QualityMetrics,
    filePath: string
  ): Promise<CodeSmellPattern[]> {
    const model = this.models.get(modelId);
    if (!model || model.type !== 'code_smell_classifier') {
      throw new Error('Invalid or missing code smell model');
    }

    // Extract features from metrics
    const features = [
      metrics.complexity.cyclomaticComplexity,
      metrics.complexity.linesOfCode,
      metrics.complexity.cyclomaticComplexity,
      metrics.complexity.cognitiveComplexity,
      metrics.complexity.maxNestingDepth,
      metrics.maintainability.duplications,
      metrics.maintainability.commentDensity,
    ];

    // Make prediction
    const prediction = this.predictWithLogisticRegression(features, model.weights);

    const patterns: CodeSmellPattern[] = [];

    // Identify specific code smells based on prediction
    if (prediction.confidence > 0.7) {
      if (metrics.complexity.cyclomaticComplexity > 10) {
        patterns.push({
          id: `smell-complexity-${filePath}`,
          name: 'High Complexity',
          description: 'Function or class has high cyclomatic complexity',
          confidence: prediction.confidence,
          filePath,
          line: 1,
          suggestedRefactoring: 'Break down into smaller functions',
        });
      }

      if (metrics.complexity.maxNestingDepth > 4) {
        patterns.push({
          id: `smell-nesting-${filePath}`,
          name: 'Deep Nesting',
          description: 'Code has excessive nesting depth',
          confidence: prediction.confidence,
          filePath,
          line: 1,
          suggestedRefactoring: 'Extract nested logic into separate functions',
        });
      }

      if (metrics.maintainability.duplications > 5) {
        patterns.push({
          id: `smell-duplication-${filePath}`,
          name: 'Code Duplication',
          description: 'Duplicate code blocks detected',
          confidence: prediction.confidence,
          filePath,
          line: 1,
          suggestedRefactoring: 'Extract common code into reusable functions',
        });
      }

      if (metrics.complexity.linesOfCode > 300) {
        patterns.push({
          id: `smell-long-file-${filePath}`,
          name: 'Long File',
          description: 'File is too long and may be doing too much',
          confidence: prediction.confidence,
          filePath,
          line: 1,
          suggestedRefactoring: 'Split into multiple smaller files',
        });
      }
    }

    return patterns;
  }

  /**
   * Predict bug-prone areas
   */
  async predictBugProneAreas(
    modelId: string,
    filePath: string,
    metrics: QualityMetrics,
    changeFrequency: number,
    authorCount: number,
    linesChanged: number,
    codeAge: number
  ): Promise<BugPrediction> {
    const model = this.models.get(modelId);
    if (!model || model.type !== 'bug_predictor') {
      throw new Error('Invalid or missing bug prediction model');
    }

    // Extract features
    const features = [
      metrics.complexity.cyclomaticComplexity,
      changeFrequency,
      authorCount,
      linesChanged,
      metrics.testability.coverage,
      metrics.complexity.cyclomaticComplexity + metrics.security.vulnerabilities,
      codeAge,
    ];

    // Make prediction
    const prediction = this.predictWithGradientBoosting(features, model.weights);
    const probability = prediction.confidence;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (probability < 0.25) {
      riskLevel = 'low';
    } else if (probability < 0.5) {
      riskLevel = 'medium';
    } else if (probability < 0.75) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    // Identify contributing factors
    const factors: string[] = [];
    if (metrics.complexity.cyclomaticComplexity > 10) {
      factors.push('High complexity');
    }
    if (changeFrequency > 10) {
      factors.push('Frequent changes');
    }
    if (authorCount > 5) {
      factors.push('Multiple authors');
    }
    if (metrics.testability.coverage < 50) {
      factors.push('Low test coverage');
    }
    if (codeAge > 365) {
      factors.push('Old code');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (metrics.testability.coverage < 50) {
      recommendations.push('Increase test coverage');
    }
    if (metrics.complexity.cyclomaticComplexity > 10) {
      recommendations.push('Refactor to reduce complexity');
    }
    if (changeFrequency > 10) {
      recommendations.push('Review recent changes for potential issues');
    }

    return {
      filePath,
      probability,
      riskLevel,
      factors,
      recommendations,
    };
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(
    modelId: string,
    currentMetrics: QualityMetrics
  ): Promise<Anomaly[]> {
    const model = this.models.get(modelId);
    if (!model || model.type !== 'anomaly_detector') {
      throw new Error('Invalid or missing anomaly detection model');
    }

    const anomalies: Anomaly[] = [];

    // Extract current values
    const currentValues = [
      currentMetrics.complexity.cyclomaticComplexity,
      currentMetrics.complexity.cyclomaticComplexity + currentMetrics.security.vulnerabilities,
      0, // changeRate - would need historical data
      currentMetrics.testability.coverage,
    ];

    // Get model parameters
    const numFeatures = model.featureNames.length;
    const means = model.weights.slice(0, numFeatures);
    const stdDevs = model.weights.slice(numFeatures);
    const threshold = (model.parameters.threshold as number) || 3.0;

    // Check each metric for anomalies
    for (let i = 0; i < currentValues.length; i++) {
      const value = currentValues[i];
      const mean = means[i];
      const stdDev = stdDevs[i];
      
      if (value === undefined || mean === undefined || stdDev === undefined) {
        continue;
      }

      const zScore = stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0;

      if (zScore > threshold) {
        const deviation = ((value - mean) / mean) * 100;
        
        let severity: 'low' | 'medium' | 'high';
        if (zScore > threshold * 2) {
          severity = 'high';
        } else if (zScore > threshold * 1.5) {
          severity = 'medium';
        } else {
          severity = 'low';
        }

        anomalies.push({
          metric: model.featureNames[i] || `metric-${i}`,
          currentValue: value,
          expectedValue: mean,
          deviation,
          severity,
          timestamp: new Date(),
          description: `Unusual ${model.featureNames[i]} detected: ${value.toFixed(2)} (expected ~${mean.toFixed(2)})`,
        });
      }
    }

    return anomalies;
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(modelId: string, testData: TrainingData[]): Promise<ModelEvaluation> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    let correct = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    for (const data of testData) {
      const prediction = await this.predict(modelId, { features: data.features });
      const predicted = typeof prediction.value === 'number' 
        ? prediction.value > 0.5 ? 1 : 0
        : prediction.value;
      const actual = data.label;

      if (predicted === actual) {
        correct++;
        if (predicted === 1) {
          truePositives++;
        } else {
          trueNegatives++;
        }
      } else {
        if (predicted === 1) {
          falsePositives++;
        } else {
          falseNegatives++;
        }
      }
    }

    const accuracy = testData.length > 0 ? correct / testData.length : 0;
    const precision = (truePositives + falsePositives) > 0 
      ? truePositives / (truePositives + falsePositives) 
      : 0;
    const recall = (truePositives + falseNegatives) > 0 
      ? truePositives / (truePositives + falseNegatives) 
      : 0;
    const f1Score = (precision + recall) > 0 
      ? 2 * (precision * recall) / (precision + recall) 
      : 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: [
        [trueNegatives, falsePositives],
        [falseNegatives, truePositives],
      ],
    };
  }

  /**
   * Make a prediction using a trained model
   */
  async predict(modelId: string, input: ModelInput): Promise<Prediction> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    switch (model.type) {
      case 'code_smell_classifier':
        return this.predictWithLogisticRegression(input.features, model.weights);
      case 'bug_predictor':
        return this.predictWithGradientBoosting(input.features, model.weights);
      case 'anomaly_detector':
        return this.predictAnomaly(input.features, model.weights, model.parameters);
      default:
        throw new Error(`Unsupported model type: ${model.type}`);
    }
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): Model | undefined {
    return this.models.get(modelId);
  }

  /**
   * List all trained models
   */
  listModels(): Model[] {
    return Array.from(this.models.values());
  }

  /**
   * Private helper methods
   */

  private trainLogisticRegression(features: number[][], labels: (number | string)[]): number[] {
    const numFeatures = features[0]?.length || 0;
    const weights = new Array(numFeatures + 1).fill(0); // +1 for bias
    const learningRate = 0.01;
    const iterations = 1000;

    // Convert labels to binary
    const binaryLabels = labels.map(l => (typeof l === 'number' ? l : l === 'positive' ? 1 : 0));

    // Gradient descent
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < features.length; i++) {
        const x = features[i];
        const y = binaryLabels[i];
        
        if (!x || y === undefined) continue;

        // Calculate prediction
        const prediction = this.sigmoid(this.dotProduct([1, ...x], weights));

        // Update weights
        weights[0] -= learningRate * (prediction - y);
        for (let j = 0; j < x.length; j++) {
          weights[j + 1] -= learningRate * (prediction - y) * x[j]!;
        }
      }
    }

    return weights;
  }

  private trainGradientBoosting(features: number[][], labels: (number | string)[]): number[] {
    // Simplified gradient boosting - using weighted average approach
    const numFeatures = features[0]?.length || 0;
    const weights = new Array(numFeatures).fill(0);

    const binaryLabels = labels.map(l => (typeof l === 'number' ? l : l === 'positive' ? 1 : 0));

    // Calculate feature importance
    for (let j = 0; j < numFeatures; j++) {
      let correlation = 0;
      for (let i = 0; i < features.length; i++) {
        const x = features[i];
        const y = binaryLabels[i];
        if (x && y !== undefined) {
          correlation += (x[j] || 0) * y;
        }
      }
      weights[j] = correlation / features.length;
    }

    return weights;
  }

  private calculateMeans(features: number[][]): number[] {
    const numFeatures = features[0]?.length || 0;
    const means = new Array(numFeatures).fill(0);

    for (const feature of features) {
      for (let i = 0; i < numFeatures; i++) {
        means[i] += (feature[i] || 0) / features.length;
      }
    }

    return means;
  }

  private calculateStdDevs(features: number[][], means: number[]): number[] {
    const numFeatures = features[0]?.length || 0;
    const variances = new Array(numFeatures).fill(0);

    for (const feature of features) {
      for (let i = 0; i < numFeatures; i++) {
        const diff = (feature[i] || 0) - means[i]!;
        variances[i] += (diff * diff) / features.length;
      }
    }

    return variances.map(v => Math.sqrt(v));
  }

  private predictWithLogisticRegression(features: number[], weights: number[]): Prediction {
    const score = this.sigmoid(this.dotProduct([1, ...features], weights));
    
    return {
      value: score > 0.5 ? 1 : 0,
      confidence: Math.abs(score - 0.5) * 2, // Convert to 0-1 range
    };
  }

  private predictWithGradientBoosting(features: number[], weights: number[]): Prediction {
    const score = this.dotProduct(features, weights);
    const probability = this.sigmoid(score);
    
    return {
      value: probability,
      confidence: probability,
    };
  }

  private predictAnomaly(features: number[], weights: number[], parameters: Record<string, any>): Prediction {
    const numFeatures = features.length;
    const means = weights.slice(0, numFeatures);
    const stdDevs = weights.slice(numFeatures);
    const threshold = (parameters.threshold as number) || 3.0;

    let maxZScore = 0;
    for (let i = 0; i < features.length; i++) {
      const mean = means[i];
      const stdDev = stdDevs[i];
      if (mean !== undefined && stdDev !== undefined && stdDev > 0) {
        const zScore = Math.abs((features[i]! - mean) / stdDev);
        maxZScore = Math.max(maxZScore, zScore);
      }
    }

    const isAnomaly = maxZScore > threshold;
    
    return {
      value: isAnomaly ? 1 : 0,
      confidence: Math.min(1, maxZScore / threshold),
    };
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    const minLength = Math.min(a.length, b.length);
    for (let i = 0; i < minLength; i++) {
      sum += (a[i] || 0) * (b[i] || 0);
    }
    return sum;
  }
}
