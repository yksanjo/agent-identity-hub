# MCP (Model Context Protocol) Setup Guide

This guide explains how to integrate the Agent Identity Hub MCP server with Claude Desktop.

## Overview

The Model Context Protocol (MCP) allows Claude Desktop to interact directly with the Agent Identity Hub, enabling you to:

- Look up agents and their identities
- Issue and verify capability tokens
- Create attestations
- Check trust scores
- Detect anomalies
- View the social graph

## Installation

### 1. Build the Project

First, ensure the project is built:

```bash
cd ~/security-ai-stack/agent-identity-hub
npm install
npm run build
```

### 2. Configure Claude Desktop

#### macOS

Edit the Claude Desktop configuration file:

```bash
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### Windows

Edit the Claude Desktop configuration file:

```cmd
notepad %APPDATA%\Claude\claude_desktop_config.json
```

### 3. Add MCP Server Configuration

Add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "agent-identity-hub": {
      "command": "node",
      "args": [
        "/Users/YOUR_USERNAME/security-ai-stack/agent-identity-hub/dist/mcp/mcp-server.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/agent_identity_hub",
        "JWT_SECRET": "your-super-secret-jwt-key-change-in-production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:** Replace `YOUR_USERNAME` with your actual username and update the `JWT_SECRET`.

### 4. Start the Database

Ensure PostgreSQL is running:

```bash
# Using Docker
docker run -d \
  --name agent-identity-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agent_identity_hub \
  -p 5432:5432 \
  postgres:15-alpine
```

Or start the full stack:

```bash
docker-compose up -d postgres
```

### 5. Restart Claude Desktop

After updating the configuration, fully quit and restart Claude Desktop.

## Usage Examples

Once configured, you can ask Claude to interact with your agent swarm:

### List All Agents
```
"Show me all agents in the system"
"List all active worker agents"
```

### Agent Lookup
```
"Look up agent with DID did:ethr:0x..."
"Get details for agent ID abc123"
```

### Create an Agent
```
"Create a new worker agent called 'Data Processor'"
"Register a validator agent for data verification"
```

### Capabilities
```
"Issue a capability token for agent did:ethr:0x... with read and write permissions"
"Verify if this agent can access the data resource"
```

### Attestations
```
"Create a trust assertion for agent did:ethr:0x..."
"Issue a behavior attestation for the compliance agent"
```

### Trust and Anomalies
```
"What's the trust score for agent abc123?"
"Detect any anomalies for agent did:ethr:0x..."
"Show me the trust history for this agent"
```

### DID Operations
```
"Resolve the DID did:ethr:0x..."
"Show me the DID document for this agent"
```

## Troubleshooting

### Server Not Starting

1. Check that the build was successful:
   ```bash
   ls -la dist/mcp/mcp-server.js
   ```

2. Verify the path in your Claude config is correct

3. Check the database is running:
   ```bash
   docker ps | grep postgres
   ```

### Connection Errors

1. Verify the `DATABASE_URL` in the config matches your setup
2. Ensure PostgreSQL is accessible on port 5432
3. Check that the database `agent_identity_hub` exists

### Permission Errors

1. Ensure the `dist/mcp/mcp-server.js` file is readable
2. Check that Node.js is in your system PATH

### Viewing Logs

Claude Desktop logs MCP server output. On macOS:

```bash
# View logs
tail -f ~/Library/Logs/Claude/mcp-server-agent-identity-hub.log
```

## Available Tools Reference

### lookup_agent
Find an agent by ID or DID.

**Parameters:**
- `identifier` (string, required): Agent ID or DID

### list_agents
List all agents with optional filters.

**Parameters:**
- `status` (string, optional): Filter by status (active, inactive, suspended, revoked, pending)
- `type` (string, optional): Filter by type (orchestrator, worker, validator, gateway, specialist, user_proxy)
- `limit` (number, optional): Maximum results to return (default: 20)

### create_agent
Create a new agent with a DID identity.

**Parameters:**
- `name` (string, required): Agent name
- `description` (string, optional): Agent description
- `type` (string, required): Agent type
- `capabilities` (string[], optional): List of capabilities

### verify_capability
Verify if an agent has a specific capability.

**Parameters:**
- `token` (string, required): Capability token
- `action` (string, required): Action to verify
- `resource` (string, required): Resource to verify

### issue_capability
Issue a capability token to an agent.

**Parameters:**
- `subject` (string, required): Subject agent DID
- `actions` (string[], required): Allowed actions
- `resources` (string[], required): Accessible resources
- `expiresInHours` (number, optional): Token expiration

### get_trust_score
Get the trust score for an agent.

**Parameters:**
- `agentId` (string, required): Agent ID

### create_attestation
Create a new attestation for an agent.

**Parameters:**
- `type` (string, required): Attestation type
- `subject` (string, required): Subject agent DID
- `claims` (array, required): Attestation claims

### resolve_did
Resolve a DID to its document.

**Parameters:**
- `did` (string, required): DID to resolve

### get_agent_relationships
Get relationships for an agent.

**Parameters:**
- `agentId` (string, required): Agent ID

### detect_anomalies
Detect anomalies for an agent.

**Parameters:**
- `agentId` (string, required): Agent ID

## Available Resources Reference

### agent-identity-hub://agents
List of all registered agents with their details.

### agent-identity-hub://capabilities
All issued capability tokens in the system.

### agent-identity-hub://attestations
All attestations issued by agents.

### agent-identity-hub://trust-scores
Current trust scores for all agents.

### agent-identity-hub://anomalies
Detected anomalies across the agent swarm.

## Advanced Configuration

### Custom Environment Variables

You can customize the MCP server behavior with these environment variables:

```json
{
  "mcpServers": {
    "agent-identity-hub": {
      "command": "node",
      "args": [...],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/agent_identity_hub",
        "JWT_SECRET": "your-secret",
        "LOG_LEVEL": "debug",
        "MCP_SERVER_NAME": "my-custom-name"
      }
    }
  }
}
```

### Using with Remote Database

If your database is on a remote server:

```json
{
  "env": {
    "DATABASE_URL": "postgresql://user:pass@remote-host:5432/agent_identity_hub"
  }
}
```

## Security Notes

1. **JWT Secret**: Never commit your JWT secret to version control
2. **Database Credentials**: Use environment variables for database credentials
3. **File Permissions**: Ensure the MCP server script has appropriate permissions
4. **Network**: Only expose the MCP server through Claude Desktop, not directly

## Updates

When updating the Agent Identity Hub:

1. Pull latest changes
2. Rebuild: `npm run build`
3. Restart Claude Desktop

The MCP server will automatically use the updated code.
