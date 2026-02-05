# Agent Identity Hub

A decentralized identity manager for AI agent swarms with DID-based authentication, capability-based access control, attestation logging, trust scoring, behavior anomaly detection, and MCP (Model Context Protocol) integration.

## Features

### 🔐 Decentralized Identity
- **DID (Decentralized Identifier)** support using the `ethr` method
- Cryptographic key pair generation for each agent
- Verifiable credentials and identity resolution

### 🛡️ Capability-Based Access Control
- Issue fine-grained capability tokens with actions and resources
- JWT-based capability tokens with expiration and conditions
- Support for capability delegation
- Real-time capability verification

### 📜 Attestation System
- Cryptographic attestations for agent behavior and identity
- Attestation chains for trust verification
- Revocation support with audit trail

### 📊 Trust Scoring
- Dynamic trust score calculation based on:
  - Attestation history
  - Activity patterns
  - Relationship quality
  - Agent age and reputation
- Configurable decay and boost rates

### 🔍 Anomaly Detection
- Real-time behavior anomaly detection:
  - Unusual access patterns
  - Trust manipulation attempts
  - Capability escalation
  - Collusion patterns
  - Behavior deviation
- Severity levels with recommended actions

### 🕸️ Social Graph Visualization
- Interactive D3.js-based network graph
- Visualize agent relationships and interactions
- Color-coded by agent type and trust score
- Real-time updates via WebSocket

### 🔌 MCP Integration
- Full Model Context Protocol server implementation
- Tools for agent lookup, capability verification, trust scoring
- Resources for agents, capabilities, attestations, and trust scores
- Compatible with Claude Desktop

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Dashboard                          │
│                 (React + D3.js + Socket.io)                 │
└────────────────────┬────────────────────────────────────────┘
                     │ WebSocket / HTTP
┌────────────────────▼────────────────────────────────────────┐
│                    API Server                               │
│         (Express + TypeScript + Socket.io)                  │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Agents  │ Identity │Capabilities│Attestations│ Trust Engine │
└──────────┴────┬─────┴──────────┴──────────┴────────┬────────┘
                │                                      │
        ┌───────▼────────┐                    ┌────────▼──────┐
        │ DID Service    │                    │ Anomaly       │
        │ (did-jwt)      │                    │ Detection     │
        └───────┬────────┘                    └───────────────┘
                │
        ┌───────▼────────┐
        │ PostgreSQL     │
        │ (Persistence)  │
        └────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Installation

1. **Clone and install dependencies:**
```bash
cd agent-identity-hub
npm install

cd dashboard
npm install
cd ..
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start PostgreSQL (if not using Docker):**
```bash
docker run -d \
  --name agent-identity-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agent_identity_hub \
  -p 5432:5432 \
  postgres:15-alpine
```

4. **Run database migrations:**
```bash
npm run db:migrate
```

5. **Start the API server:**
```bash
npm run dev
```

6. **Start the dashboard (in a new terminal):**
```bash
cd dashboard
npm start
```

7. **Access the application:**
- API: http://localhost:3000/api/v1
- Dashboard: http://localhost:3001

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Endpoints

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents` | List all agents |
| POST | `/api/v1/agents` | Create a new agent |
| GET | `/api/v1/agents/:id` | Get agent details |
| PATCH | `/api/v1/agents/:id` | Update agent |
| DELETE | `/api/v1/agents/:id` | Delete agent |
| POST | `/api/v1/agents/:id/relationships` | Create relationship |
| GET | `/api/v1/agents/graph/social` | Get social graph data |

### Identity (DID)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/identity/resolve/:did` | Resolve a DID |
| GET | `/api/v1/identity/agent/:agentId` | Get agent identity |

### Capabilities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/capabilities` | List capabilities |
| POST | `/api/v1/capabilities` | Issue capability |
| POST | `/api/v1/capabilities/verify` | Verify capability |

### Attestations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/attestations` | List attestations |
| POST | `/api/v1/attestations` | Create attestation |
| GET | `/api/v1/attestations/:id` | Get attestation |

## MCP Configuration

To use the Agent Identity Hub with Claude Desktop, add the following to your Claude Desktop configuration:

### macOS
```bash
# Edit the config file
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Windows
```bash
# Edit the config file
notepad %APPDATA%\Claude\claude_desktop_config.json
```

### Configuration
```json
{
  "mcpServers": {
    "agent-identity-hub": {
      "command": "node",
      "args": [
        "/path/to/agent-identity-hub/dist/mcp/mcp-server.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/agent_identity_hub",
        "JWT_SECRET": "your-jwt-secret"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `lookup_agent` | Look up an agent by ID or DID |
| `list_agents` | List all agents with filters |
| `create_agent` | Create a new agent |
| `verify_capability` | Verify a capability token |
| `issue_capability` | Issue a new capability |
| `get_trust_score` | Get agent trust score |
| `create_attestation` | Create an attestation |
| `resolve_did` | Resolve a DID to its document |
| `get_agent_relationships` | Get agent relationships |
| `detect_anomalies` | Detect anomalies for an agent |

### Available MCP Resources

| Resource URI | Description |
|--------------|-------------|
| `agent-identity-hub://agents` | List of all registered agents |
| `agent-identity-hub://capabilities` | All issued capability tokens |
| `agent-identity-hub://attestations` | All attestations |
| `agent-identity-hub://trust-scores` | Trust scores for all agents |
| `agent-identity-hub://anomalies` | Detected anomalies |

## Example Usage

### Create an Agent
```bash
curl -X POST http://localhost:3000/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Data Processing Agent",
    "type": "worker",
    "description": "Processes data streams",
    "capabilities": ["read", "write"]
  }'
```

### Issue a Capability
```bash
curl -X POST http://localhost:3000/api/v1/capabilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "did:ethr:0x...",
    "actions": ["read", "write"],
    "resources": ["data/*"],
    "expiresInHours": 24
  }'
```

### Create an Attestation
```bash
curl -X POST http://localhost:3000/api/v1/attestations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "trust_assertion",
    "subject": "did:ethr:0x...",
    "claims": [
      {"type": "reliability", "value": "high"},
      {"type": "compliance", "value": "verified"}
    ]
  }'
```

### Resolve a DID
```bash
curl http://localhost:3000/api/v1/identity/resolve/did:ethr:0x...
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `DID_METHOD` | DID method to use | `ethr` |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | - |
| `TRUST_DECAY_RATE` | Trust score decay rate | `0.05` |
| `TRUST_BOOST_RATE` | Trust score boost rate | `0.1` |
| `ANOMALY_THRESHOLD` | Anomaly detection threshold | `0.7` |
| `MCP_SERVER_NAME` | MCP server name | `agent-identity-hub` |

## Development

### Project Structure
```
agent-identity-hub/
├── src/
│   ├── middleware/        # Express middleware
│   ├── models/            # TypeScript interfaces
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utilities
│   ├── mcp/               # MCP server implementation
│   └── server.ts          # Main server entry
├── dashboard/             # React web dashboard
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utilities
│   └── public/
├── docker-compose.yml     # Docker orchestration
├── Dockerfile             # Backend Dockerfile
└── README.md
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
# Backend
npm run build

# Dashboard
cd dashboard
npm run build
```

## Security Considerations

1. **JWT Secret**: Always use a strong, unique JWT secret in production
2. **Database**: Use strong passwords and enable SSL for database connections
3. **API Keys**: Store API keys securely and rotate them regularly
4. **Private Keys**: In production, encrypt private keys at rest
5. **Rate Limiting**: The API includes rate limiting to prevent abuse
6. **CORS**: Configure CORS appropriately for your deployment

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please use the GitHub issue tracker.
