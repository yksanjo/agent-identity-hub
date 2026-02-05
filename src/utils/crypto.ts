import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { ethers } from 'ethers';
import * as secp256k1 from 'secp256k1';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes);
  
  return {
    privateKey: Buffer.from(privateKeyBytes).toString('hex'),
    publicKey: Buffer.from(publicKeyBytes).toString('hex')
  };
}

export function generateEthereumWallet(): {
  address: string;
  publicKey: string;
  privateKey: string;
} {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    publicKey: wallet.signingKey.publicKey,
    privateKey: wallet.privateKey
  };
}

export function hashData(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (randomBytes(1)[0] & 0x0f) | (c === 'x' ? 0 : 0x40);
    return r.toString(16);
  });
}

export function generateNonce(): string {
  return randomBytes(32).toString('base64url');
}

export function encrypt(text: string, key: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(key.padEnd(32).slice(0, 32)),
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string, key: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(key.padEnd(32).slice(0, 32)),
    iv
  );
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function signData(data: string, privateKey: string): string {
  const messageHash = createHash('sha256').update(data).digest();
  const privateKeyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
  const signature = secp256k1.sign(messageHash, privateKeyBytes);
  return Buffer.from(signature.signature).toString('hex');
}

export function verifySignature(
  data: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageHash = createHash('sha256').update(data).digest();
    const signatureBytes = Buffer.from(signature, 'hex');
    const publicKeyBytes = Buffer.from(publicKey.replace('0x', ''), 'hex');
    return secp256k1.verify(messageHash, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export function deriveSharedSecret(
  privateKey: string,
  publicKey: string
): Buffer {
  const privateKeyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
  const publicKeyBytes = Buffer.from(publicKey.replace('0x', ''), 'hex');
  return Buffer.from(secp256k1.ecdh(publicKeyBytes, privateKeyBytes));
}

export function generateDID(method: string = 'ethr', identifier: string): string {
  if (method === 'ethr') {
    return `did:ethr:${identifier}`;
  }
  if (method === 'key') {
    const encoded = Buffer.from(identifier, 'hex').toString('base64url');
    return `did:key:z${encoded}`;
  }
  return `did:${method}:${identifier}`;
}

export function parseDID(did: string): { method: string; identifier: string } {
  const parts = did.split(':');
  if (parts.length < 3 || parts[0] !== 'did') {
    throw new Error('Invalid DID format');
  }
  return {
    method: parts[1],
    identifier: parts.slice(2).join(':')
  };
}

export function generateChallenge(): string {
  return randomBytes(32).toString('hex');
}

export function hashAttestation(attestation: Record<string, unknown>): string {
  const canonical = JSON.stringify(attestation, Object.keys(attestation).sort());
  return hashData(canonical);
}

export function generateApiKey(): string {
  return `aik_${randomBytes(32).toString('base64url')}`;
}

export function maskString(str: string, visibleChars: number = 4): string {
  if (str.length <= visibleChars * 2) {
    return '*'.repeat(str.length);
  }
  return str.slice(0, visibleChars) + '...' + str.slice(-visibleChars);
}
