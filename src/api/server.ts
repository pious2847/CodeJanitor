/**
 * REST API Server for CodeJanitor Enterprise
 * 
 * Provides comprehensive REST API for all enterprise functionality with:
 * - API versioning and backward compatibility
 * - Rate limiting and authentication
 * - Comprehensive error handling
 */

import * as http from 'http';
import * as url from 'url';
import { RateLimiter } from './middleware/rateLimiter';
import { AuthenticationManager } from './middleware/authentication';
import { ApiRouter } from './router';
import { ApiResponse, ApiError } from './types';

export interface ServerConfig {
  port: number;
  host: string;
  apiVersion: string;
  enableRateLimiting: boolean;
  enableAuthentication: boolean;
  corsOrigins: string[];
}

export class ApiServer {
  private server: http.Server | null = null;
  private rateLimiter: RateLimiter;
  private authManager: AuthenticationManager;
  private router: ApiRouter;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    });
    this.authManager = new AuthenticationManager();
    this.router = new ApiRouter(config.apiVersion);
  }

  /**
   * Start the API server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer(async (req, res) => {
          await this.handleRequest(req, res);
        });

        this.server.listen(this.config.port, this.config.host, () => {
          console.log(`API Server running at http://${this.config.host}:${this.config.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      // Set CORS headers
      this.setCorsHeaders(res);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Parse URL
      const parsedUrl = url.parse(req.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      // Rate limiting
      if (this.config.enableRateLimiting) {
        const clientId = this.getClientId(req);
        if (!this.rateLimiter.checkLimit(clientId)) {
          this.sendError(res, {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            statusCode: 429,
          });
          return;
        }
      }

      // Authentication
      if (this.config.enableAuthentication) {
        const authResult = await this.authManager.authenticate(req);
        if (!authResult.success) {
          this.sendError(res, {
            code: 'AUTHENTICATION_FAILED',
            message: authResult.error || 'Authentication required',
            statusCode: 401,
          });
          return;
        }
        // Attach user to request
        (req as any).user = authResult.user;
      }

      // Route the request
      const response = await this.router.route(req, pathname, parsedUrl.query);
      this.sendResponse(res, response);
    } catch (error) {
      console.error('Request handling error:', error);
      this.sendError(res, {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Set CORS headers
   */
  private setCorsHeaders(res: http.ServerResponse): void {
    const allowedOrigins = this.config.corsOrigins;
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(','));
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientId(req: http.IncomingMessage): string {
    // Use API key if available, otherwise use IP address
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return `api-key:${apiKey}`;
    }

    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    return `ip:${ip}`;
  }

  /**
   * Send successful response
   */
  private sendResponse(res: http.ServerResponse, response: ApiResponse): void {
    res.writeHead(response.statusCode || 200, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(response));
  }

  /**
   * Send error response
   */
  private sendError(res: http.ServerResponse, error: ApiError): void {
    res.writeHead(error.statusCode || 500, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    }));
  }
}
