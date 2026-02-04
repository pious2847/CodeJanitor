/**
 * Tests for ML Model Framework
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MLModelFramework, TrainingData } from '../MLModelFramework';
import { QualityMetrics } from '../../models/types';

describe('MLModelFramework', () => {
  let framework: MLModelFramework;

  beforeEach(() => {
    framework = new MLModelFramework();
  });

  describe('Code Smell Model', () => {
    it('should train a code smell classification model', async () => {
      const trainingData: TrainingData[] = [
        { features: [15, 200, 15, 20, 5, 3, 0.1], label: 1 }, // High complexity - smell
        { features: [5, 50, 5, 8, 2, 0, 0.3], label: 0 },     // Low complexity - no smell
        { features: [20, 300, 20, 25, 6, 5, 0.05], label: 1 }, // High complexity - smell
        { features: [3, 30, 3, 5, 1, 0, 0.4], label: 0 },     // Low complexity - no smell
      ];

      const model = await framework.trainCodeSmellModel(trainingData);

      expect(model).toBeDefined();
      expect(model.type).toBe('code_smell_classifier');
      expect(model.weights).toBeDefined();
      expect(model.weights.length).toBeGreaterThan(0);
      expect(model.featureNames).toContain('complexity');
    });

    it('should predict code smells from metrics', async () => {
      const trainingData: TrainingData[] = [
        { features: [15, 200, 15, 20, 5, 3, 0.1], label: 1 },
        { features: [5, 50, 5, 8, 2, 0, 0.3], label: 0 },
      ];

      const model = await framework.trainCodeSmellModel(trainingData);

      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 15,
          cognitiveComplexity: 20,
          maxNestingDepth: 5,
          maxParameters: 4,
          linesOfCode: 200,
        },
        maintainability: {
          maintainabilityIndex: 50,
          duplications: 3,
          commentDensity: 0.1,
          avgFunctionLength: 25,
        },
        security: {
          vulnerabilities: 0,
          secrets: 0,
          riskScore: 10,
        },
        performance: {
          antiPatterns: 0,
          impactScore: 0,
        },
        testability: {
          coverage: 70,
          untestedFunctions: 2,
          testabilityScore: 75,
        },
      };

      const patterns = await framework.predictCodeSmells(model.id, metrics, 'test.ts');

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('Bug Prediction Model', () => {
    it('should train a bug prediction model', async () => {
      const trainingData: TrainingData[] = [
        { features: [20, 15, 8, 500, 30, 10, 730], label: 1 }, // Bug-prone
        { features: [5, 2, 2, 50, 80, 1, 30], label: 0 },      // Not bug-prone
        { features: [18, 12, 6, 400, 40, 8, 600], label: 1 },  // Bug-prone
        { features: [4, 3, 3, 60, 75, 2, 60], label: 0 },      // Not bug-prone
      ];

      const model = await framework.trainBugPredictionModel(trainingData);

      expect(model).toBeDefined();
      expect(model.type).toBe('bug_predictor');
      expect(model.weights).toBeDefined();
      expect(model.featureNames).toContain('complexity');
      expect(model.featureNames).toContain('testCoverage');
    });

    it('should predict bug-prone areas', async () => {
      const trainingData: TrainingData[] = [
        { features: [20, 15, 8, 500, 30, 10, 730], label: 1 },
        { features: [5, 2, 2, 50, 80, 1, 30], label: 0 },
      ];

      const model = await framework.trainBugPredictionModel(trainingData);

      const metrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 18,
          cognitiveComplexity: 22,
          maxNestingDepth: 5,
          maxParameters: 5,
          linesOfCode: 300,
        },
        maintainability: {
          maintainabilityIndex: 45,
          duplications: 4,
          commentDensity: 0.15,
          avgFunctionLength: 30,
        },
        security: {
          vulnerabilities: 2,
          secrets: 0,
          riskScore: 25,
        },
        performance: {
          antiPatterns: 1,
          impactScore: 15,
        },
        testability: {
          coverage: 35,
          untestedFunctions: 8,
          testabilityScore: 40,
        },
      };

      const prediction = await framework.predictBugProneAreas(
        model.id,
        'test.ts',
        metrics,
        12, // changeFrequency
        5,  // authorCount
        400, // linesChanged
        600  // codeAge
      );

      expect(prediction).toBeDefined();
      expect(prediction.filePath).toBe('test.ts');
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(prediction.riskLevel);
      expect(Array.isArray(prediction.factors)).toBe(true);
      expect(Array.isArray(prediction.recommendations)).toBe(true);
    });
  });

  describe('Anomaly Detection Model', () => {
    it('should train an anomaly detection model', async () => {
      const trainingData: TrainingData[] = [
        { features: [10, 5, 0.2, 75], label: 0 },
        { features: [12, 6, 0.25, 78], label: 0 },
        { features: [9, 4, 0.18, 72], label: 0 },
        { features: [11, 5, 0.22, 76], label: 0 },
      ];

      const model = await framework.trainAnomalyDetectionModel(trainingData);

      expect(model).toBeDefined();
      expect(model.type).toBe('anomaly_detector');
      expect(model.weights).toBeDefined();
      expect(model.weights.length).toBeGreaterThan(0);
    });

    it('should detect anomalies in metrics', async () => {
      const trainingData: TrainingData[] = [
        { features: [10, 5, 0.2, 75], label: 0 },
        { features: [12, 6, 0.25, 78], label: 0 },
        { features: [9, 4, 0.18, 72], label: 0 },
        { features: [11, 5, 0.22, 76], label: 0 },
      ];

      const model = await framework.trainAnomalyDetectionModel(trainingData);

      const currentMetrics: QualityMetrics = {
        complexity: {
          cyclomaticComplexity: 50, // Anomalously high
          cognitiveComplexity: 60,
          maxNestingDepth: 8,
          maxParameters: 6,
          linesOfCode: 400,
        },
        maintainability: {
          maintainabilityIndex: 30,
          duplications: 10,
          commentDensity: 0.05,
          avgFunctionLength: 50,
        },
        security: {
          vulnerabilities: 5,
          secrets: 1,
          riskScore: 70,
        },
        performance: {
          antiPatterns: 3,
          impactScore: 40,
        },
        testability: {
          coverage: 20, // Anomalously low
          untestedFunctions: 15,
          testabilityScore: 25,
        },
      };

      const anomalies = await framework.detectAnomalies(model.id, currentMetrics);

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe('Model Evaluation', () => {
    it('should evaluate model performance', async () => {
      const trainingData: TrainingData[] = [
        { features: [15, 200, 15, 20, 5, 3, 0.1], label: 1 },
        { features: [5, 50, 5, 8, 2, 0, 0.3], label: 0 },
        { features: [20, 300, 20, 25, 6, 5, 0.05], label: 1 },
        { features: [3, 30, 3, 5, 1, 0, 0.4], label: 0 },
      ];

      const model = await framework.trainCodeSmellModel(trainingData);

      const testData: TrainingData[] = [
        { features: [18, 250, 18, 22, 5, 4, 0.08], label: 1 },
        { features: [4, 40, 4, 6, 1, 0, 0.35], label: 0 },
      ];

      const evaluation = await framework.evaluateModel(model.id, testData);

      expect(evaluation).toBeDefined();
      expect(evaluation.accuracy).toBeGreaterThanOrEqual(0);
      expect(evaluation.accuracy).toBeLessThanOrEqual(1);
      expect(evaluation.precision).toBeGreaterThanOrEqual(0);
      expect(evaluation.precision).toBeLessThanOrEqual(1);
      expect(evaluation.recall).toBeGreaterThanOrEqual(0);
      expect(evaluation.recall).toBeLessThanOrEqual(1);
      expect(evaluation.f1Score).toBeGreaterThanOrEqual(0);
      expect(evaluation.f1Score).toBeLessThanOrEqual(1);
    });
  });

  describe('Model Management', () => {
    it('should list all trained models', async () => {
      const trainingData: TrainingData[] = [
        { features: [15, 200, 15, 20, 5, 3, 0.1], label: 1 },
        { features: [5, 50, 5, 8, 2, 0, 0.3], label: 0 },
      ];

      await framework.trainCodeSmellModel(trainingData);
      await framework.trainBugPredictionModel(trainingData);

      const models = framework.listModels();

      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve a specific model', async () => {
      const trainingData: TrainingData[] = [
        { features: [15, 200, 15, 20, 5, 3, 0.1], label: 1 },
        { features: [5, 50, 5, 8, 2, 0, 0.3], label: 0 },
      ];

      const trainedModel = await framework.trainCodeSmellModel(trainingData);
      const retrievedModel = framework.getModel(trainedModel.id);

      expect(retrievedModel).toBeDefined();
      expect(retrievedModel?.id).toBe(trainedModel.id);
      expect(retrievedModel?.type).toBe('code_smell_classifier');
    });
  });
});
