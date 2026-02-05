import { Pool, PoolClient, QueryResult } from 'pg';
import { createLogger } from './logger';

const logger = createLogger('database');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query<T>(sql, params);
    const duration = Date.now() - start;
    
    logger.debug('Query executed', {
      sql: sql.slice(0, 100),
      duration,
      rows: result.rowCount
    });
    
    return result;
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Initializing database...');
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(32) PRIMARY KEY,
        did VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL,
        public_key VARCHAR(255) NOT NULL,
        trust_score DECIMAL(3,2) DEFAULT 0.50,
        reputation INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        capabilities JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agent_relationships (
        id VARCHAR(32) PRIMARY KEY,
        source_agent_id VARCHAR(32) REFERENCES agents(id) ON DELETE CASCADE,
        target_agent_id VARCHAR(32) REFERENCES agents(id) ON DELETE CASCADE,
        relationship_type VARCHAR(30) NOT NULL,
        trust_level DECIMAL(3,2) DEFAULT 0.50,
        permissions JSONB DEFAULT '[]',
        established_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        interaction_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        UNIQUE(source_agent_id, target_agent_id, relationship_type)
      );

      CREATE TABLE IF NOT EXISTS identities (
        did VARCHAR(255) PRIMARY KEY,
        agent_id VARCHAR(32) REFERENCES agents(id) ON DELETE CASCADE,
        document JSONB NOT NULL,
        encrypted_private_key TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS capabilities (
        id VARCHAR(64) PRIMARY KEY,
        subject VARCHAR(255) NOT NULL,
        issuer VARCHAR(255) NOT NULL,
        actions JSONB NOT NULL,
        resources JSONB NOT NULL,
        conditions JSONB DEFAULT '[]',
        not_before TIMESTAMP WITH TIME ZONE,
        expiration TIMESTAMP WITH TIME ZONE,
        proof JSONB,
        issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS attestations (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        issuer VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        claims JSONB NOT NULL,
        issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        revocation JSONB,
        proof JSONB NOT NULL,
        metadata JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS agent_activities (
        id VARCHAR(32) PRIMARY KEY,
        agent_id VARCHAR(32) REFERENCES agents(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        related_agent_ids JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS trust_scores (
        id VARCHAR(32) PRIMARY KEY,
        agent_id VARCHAR(32) REFERENCES agents(id) ON DELETE CASCADE,
        score DECIMAL(3,2) NOT NULL,
        reason TEXT,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS anomalies (
        id VARCHAR(32) PRIMARY KEY,
        agent_id VARCHAR(32) REFERENCES agents(id) ON DELETE CASCADE,
        anomaly_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        confidence DECIMAL(3,2) NOT NULL,
        indicators JSONB NOT NULL,
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE,
        recommended_action TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      CREATE INDEX IF NOT EXISTS idx_agents_did ON agents(did);
      CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON agent_relationships(source_agent_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON agent_relationships(target_agent_id);
      CREATE INDEX IF NOT EXISTS idx_capabilities_subject ON capabilities(subject);
      CREATE INDEX IF NOT EXISTS idx_capabilities_status ON capabilities(status);
      CREATE INDEX IF NOT EXISTS idx_attestations_issuer ON attestations(issuer);
      CREATE INDEX IF NOT EXISTS idx_attestations_subject ON attestations(subject);
      CREATE INDEX IF NOT EXISTS idx_attestations_type ON attestations(type);
      CREATE INDEX IF NOT EXISTS idx_activities_agent ON agent_activities(agent_id);
      CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON agent_activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_anomalies_agent ON anomalies(agent_id);
      CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomalies(detected_at);
    `);
    
    logger.info('Database initialized successfully');
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database connection closed');
}

export { pool };
