/**
 * Authentication Middleware
 * 
 * Handles API key and token-based authentication
 */

import * as http from 'http';
import { AuthResult } from '../types';
import { User } from '../../models/enterprise';

export interface AuthConfig {
  apiKeys?: Map<string, User>;
  jwtSecret?: string;
}

export class AuthenticationManager {
  private apiKeys: Map<string, User> = new Map();

  constructor(config?: AuthConfig) {
    if (config?.apiKeys) {
      this.apiKeys = config.apiKeys;
    }
  }

  /**
   * Authenticate incoming request
   */
  async authenticate(req: http.IncomingMessage): Promise<AuthResult> {
    // Try API key authentication
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return this.authenticateApiKey(apiKey);
    }

    // Try Bearer token authentication
    const authHeader = req.headers['authorization'] as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return this.authenticateToken(token);
    }

    return {
      success: false,
      error: 'No authentication credentials provided',
    };
  }

  /**
   * Authenticate using API key
   */
  private authenticateApiKey(apiKey: string): AuthResult {
    const user = this.apiKeys.get(apiKey);
    
    if (user) {
      return {
        success: true,
        user,
      };
    }

    return {
      success: false,
      error: 'Invalid API key',
    };
  }

  /**
   * Authenticate using JWT token
   */
  private authenticateToken(token: string): AuthResult {
    try {
      // Simple token validation (in production, use proper JWT library)
      const decoded = this.decodeToken(token);
      
      if (!decoded || !decoded.userId) {
        return {
          success: false,
          error: 'Invalid token',
        };
      }

      // In production, fetch user from database
      const user: User = {
        id: decoded.userId,
        email: decoded.email || '',
        name: decoded.name || '',
        role: decoded.role || 'developer',
      };

      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Token validation failed',
      };
    }
  }

  /**
   * Decode JWT token (simplified version)
   */
  private decodeToken(token: string): any {
    try {
      // In production, use proper JWT library like jsonwebtoken
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        return null;
      }

      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(payload);
    } catch (error) {
      return null;
    }
  }

  /**
   * Register API key for a user
   */
  registerApiKey(apiKey: string, user: User): void {
    this.apiKeys.set(apiKey, user);
  }

  /**
   * Revoke API key
   */
  revokeApiKey(apiKey: string): void {
    this.apiKeys.delete(apiKey);
  }

  /**
   * Generate API key
   */
  generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = 'cj_';
    for (let i = 0; i < 32; i++) {
      apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return apiKey;
  }
}
