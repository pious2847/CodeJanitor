/**
 * Encryption Service
 * 
 * Implements data encryption at rest, TLS encryption for API communications,
 * and key management with rotation policies.
 */

import * as crypto from 'crypto';

/**
 * Encryption algorithm
 */
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc';

/**
 * Key rotation policy
 */
export interface KeyRotationPolicy {
  /** Rotation interval in days */
  rotationIntervalDays: number;
  /** Whether automatic rotation is enabled */
  autoRotate: boolean;
  /** Maximum key age in days before forced rotation */
  maxKeyAgeDays: number;
}

/**
 * Encryption key metadata
 */
export interface EncryptionKey {
  /** Key identifier */
  id: string;
  /** Key version */
  version: number;
  /** Key material (encrypted) */
  key: Buffer;
  /** Initialization vector */
  iv: Buffer;
  /** When the key was created */
  createdAt: Date;
  /** When the key was last rotated */
  lastRotatedAt: Date;
  /** Whether this key is active */
  isActive: boolean;
  /** Algorithm used with this key */
  algorithm: EncryptionAlgorithm;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Encrypted data */
  data: string;
  /** Key ID used for encryption */
  keyId: string;
  /** Key version used */
  keyVersion: number;
  /** Initialization vector (for GCM mode) */
  iv: string;
  /** Authentication tag (for GCM mode) */
  authTag?: string;
  /** Algorithm used */
  algorithm: EncryptionAlgorithm;
}

/**
 * TLS configuration
 */
export interface TLSConfig {
  /** Minimum TLS version */
  minVersion: 'TLSv1.2' | 'TLSv1.3';
  /** Allowed cipher suites */
  cipherSuites: string[];
  /** Certificate path */
  certPath?: string;
  /** Private key path */
  keyPath?: string;
  /** CA certificate path */
  caPath?: string;
}

/**
 * Encryption Service
 */
export class EncryptionService {
  private keys: Map<string, EncryptionKey> = new Map();
  private activeKeyId: string | null = null;
  private rotationPolicy: KeyRotationPolicy;
  private tlsConfig: TLSConfig;
  private masterKey: Buffer;

  constructor(
    masterKey?: Buffer,
    rotationPolicy?: KeyRotationPolicy,
    tlsConfig?: TLSConfig
  ) {
    // Use provided master key or generate a new one
    this.masterKey = masterKey || crypto.randomBytes(32);

    this.rotationPolicy = rotationPolicy || {
      rotationIntervalDays: 90,
      autoRotate: true,
      maxKeyAgeDays: 365,
    };

    this.tlsConfig = tlsConfig || {
      minVersion: 'TLSv1.3',
      cipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
      ],
    };

    // Generate initial encryption key
    this.generateKey();
  }

  /**
   * Generate a new encryption key
   */
  generateKey(algorithm: EncryptionAlgorithm = 'aes-256-gcm'): EncryptionKey {
    const keyId = `key-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const encryptionKey: EncryptionKey = {
      id: keyId,
      version: 1,
      key,
      iv,
      createdAt: new Date(),
      lastRotatedAt: new Date(),
      isActive: true,
      algorithm,
    };

    // Deactivate previous active key
    if (this.activeKeyId) {
      const previousKey = this.keys.get(this.activeKeyId);
      if (previousKey) {
        previousKey.isActive = false;
      }
    }

    this.keys.set(keyId, encryptionKey);
    this.activeKeyId = keyId;

    return encryptionKey;
  }

  /**
   * Encrypt data at rest
   */
  encrypt(data: string, keyId?: string): EncryptedData {
    const targetKeyId = keyId || this.activeKeyId;
    if (!targetKeyId) {
      throw new Error('No encryption key available');
    }

    const key = this.keys.get(targetKeyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${targetKeyId}`);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(key.algorithm, key.key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const result: EncryptedData = {
      data: encrypted,
      keyId: key.id,
      keyVersion: key.version,
      iv: iv.toString('hex'),
      algorithm: key.algorithm,
    };

    // Add auth tag for GCM mode
    if (key.algorithm === 'aes-256-gcm') {
      result.authTag = (cipher as any).getAuthTag().toString('hex');
    }

    return result;
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: EncryptedData): string {
    const key = this.keys.get(encryptedData.keyId);
    if (!key) {
      throw new Error(`Decryption key not found: ${encryptedData.keyId}`);
    }

    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(key.algorithm, key.key, iv);

    // Set auth tag for GCM mode
    if (key.algorithm === 'aes-256-gcm' && encryptedData.authTag) {
      (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    }

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt sensitive fields in an object
   */
  encryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[]
  ): T {
    const result = { ...obj };

    for (const field of sensitiveFields) {
      if (result[field] !== undefined && result[field] !== null) {
        const value = String(result[field]);
        const encrypted = this.encrypt(value);
        result[field] = encrypted as any;
      }
    }

    return result;
  }

  /**
   * Decrypt sensitive fields in an object
   */
  decryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[]
  ): T {
    const result = { ...obj };

    for (const field of sensitiveFields) {
      if (result[field] !== undefined && result[field] !== null) {
        const encrypted = result[field] as any as EncryptedData;
        if (encrypted.data && encrypted.keyId) {
          const decrypted = this.decrypt(encrypted);
          result[field] = decrypted as any;
        }
      }
    }

    return result;
  }

  /**
   * Rotate encryption keys
   */
  rotateKey(): EncryptionKey {
    const newKey = this.generateKey();

    // Re-encrypt data with new key would happen here in a real implementation
    // For now, we just generate the new key and mark old ones as inactive

    return newKey;
  }

  /**
   * Check if key rotation is needed
   */
  isRotationNeeded(keyId?: string): boolean {
    const targetKeyId = keyId || this.activeKeyId;
    if (!targetKeyId) return true;

    const key = this.keys.get(targetKeyId);
    if (!key) return true;

    const daysSinceRotation = 
      (Date.now() - key.lastRotatedAt.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceRotation >= this.rotationPolicy.rotationIntervalDays;
  }

  /**
   * Check if key has exceeded maximum age
   */
  isKeyExpired(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return true;

    const daysSinceCreation = 
      (Date.now() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceCreation >= this.rotationPolicy.maxKeyAgeDays;
  }

  /**
   * Get active encryption key
   */
  getActiveKey(): EncryptionKey | null {
    if (!this.activeKeyId) return null;
    return this.keys.get(this.activeKeyId) || null;
  }

  /**
   * Get encryption key by ID
   */
  getKey(keyId: string): EncryptionKey | undefined {
    return this.keys.get(keyId);
  }

  /**
   * Get all encryption keys
   */
  getAllKeys(): EncryptionKey[] {
    return Array.from(this.keys.values());
  }

  /**
   * Get TLS configuration
   */
  getTLSConfig(): TLSConfig {
    return { ...this.tlsConfig };
  }

  /**
   * Update TLS configuration
   */
  updateTLSConfig(config: Partial<TLSConfig>): void {
    this.tlsConfig = {
      ...this.tlsConfig,
      ...config,
    };
  }

  /**
   * Get key rotation policy
   */
  getRotationPolicy(): KeyRotationPolicy {
    return { ...this.rotationPolicy };
  }

  /**
   * Update key rotation policy
   */
  updateRotationPolicy(policy: Partial<KeyRotationPolicy>): void {
    this.rotationPolicy = {
      ...this.rotationPolicy,
      ...policy,
    };
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify data integrity using HMAC
   */
  generateHMAC(data: string, secret?: string): string {
    const key = secret || this.masterKey.toString('hex');
    return crypto
      .createHmac('sha256', key)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, hmac: string, secret?: string): boolean {
    const expectedHMAC = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(expectedHMAC)
    );
  }
}
