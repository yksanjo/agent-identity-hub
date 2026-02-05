#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

import { mcpIntegration } from '../services/mcp-integration';
import { initDatabase, closeDatabase } from '../utils/db';
import logger from '../utils/logger';

const SERVER_NAME = process.env.MCP_SERVER_NAME || 'agent-identity-hub';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '1.0.0';

class AgentIdentityMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = mcpIntegration.getTools();
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        logger.info('MCP tool called', { tool: name, args });

        const result = await mcpIntegration.executeTool(name, args || {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error('MCP tool error', { error, tool: request.params.name });
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${(error as Error).message}`
        );
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = mcpIntegration.getResources();
      return {
        resources: resources.map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          mimeType: resource.mimeType || 'application/json',
          description: resource.description
        }))
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const { uri } = request.params;
        
        logger.info('MCP resource read', { uri });

        const result = await mcpIntegration.getResource(uri);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error('MCP resource error', { error, uri: request.params.uri });
        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${(error as Error).message}`
        );
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.error('MCP server error', { error });
    };

    process.on('SIGINT', async () => {
      await this.shutdown();
    });

    process.on('SIGTERM', async () => {
      await this.shutdown();
    });
  }

  async run(): Promise<void> {
    // Initialize database
    await initDatabase();
    logger.info('MCP Server database initialized');

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('Agent Identity Hub MCP server running on stdio');
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCP server...');
    await closeDatabase();
    await this.server.close();
    process.exit(0);
  }
}

// Run the server
const mcpServer = new AgentIdentityMcpServer();
mcpServer.run().catch((error) => {
  logger.error('MCP server failed to start', { error });
  process.exit(1);
});
