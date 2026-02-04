/**
 * Tests for Encryption Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from '../EncryptionService';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('Key Generation', () => {
    it('should generate an encryption key on initialization', () => {
      const activeKey = encryptionService.getActiveKey();
      expect(activeKey).toBeDefined();
      expect(activeKey?.isActive).toBe(true);
    });

    it('should generate unique key IDs', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();
      expect(key1.id).not.toBe(key2.id);
    });

    it('should deactivate previous key when generating new one', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();
      
      const oldKey = encryptionService.getKey(key1.id);
      expect(oldKey?.isActive).toBe(false);
      expect(key2.isActive).toBe(true);
    });

    it('should support different encryption algorithms', () => {
      const gcmKey = encryptionService.generateKey('aes-256-gcm');
      const cbcKey = encryptionService.generateKey('aes-256-cbc');
      
      expect(gcmKey.algorithm).toBe('aes-256-gcm');
      expect(cbcKey.algorithm).toBe('aes-256-cbc');
    });
  });

  describe('Data Encryption and Decryption', () => {
    it('should encrypt and decrypt data', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
      expect(encrypted.data).not.toBe(plaintext);
    });

    it('should include key metadata in encrypted data', () => {
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext);
      
      expect(encrypted.keyId).toBeDefined();
      expect(encrypted.keyVersion).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.algorithm).toBeDefined();
    });

    it('should include auth tag for GCM mode', () => {
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext);
      
      expect(encrypted.authTag).toBeDefined();
    });

    it('should encrypt different data to different ciphertexts', () => {
      const plaintext1 = 'data 1';
      const plaintext2 = 'data 2';
      
      const encrypted1 = encryptionService.encrypt(plaintext1);
      const encrypted2 = encryptionService.encrypt(plaintext2);
      
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it('should encrypt same data to different ciphertexts (due to random IV)', () => {
      const plaintext = 'same data';
      
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);
      
      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should throw error when decrypting with missing key', () => {
      const encrypted = {
        data: 'encrypted',
        keyId: 'non-existent-key',
        keyVersion: 1,
        iv: 'iv',
        algorithm: 'aes-256-gcm' as const,
      };
      
      expect(() => encryptionService.decrypt(encrypted)).toThrow();
    });
  });

  describe('Object Encryption', () => {
    it('should encrypt sensitive fields in an object', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
        publicInfo: 'public',
      };
      
      const encrypted = encryptionService.encryptObject(obj, ['email', 'ssn']);
      
      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.publicInfo).toBe('public');
      expect(typeof encrypted.email).toBe('object');
      expect(typeof encrypted.ssn).toBe('object');
    });

    it('should decrypt sensitive fields in an object', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
      };
      
      const encrypted = encryptionService.encryptObject(obj, ['email', 'ssn']);
      const decrypted = encryptionService.decryptObject(encrypted, ['email', 'ssn']);
      
      expect(decrypted.name).toBe('John Doe');
      expect(decrypted.email).toBe('john@example.com');
      expect(decrypted.ssn).toBe('123-45-6789');
    });

    it('should handle null and undefined values', () => {
      const obj = {
        field1: null,
        field2: undefined,
        field3: 'value',
      };
      
      const encrypted = encryptionService.encryptObject(obj, ['field1', 'field2', 'field3']);
      
      expect(encrypted.field1).toBeNull();
      expect(encrypted.field2).toBeUndefined();
      expect(typeof encrypted.field3).toBe('object');
    });
  });

  describe('Key Rotation', () => {
    it('should rotate encryption keys', () => {
      const oldKey = encryptionService.getActiveKey();
      const newKey = encryptionService.rotateKey();
      
      expect(newKey.id).not.toBe(oldKey?.id);
      expect(newKey.isActive).toBe(true);
      expect(oldKey?.isActive).toBe(false);
    });

    it('should check if rotation is needed', () => {
      const service = new EncryptionService(undefined, {
        rotationIntervalDays: 0,
        autoRotate: true,
        maxKeyAgeDays: 365,
      });
      
      expect(service.isRotationNeeded()).toBe(true);
    });

    it('should check if key is expired', () => {
      const service = new EncryptionService(undefined, {
        rotationIntervalDays: 90,
        autoRotate: true,
        maxKeyAgeDays: 0,
      });
      
      const key = service.getActiveKey();
      if (key) {
        expect(service.isKeyExpired(key.id)).toBe(true);
      }
    });

    it('should decrypt data encrypted with old key after rotation', () => {
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext);
      
      encryptionService.rotateKey();
      
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Key Management', () => {
    it('should get active key', () => {
      const activeKey = encryptionService.getActiveKey();
      expect(activeKey).toBeDefined();
      expect(activeKey?.isActive).toBe(true);
    });

    it('should get key by ID', () => {
      const activeKey = encryptionService.getActiveKey();
      if (activeKey) {
        const key = encryptionService.getKey(activeKey.id);
        expect(key).toEqual(activeKey);
      }
    });

    it('should get all keys', () => {
      encryptionService.generateKey();
      encryptionService.generateKey();
      
      const allKeys = encryptionService.getAllKeys();
      expect(allKeys.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('TLS Configuration', () => {
    it('should have default TLS configuration', () => {
      const tlsConfig = encryptionService.getTLSConfig();
      expect(tlsConfig.minVersion).toBe('TLSv1.3');
      expect(tlsConfig.cipherSuites).toHaveLength(3);
    });

    it('should update TLS configuration', () => {
      encryptionService.updateTLSConfig({
        minVersion: 'TLSv1.2',
      });
      
      const tlsConfig = encryptionService.getTLSConfig();
      expect(tlsConfig.minVersion).toBe('TLSv1.2');
    });

    it('should support custom TLS configuration', () => {
      const service = new EncryptionService(undefined, undefined, {
        minVersion: 'TLSv1.2',
        cipherSuites: ['CUSTOM_CIPHER'],
        certPath: '/path/to/cert',
        keyPath: '/path/to/key',
        caPath: '/path/to/ca',
      });
      
      const tlsConfig = service.getTLSConfig();
      expect(tlsConfig.certPath).toBe('/path/to/cert');
      expect(tlsConfig.keyPath).toBe('/path/to/key');
      expect(tlsConfig.caPath).toBe('/path/to/ca');
    });
  });

  describe('Key Rotation Policy', () => {
    it('should have default rotation policy', () => {
      const policy = encryptionService.getRotationPolicy();
      expect(policy.rotationIntervalDays).toBe(90);
      expect(policy.autoRotate).toBe(true);
      expect(policy.maxKeyAgeDays).toBe(365);
    });

    it('should update rotation policy', () => {
      encryptionService.updateRotationPolicy({
        rotationIntervalDays: 30,
        autoRotate: false,
      });
      
      const policy = encryptionService.getRotationPolicy();
      expect(policy.rotationIntervalDays).toBe(30);
      expect(policy.autoRotate).toBe(false);
      expect(policy.maxKeyAgeDays).toBe(365);
    });
  });

  describe('Hashing', () => {
    it('should hash data', () => {
      const data = 'password123';
      const hash = encryptionService.hash(data);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(data);
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce consistent hashes', () => {
      const data = 'test data';
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = encryptionService.hash('data1');
      const hash2 = encryptionService.hash('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Token Generation', () => {
    it('should generate random tokens', () => {
      const token1 = encryptionService.generateToken();
      const token2 = encryptionService.generateToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate tokens of specified length', () => {
      const token = encryptionService.generateToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });
  });

  describe('HMAC', () => {
    it('should generate HMAC for data', () => {
      const data = 'important data';
      const hmac = encryptionService.generateHMAC(data);
      
      expect(hmac).toBeDefined();
      expect(hmac.length).toBe(64); // SHA-256 HMAC produces 64 hex characters
    });

    it('should verify valid HMAC', () => {
      const data = 'important data';
      const hmac = encryptionService.generateHMAC(data);
      
      const isValid = encryptionService.verifyHMAC(data, hmac);
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC', () => {
      const data = 'important data';
      const hmac = encryptionService.generateHMAC(data);
      
      const isValid = encryptionService.verifyHMAC('tampered data', hmac);
      expect(isValid).toBe(false);
    });

    it('should support custom secrets', () => {
      const data = 'data';
      const secret = 'custom-secret';
      
      const hmac = encryptionService.generateHMAC(data, secret);
      const isValid = encryptionService.verifyHMAC(data, hmac, secret);
      
      expect(isValid).toBe(true);
    });
  });
});
