import { createLogger } from '../utils/logger';
import { query } from '../utils/db';
import { identityManager } from './identity-manager';
import { attestationService } from './attestation-service';
import {
  TrustScoreCalculation,
  AnomalyDetectionResult,
  AnomalyType,
  AnomalySeverity,
  AnomalyIndicator,
  WebSocketMessageType
} from '../models';
import { Agent, AgentActivity, ActivityType } from '../models/agent';
import { AttestationType } from '../models/attestation';
import { calculateStandardDeviation, calculateZScore, clamp, calculateMovingAverage } from '../utils';
import { generateId } from '../utils/crypto';

const logger = createLogger('trust-engine');

export class TrustEngine {
  private decayRate: number;
  private boostRate: number;
  private anomalyThreshold: number;

  constructor() {
    this.decayRate = parseFloat(process.env.TRUST_DECAY_RATE || '0.05');
    this.boostRate = parseFloat(process.env.TRUST_BOOST_RATE || '0.1');
    this.anomalyThreshold = parseFloat(process.env.ANOMALY_THRESHOLD || '0.7');
  }

  async calculateTrustScore(agentId: string): Promise<TrustScoreCalculation> {
    const agent = await identityManager.getAgent(agentId);
    const now = new Date();

    // Get attestations for this agent
    const { attestations } = await attestationService.listAttestations(
      { subject: agent.did, validOnly: true },
      { page: 1, limit: 100 }
    );

    // Get agent activity
    const activities = await identityManager.getAgentActivity(agentId, 100);

    // Get relationships
    const relationships = await identityManager.getRelationships(agentId);

    // Calculate base score
    let baseScore = 0.5; // Start neutral

    // Attestation score (0-0.3)
    const attestationScore = this.calculateAttestationScore(attestations);
    baseScore += attestationScore * 0.3;

    // Activity score (0-0.2)
    const activityScore = this.calculateActivityScore(activities);
    baseScore += activityScore * 0.2;

    // Relationship score (0-0.2)
    const relationshipScore = this.calculateRelationshipScore(relationships);
    baseScore += relationshipScore * 0.2;

    // Age score (0-0.1) - older agents are more trusted
    const ageScore = this.calculateAgeScore(agent.createdAt);
    baseScore += ageScore * 0.1;

    // Reputation score (0-0.2)
    const reputationScore = this.calculateReputationScore(agent.reputation);
    baseScore += reputationScore * 0.2;

    // Apply decay/boost based on recent activity
    const recencyWeight = this.calculateRecencyWeight(activities);
    const anomalyPenalty = await this.calculateAnomalyPenalty(agentId);

    // Calculate final score
    let finalScore = baseScore;
    if (recencyWeight > 0.5) {
      finalScore += this.boostRate * recencyWeight;
    } else {
      finalScore -= this.decayRate * (0.5 - recencyWeight);
    }

    // Apply anomaly penalty
    finalScore -= anomalyPenalty;

    // Clamp between 0 and 1
    finalScore = clamp(finalScore, 0, 1);

    const calculation: TrustScoreCalculation = {
      agentId,
      baseScore,
      attestations: attestations.length,
      positiveInteractions: activities.filter(
        (a) =>
          a.activityType === ActivityType.CAPABILITY_GRANTED ||
          a.activityType === ActivityType.ATTESTATION_VERIFIED
      ).length,
      negativeInteractions: activities.filter(
        (a) =>
          a.activityType === ActivityType.ANOMALY_DETECTED ||
          a.activityType === ActivityType.CAPABILITY_REVOKED
      ).length,
      recencyWeight,
      anomalyPenalty,
      finalScore
    };

    // Store trust score
    await this.storeTrustScore(calculation);

    // Update agent trust score
    await query('UPDATE agents SET trust_score = $1 WHERE id = $2', [
      finalScore,
      agentId
    ]);

    logger.info('Trust score calculated', { agentId, score: finalScore });

    return calculation;
  }

  async detectAnomalies(agentId: string): Promise<AnomalyDetectionResult[]> {
    const agent = await identityManager.getAgent(agentId);
    const activities = await identityManager.getAgentActivity(agentId, 200);
    const relationships = await identityManager.getRelationships(agentId);

    const anomalies: AnomalyDetectionResult[] = [];

    // Check for unusual access patterns
    const accessAnomaly = this.detectAccessPatternAnomalies(agent, activities);
    if (accessAnomaly) anomalies.push(accessAnomaly);

    // Check for trust manipulation
    const trustAnomaly = this.detectTrustManipulation(agent, activities);
    if (trustAnomaly) anomalies.push(trustAnomaly);

    // Check for capability escalation
    const escalationAnomaly = this.detectCapabilityEscalation(agent, activities);
    if (escalationAnomaly) anomalies.push(escalationAnomaly);

    // Check for collusion patterns
    const collusionAnomaly = this.detectCollusionPatterns(agent, relationships);
    if (collusionAnomaly) anomalies.push(collusionAnomaly);

    // Check for behavior deviation
    const behaviorAnomaly = await this.detectBehaviorDeviation(agent, activities);
    if (behaviorAnomaly) anomalies.push(behaviorAnomaly);

    // Store anomalies
    for (const anomaly of anomalies) {
      await this.storeAnomaly(anomaly);
    }

    return anomalies;
  }

  async getTrustHistory(
    agentId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; score: number }>> {
    const result = await query<{ calculated_at: Date; score: number }>(
      `SELECT calculated_at, score FROM trust_scores 
       WHERE agent_id = $1 
       AND calculated_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
       ORDER BY calculated_at ASC`,
      [agentId]
    );

    return result.rows.map((row) => ({
      date: row.calculated_at,
      score: parseFloat(row.score as unknown as string)
    }));
  }

  async getAnomalyHistory(
    agentId: string,
    resolved?: boolean
  ): Promise<AnomalyDetectionResult[]> {
    let sql = 'SELECT * FROM anomalies WHERE agent_id = $1';
    const params: unknown[] = [agentId];

    if (resolved !== undefined) {
      sql += resolved
        ? ' AND resolved_at IS NOT NULL'
        : ' AND resolved_at IS NULL';
    }

    sql += ' ORDER BY detected_at DESC';

    const result = await query<AnomalyDetectionResult>(sql, params);
    return result.rows.map(this.mapAnomalyFromDb);
  }

  async resolveAnomaly(
    anomalyId: string,
    resolution: string
  ): Promise<void> {
    await query(
      'UPDATE anomalies SET resolved_at = CURRENT_TIMESTAMP WHERE id = $1',
      [anomalyId]
    );
    logger.info('Anomaly resolved', { anomalyId, resolution });
  }

  private calculateAttestationScore(attestations: Array<{ type: AttestationType }>): number {
    if (attestations.length === 0) return 0.5;

    let score = 0.5;
    const trustAttestations = attestations.filter(
      (a) => a.type === AttestationType.TRUST_ASSERTION
    );
    const identityAttestations = attestations.filter(
      (a) => a.type === AttestationType.IDENTITY_VERIFICATION
    );

    score += Math.min(trustAttestations.length * 0.1, 0.3);
    score += Math.min(identityAttestations.length * 0.05, 0.2);

    return Math.min(score, 1);
  }

  private calculateActivityScore(activities: AgentActivity[]): number {
    if (activities.length === 0) return 0.5;

    const recentActivities = activities.filter(
      (a) => new Date().getTime() - a.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
    );

    if (recentActivities.length === 0) return 0.3;

    const positiveCount = recentActivities.filter(
      (a) =>
        a.activityType === ActivityType.CAPABILITY_GRANTED ||
        a.activityType === ActivityType.ATTESTATION_ISSUED
    ).length;

    const negativeCount = recentActivities.filter(
      (a) =>
        a.activityType === ActivityType.ANOMALY_DETECTED ||
        a.activityType === ActivityType.CAPABILITY_REVOKED
    ).length;

    const ratio = positiveCount / (positiveCount + negativeCount || 1);
    return 0.5 + ratio * 0.5;
  }

  private calculateRelationshipScore(relationships: {
    incoming: Array<{ trustLevel: number }>;
    outgoing: Array<{ trustLevel: number }>;
  }): number {
    const allRelationships = [...relationships.incoming, ...relationships.outgoing];

    if (allRelationships.length === 0) return 0.5;

    const avgTrust =
      allRelationships.reduce((sum, r) => sum + r.trustLevel, 0) /
      allRelationships.length;

    return avgTrust;
  }

  private calculateAgeScore(createdAt: Date): number {
    const ageMs = new Date().getTime() - createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Score increases with age up to 90 days
    return Math.min(ageDays / 90, 1);
  }

  private calculateReputationScore(reputation: number): number {
    // Normalize reputation (-1000 to 1000) to score (0 to 1)
    return (reputation + 1000) / 2000;
  }

  private calculateRecencyWeight(activities: AgentActivity[]): number {
    if (activities.length === 0) return 0;

    const now = new Date().getTime();
    const lastActivity = activities[0];
    const hoursSinceLastActivity =
      (now - lastActivity.timestamp.getTime()) / (1000 * 60 * 60);

    // Weight decreases as time since last activity increases
    return Math.max(0, 1 - hoursSinceLastActivity / 168); // 168 hours = 1 week
  }

  private async calculateAnomalyPenalty(agentId: string): number {
    const unresolvedAnomalies = await this.getAnomalyHistory(agentId, false);

    if (unresolvedAnomalies.length === 0) return 0;

    // Calculate penalty based on number and severity of anomalies
    let penalty = 0;
    for (const anomaly of unresolvedAnomalies) {
      const severityMultiplier =
        anomaly.severity === AnomalySeverity.CRITICAL
          ? 0.3
          : anomaly.severity === AnomalySeverity.HIGH
          ? 0.2
          : anomaly.severity === AnomalySeverity.MEDIUM
          ? 0.1
          : 0.05;

      penalty += severityMultiplier * anomaly.confidence;
    }

    return Math.min(penalty, 0.5); // Cap at 0.5
  }

  private detectAccessPatternAnomalies(
    agent: Agent,
    activities: AgentActivity[]
  ): AnomalyDetectionResult | null {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentActivities = activities.filter((a) => a.timestamp > oneHourAgo);

    if (recentActivities.length < 5) return null;

    // Check for burst of activity
    if (recentActivities.length > 50) {
      return {
        agentId: agent.id,
        anomalyType: AnomalyType.UNUSUAL_ACCESS_PATTERN,
        severity: AnomalySeverity.HIGH,
        confidence: Math.min(recentActivities.length / 100, 1),
        indicators: [
          {
            type: 'activity_burst',
            value: recentActivities.length,
            threshold: 50,
            description: `Unusual burst of ${recentActivities.length} activities in the last hour`
          }
        ],
        detectedAt: now,
        recommendedAction: 'Review recent activities and consider temporary suspension'
      };
    }

    return null;
  }

  private detectTrustManipulation(
    agent: Agent,
    activities: AgentActivity[]
  ): AnomalyDetectionResult | null {
    const trustActivities = activities.filter(
      (a) => a.activityType === ActivityType.TRUST_SCORE_UPDATED
    );

    if (trustActivities.length < 3) return null;

    // Check for rapid trust score changes
    const recentChanges = trustActivities.slice(0, 5);
    if (recentChanges.length >= 3) {
      return {
        agentId: agent.id,
        anomalyType: AnomalyType.TRUST_MANIPULATION,
        severity: AnomalySeverity.MEDIUM,
        confidence: 0.7,
        indicators: [
          {
            type: 'rapid_trust_changes',
            value: recentChanges.length,
            threshold: 3,
            description: `${recentChanges.length} trust score changes in recent activity`
          }
        ],
        detectedAt: new Date(),
        recommendedAction: 'Investigate trust score manipulation attempts'
      };
    }

    return null;
  }

  private detectCapabilityEscalation(
    agent: Agent,
    activities: AgentActivity[]
  ): AnomalyDetectionResult | null {
    const capabilityGrants = activities.filter(
      (a) => a.activityType === ActivityType.CAPABILITY_GRANTED
    );

    if (capabilityGrants.length < 2) return null;

    // Check for admin capability grants
    const adminGrants = capabilityGrants.filter((a) =>
      JSON.stringify(a.metadata).includes('admin')
    );

    if (adminGrants.length > 0) {
      return {
        agentId: agent.id,
        anomalyType: AnomalyType.CAPABILITY_ESCALATION,
        severity: AnomalySeverity.HIGH,
        confidence: 0.8,
        indicators: [
          {
            type: 'admin_capability_grants',
            value: adminGrants.length,
            threshold: 0,
            description: `${adminGrants.length} admin capability grants detected`
          }
        ],
        detectedAt: new Date(),
        recommendedAction: 'Review admin capability grants immediately'
      };
    }

    return null;
  }

  private detectCollusionPatterns(
    agent: Agent,
    relationships: { incoming: Array<{ sourceAgentId: string }>; outgoing: Array<{ targetAgentId: string }> }
  ): AnomalyDetectionResult | null {
    const allRelatedIds = [
      ...relationships.incoming.map((r) => r.sourceAgentId),
      ...relationships.outgoing.map((r) => r.targetAgentId)
    ];

    const uniqueRelatedIds = new Set(allRelatedIds);

    // Check if agent is connected to a large portion of the network
    if (uniqueRelatedIds.size > 20) {
      return {
        agentId: agent.id,
        anomalyType: AnomalyType.COLLUSION_PATTERN,
        severity: AnomalySeverity.MEDIUM,
        confidence: Math.min(uniqueRelatedIds.size / 50, 1),
        indicators: [
          {
            type: 'high_connectivity',
            value: uniqueRelatedIds.size,
            threshold: 20,
            description: `Agent connected to ${uniqueRelatedIds.size} other agents`
          }
        ],
        detectedAt: new Date(),
        recommendedAction: 'Review agent relationships for potential collusion'
      };
    }

    return null;
  }

  private async detectBehaviorDeviation(
    agent: Agent,
    activities: AgentActivity[]
  ): Promise<AnomalyDetectionResult | null> {
    if (activities.length < 10) return null;

    // Calculate activity type distribution
    const typeCounts: Record<string, number> = {};
    for (const activity of activities) {
      typeCounts[activity.activityType] = (typeCounts[activity.activityType] || 0) + 1;
    }

    const typeDistribution = Object.values(typeCounts);
    const stdDev = calculateStandardDeviation(typeDistribution);

    // High standard deviation indicates unusual behavior pattern
    if (stdDev > 5) {
      return {
        agentId: agent.id,
        anomalyType: AnomalyType.BEHAVIOR_DEVIATION,
        severity: AnomalySeverity.LOW,
        confidence: Math.min(stdDev / 10, 1),
        indicators: [
          {
            type: 'behavior_variance',
            value: stdDev,
            threshold: 5,
            description: `Unusual behavior variance: ${stdDev.toFixed(2)}`
          }
        ],
        detectedAt: new Date(),
        recommendedAction: 'Monitor agent behavior patterns'
      };
    }

    return null;
  }

  private async storeTrustScore(calculation: TrustScoreCalculation): Promise<void> {
    await query(
      `INSERT INTO trust_scores (id, agent_id, score, reason, calculated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        generateId(),
        calculation.agentId,
        calculation.finalScore,
        `Base: ${calculation.baseScore.toFixed(2)}, Recency: ${calculation.recencyWeight.toFixed(2)}`,
        new Date()
      ]
    );
  }

  private async storeAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    await query(
      `INSERT INTO anomalies 
       (id, agent_id, anomaly_type, severity, confidence, indicators, 
        detected_at, recommended_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        generateId(),
        anomaly.agentId,
        anomaly.anomalyType,
        anomaly.severity,
        anomaly.confidence,
        JSON.stringify(anomaly.indicators),
        anomaly.detectedAt,
        anomaly.recommendedAction
      ]
    );

    // Log as activity
    await identityManager.logActivity({
      id: generateId(),
      agentId: anomaly.agentId,
      activityType: ActivityType.ANOMALY_DETECTED,
      description: `Anomaly detected: ${anomaly.anomalyType}`,
      timestamp: anomaly.detectedAt,
      metadata: {
        severity: anomaly.severity,
        confidence: anomaly.confidence
      }
    });
  }

  private mapAnomalyFromDb(row: Record<string, unknown>): AnomalyDetectionResult {
    return {
      agentId: row.agent_id as string,
      anomalyType: row.anomaly_type as AnomalyType,
      severity: row.severity as AnomalySeverity,
      confidence: parseFloat(row.confidence as string),
      indicators: (row.indicators as AnomalyIndicator[]) || [],
      detectedAt: new Date(row.detected_at as Date),
      recommendedAction: row.recommended_action as string
    };
  }
}

export const trustEngine = new TrustEngine();
