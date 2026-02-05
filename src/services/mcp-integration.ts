import { createLogger } from '../utils/logger';
import { identityManager } from './identity-manager';
import { capabilityIssuer } from './capability-issuer';
import { attestationService } from './attestation-service';
import { trustEngine } from './trust-engine';
import { didService } from './did-service';
import { AgentType } from '../models/agent';
import { AttestationType } from '../models/attestation';

const logger = createLogger('mcp-integration');

// MCP Tool definitions
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export class MCPIntegration {
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();

  constructor() {
    this.registerTools();
    this.registerResources();
    logger.info('MCP Integration initialized');
  }

  private registerTools(): void {
    // Agent lookup tool
    this.tools.set('lookup_agent', {
      name: 'lookup_agent',
      description: 'Look up an agent by ID or DID',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Agent ID or DID to look up'
          }
        },
        required: ['identifier']
      }
    });

    // List agents tool
    this.tools.set('list_agents', {
      name: 'list_agents',
      description: 'List all agents with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended', 'revoked', 'pending'],
            description: 'Filter by agent status'
          },
          type: {
            type: 'string',
            enum: Object.values(AgentType),
            description: 'Filter by agent type'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of agents to return',
            default: 20
          }
        }
      }
    });

    // Create agent tool
    this.tools.set('create_agent', {
      name: 'create_agent',
      description: 'Create a new agent with a DID identity',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Agent name'
          },
          description: {
            type: 'string',
            description: 'Agent description'
          },
          type: {
            type: 'string',
            enum: Object.values(AgentType),
            description: 'Agent type'
          },
          capabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Agent capabilities'
          }
        },
        required: ['name', 'type']
      }
    });

    // Verify capability tool
    this.tools.set('verify_capability', {
      name: 'verify_capability',
      description: 'Verify if an agent has a specific capability',
      inputSchema: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'Capability token'
          },
          action: {
            type: 'string',
            description: 'Action to verify'
          },
          resource: {
            type: 'string',
            description: 'Resource to verify'
          }
        },
        required: ['token', 'action', 'resource']
      }
    });

    // Issue capability tool
    this.tools.set('issue_capability', {
      name: 'issue_capability',
      description: 'Issue a capability token to an agent',
      inputSchema: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: 'Subject agent DID'
          },
          actions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed actions'
          },
          resources: {
            type: 'array',
            items: { type: 'string' },
            description: 'Accessible resources'
          },
          expiresInHours: {
            type: 'number',
            description: 'Token expiration in hours'
          }
        },
        required: ['subject', 'actions', 'resources']
      }
    });

    // Get trust score tool
    this.tools.set('get_trust_score', {
      name: 'get_trust_score',
      description: 'Get the trust score for an agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'Agent ID'
          }
        },
        required: ['agentId']
      }
    });

    // Create attestation tool
    this.tools.set('create_attestation', {
      name: 'create_attestation',
      description: 'Create a new attestation for an agent',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: Object.values(AttestationType),
            description: 'Attestation type'
          },
          subject: {
            type: 'string',
            description: 'Subject agent DID'
          },
          claims: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                value: {}
              }
            },
            description: 'Attestation claims'
          }
        },
        required: ['type', 'subject', 'claims']
      }
    });

    // Resolve DID tool
    this.tools.set('resolve_did', {
      name: 'resolve_did',
      description: 'Resolve a DID to its document',
      inputSchema: {
        type: 'object',
        properties: {
          did: {
            type: 'string',
            description: 'DID to resolve'
          }
        },
        required: ['did']
      }
    });

    // Get agent relationships tool
    this.tools.set('get_agent_relationships', {
      name: 'get_agent_relationships',
      description: 'Get relationships for an agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'Agent ID'
          }
        },
        required: ['agentId']
      }
    });

    // Detect anomalies tool
    this.tools.set('detect_anomalies', {
      name: 'detect_anomalies',
      description: 'Detect anomalies for an agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'Agent ID'
          }
        },
        required: ['agentId']
      }
    });
  }

  private registerResources(): void {
    this.resources.set('agents', {
      uri: 'agent-identity-hub://agents',
      name: 'Agents',
      description: 'List of all registered agents',
      mimeType: 'application/json'
    });

    this.resources.set('capabilities', {
      uri: 'agent-identity-hub://capabilities',
      name: 'Capabilities',
      description: 'All issued capability tokens',
      mimeType: 'application/json'
    });

    this.resources.set('attestations', {
      uri: 'agent-identity-hub://attestations',
      name: 'Attestations',
      description: 'All attestations issued in the system',
      mimeType: 'application/json'
    });

    this.resources.set('trust-scores', {
      uri: 'agent-identity-hub://trust-scores',
      name: 'Trust Scores',
      description: 'Trust scores for all agents',
      mimeType: 'application/json'
    });

    this.resources.set('anomalies', {
      uri: 'agent-identity-hub://anomalies',
      name: 'Anomalies',
      description: 'Detected anomalies in the system',
      mimeType: 'application/json'
    });
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    logger.info('Executing MCP tool', { name, args });

    switch (name) {
      case 'lookup_agent':
        return this.lookupAgent(args.identifier as string);

      case 'list_agents':
        return this.listAgents(args);

      case 'create_agent':
        return this.createAgent(args);

      case 'verify_capability':
        return this.verifyCapability(
          args.token as string,
          args.action as string,
          args.resource as string
        );

      case 'issue_capability':
        return this.issueCapability(args);

      case 'get_trust_score':
        return this.getTrustScore(args.agentId as string);

      case 'create_attestation':
        return this.createAttestation(args);

      case 'resolve_did':
        return this.resolveDID(args.did as string);

      case 'get_agent_relationships':
        return this.getAgentRelationships(args.agentId as string);

      case 'detect_anomalies':
        return this.detectAnomalies(args.agentId as string);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async getResource(uri: string): Promise<unknown> {
    logger.info('Getting MCP resource', { uri });

    switch (uri) {
      case 'agent-identity-hub://agents':
        const { agents } = await identityManager.listAgents({}, { page: 1, limit: 100 });
        return agents;

      case 'agent-identity-hub://capabilities':
        return capabilityIssuer.listCapabilities();

      case 'agent-identity-hub://attestations':
        const { attestations } = await attestationService.listAttestations(
          {},
          { page: 1, limit: 100 }
        );
        return attestations;

      case 'agent-identity-hub://trust-scores':
        return this.getAllTrustScores();

      case 'agent-identity-hub://anomalies':
        return this.getAllAnomalies();

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async lookupAgent(identifier: string): Promise<unknown> {
    const agent = await identityManager.getAgent(identifier);
    const { incoming, outgoing } = await identityManager.getRelationships(agent.id);
    const history = await trustEngine.getTrustHistory(agent.id, 30);

    return {
      agent,
      relationships: { incoming, outgoing },
      trustHistory: history
    };
  }

  private async listAgents(filters: Record<string, unknown>): Promise<unknown> {
    const { agents, total } = await identityManager.listAgents(
      {
        status: filters.status as any,
        type: filters.type as any
      },
      {
        page: 1,
        limit: (filters.limit as number) || 20
      }
    );

    return { agents, total };
  }

  private async createAgent(args: Record<string, unknown>): Promise<unknown> {
    const { agent, identity, apiKey } = await identityManager.createAgent({
      name: args.name as string,
      description: args.description as string,
      type: args.type as AgentType,
      capabilities: (args.capabilities as string[]) || []
    });

    return {
      agent,
      identity: { did: identity.did },
      apiKey: apiKey.slice(0, 10) + '...' // Mask for security
    };
  }

  private async verifyCapability(
    token: string,
    action: string,
    resource: string
  ): Promise<unknown> {
    const result = await capabilityIssuer.verifyCapability({
      token,
      action,
      resource
    });

    return result;
  }

  private async issueCapability(args: Record<string, unknown>): Promise<unknown> {
    // In a real implementation, this would authenticate the issuer
    // For now, we'll use a system issuer
    const systemIssuer = 'did:ethr:system';

    const token = await capabilityIssuer.issueCapability(systemIssuer, {
      subject: args.subject as string,
      actions: args.actions as string[],
      resources: args.resources as string[],
      expiresInHours: args.expiresInHours as number
    });

    return token;
  }

  private async getTrustScore(agentId: string): Promise<unknown> {
    const calculation = await trustEngine.calculateTrustScore(agentId);
    const history = await trustEngine.getTrustHistory(agentId, 30);

    return {
      ...calculation,
      history
    };
  }

  private async createAttestation(args: Record<string, unknown>): Promise<unknown> {
    const systemIssuer = 'did:ethr:system';

    const attestation = await attestationService.createAttestation(systemIssuer, {
      type: args.type as AttestationType,
      subject: args.subject as string,
      claims: args.claims as Array<{ type: string; value: unknown }>
    });

    return attestation;
  }

  private async resolveDID(did: string): Promise<unknown> {
    const result = await didService.resolveDID(did);
    return result;
  }

  private async getAgentRelationships(agentId: string): Promise<unknown> {
    return identityManager.getRelationships(agentId);
  }

  private async detectAnomalies(agentId: string): Promise<unknown> {
    return trustEngine.detectAnomalies(agentId);
  }

  private async getAllTrustScores(): Promise<unknown[]> {
    // This would query all trust scores in a real implementation
    return [];
  }

  private async getAllAnomalies(): Promise<unknown[]> {
    // This would query all anomalies in a real implementation
    return [];
  }
}

export const mcpIntegration = new MCPIntegration();
