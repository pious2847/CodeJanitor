/**
 * API Types and Interfaces
 */

import { User } from '../models/enterprise';

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  statusCode?: number;
  meta?: {
    version: string;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * API Error
 */
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API endpoint handler
 */
export type ApiHandler = (
  req: any,
  params: Record<string, string>,
  query: Record<string, any>,
  body?: any
) => Promise<ApiResponse>;

/**
 * Route definition
 */
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: ApiHandler;
  requiresAuth?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}
