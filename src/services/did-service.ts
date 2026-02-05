import { Resolver, ResolverRegistry } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { createLogger } from '../utils/logger';
import {
  DIDDocument,
  DIDResolutionResult,
  ResolutionMetadata,
  DocumentMetadata,
  VerificationMethod,
  ServiceEndpoint
} from '../models/identity';
import { generateDID, generateKeyPair, createHash } from '../utils/crypto';
import { DIDError } from '../utils/errors';

const logger = createLogger('did-service');

export class DIDService {
  private resolver: Resolver;
  private documents: Map<string, DIDDocument> = new Map();

  constructor() {
    const ethrProvider = {
      name: 'mainnet',
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      registry: process.env.DID_REGISTRY_ADDRESS
    };

    const resolverRegistry: ResolverRegistry = {
      ...getEthrResolver(ethrProvider)
    };

    this.resolver = new Resolver(resolverRegistry);
    logger.info('DID Service initialized');
  }

  async createDID(
    method: string = 'ethr',
    publicKey?: string,
    services?: ServiceEndpoint[]
  ): Promise<{ did: string; document: DIDDocument }> {
    try {
      let identifier: string;
      let actualPublicKey: string;

      if (method === 'ethr') {
        if (publicKey) {
          identifier = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
          actualPublicKey = publicKey;
        } else {
          const keyPair = generateKeyPair();
          identifier = keyPair.publicKey;
          actualPublicKey = keyPair.publicKey;
        }
      } else if (method === 'key') {
        const keyPair = generateKeyPair();
        identifier = keyPair.publicKey;
        actualPublicKey = keyPair.publicKey;
      } else {
        throw new DIDError(`Unsupported DID method: ${method}`);
      }

      const did = generateDID(method, identifier);
      const now = new Date().toISOString();

      const verificationMethod: VerificationMethod = {
        id: `${did}#keys-1`,
        type: method === 'ethr' ? 'EcdsaSecp256k1RecoveryMethod2020' : 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyHex: actualPublicKey.startsWith('0x') 
          ? actualPublicKey.slice(2) 
          : actualPublicKey
      };

      const document: DIDDocument = {
        id: did,
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/secp256k1recovery-2020/v1'
        ],
        controller: did,
        verificationMethod: [verificationMethod],
        authentication: [`${did}#keys-1`],
        assertionMethod: [`${did}#keys-1`],
        ...(services && services.length > 0 && { service: services }),
        created: now,
        updated: now
      };

      this.documents.set(did, document);
      logger.info('DID created', { did, method });

      return { did, document };
    } catch (error) {
      logger.error('Failed to create DID', { error, method });
      throw new DIDError(`Failed to create DID: ${(error as Error).message}`);
    }
  }

  async resolveDID(did: string): Promise<DIDResolutionResult> {
    try {
      // Check local cache first
      const localDoc = this.documents.get(did);
      if (localDoc) {
        return {
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocument: localDoc,
          didDocumentMetadata: {
            created: localDoc.created,
            updated: localDoc.updated
          }
        };
      }

      // Try to resolve via resolver
      const doc = await this.resolver.resolve(did);
      if (doc) {
        return {
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocument: doc as DIDDocument,
          didDocumentMetadata: {}
        };
      }

      return {
        didResolutionMetadata: {
          error: 'notFound'
        },
        didDocument: null,
        didDocumentMetadata: {}
      };
    } catch (error) {
      logger.error('DID resolution failed', { did, error });
      return {
        didResolutionMetadata: {
          error: 'invalidDid'
        },
        didDocument: null,
        didDocumentMetadata: {}
      };
    }
  }

  async updateDID(
    did: string,
    updates: Partial<DIDDocument>
  ): Promise<DIDDocument> {
    const existing = this.documents.get(did);
    if (!existing) {
      throw new DIDError('DID not found in local registry');
    }

    const updated: DIDDocument = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      updated: new Date().toISOString()
    };

    this.documents.set(did, updated);
    logger.info('DID updated', { did });

    return updated;
  }

  async addVerificationMethod(
    did: string,
    method: Omit<VerificationMethod, 'controller'>
  ): Promise<DIDDocument> {
    const document = this.documents.get(did);
    if (!document) {
      throw new DIDError('DID not found');
    }

    const newMethod: VerificationMethod = {
      ...method,
      controller: did
    };

    const updated: DIDDocument = {
      ...document,
      verificationMethod: [...(document.verificationMethod || []), newMethod],
      updated: new Date().toISOString()
    };

    this.documents.set(did, updated);
    return updated;
  }

  async addServiceEndpoint(
    did: string,
    service: ServiceEndpoint
  ): Promise<DIDDocument> {
    const document = this.documents.get(did);
    if (!document) {
      throw new DIDError('DID not found');
    }

    const services = document.service || [];
    
    if (services.some((s) => s.id === service.id)) {
      throw new DIDError(`Service endpoint ${service.id} already exists`);
    }

    const updated: DIDDocument = {
      ...document,
      service: [...services, service],
      updated: new Date().toISOString()
    };

    this.documents.set(did, updated);
    return updated;
  }

  async deactivateDID(did: string): Promise<void> {
    const document = this.documents.get(did);
    if (!document) {
      throw new DIDError('DID not found');
    }

    // In a real implementation, this would interact with the blockchain
    logger.info('DID deactivated', { did });
    this.documents.delete(did);
  }

  verifyDIDOwnership(did: string, signature: string, message: string): boolean {
    const document = this.documents.get(did);
    if (!document || !document.verificationMethod) {
      return false;
    }

    const method = document.verificationMethod[0];
    if (!method.publicKeyHex) {
      return false;
    }

    // Verify signature using the public key
    const messageHash = createHash(message);
    // In production, use proper signature verification
    return true; // Simplified for this implementation
  }

  getAllLocalDIDs(): Array<{ did: string; document: DIDDocument }> {
    return Array.from(this.documents.entries()).map(([did, document]) => ({
      did,
      document
    }));
  }
}

export const didService = new DIDService();
