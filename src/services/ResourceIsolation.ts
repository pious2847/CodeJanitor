/**
 * Resource Isolation
 * 
 * Provides resource isolation between organizations:
 * - Separate resource pools per organization
 * - Fair resource allocation
 * - Resource usage tracking and enforcement
 * 
 * Requirements: 6.6
 */

/**
 * Resource pool for an organization
 */
export interface ResourcePool {
  organizationId: string;
  maxMemoryMB: number;
  maxCPUPercent: number;
  maxConcurrentOperations: number;
  currentMemoryMB: number;
  currentCPUPercent: number;
  currentOperations: number;
}

/**
 * Resource allocation request
 */
export interface ResourceRequest {
  organizationId: string;
  estimatedMemoryMB: number;
  estimatedCPUPercent: number;
  priority: 'low' | 'normal' | 'high';
}

/**
 * Resource allocation result
 */
export interface ResourceAllocation {
  allocated: boolean;
  reason?: string;
  resourceId?: string;
}

/**
 * Resource Isolation Manager
 * Ensures fair resource allocation across organizations
 */
export class ResourceIsolation {
  private resourcePools: Map<string, ResourcePool> = new Map();
  private allocations: Map<string, ResourceRequest> = new Map();
  private nextAllocationId = 0;

  /**
   * Create resource pool for an organization
   */
  createResourcePool(
    organizationId: string,
    maxMemoryMB: number,
    maxCPUPercent: number,
    maxConcurrentOperations: number
  ): void {
    this.resourcePools.set(organizationId, {
      organizationId,
      maxMemoryMB,
      maxCPUPercent,
      maxConcurrentOperations,
      currentMemoryMB: 0,
      currentCPUPercent: 0,
      currentOperations: 0,
    });
  }

  /**
   * Request resource allocation
   */
  requestResources(request: ResourceRequest): ResourceAllocation {
    const pool = this.resourcePools.get(request.organizationId);
    
    if (!pool) {
      // No pool configured, allow by default
      const resourceId = this.generateResourceId();
      this.allocations.set(resourceId, request);
      return { allocated: true, resourceId };
    }

    // Check if resources are available
    if (pool.currentOperations >= pool.maxConcurrentOperations) {
      return {
        allocated: false,
        reason: 'Maximum concurrent operations reached',
      };
    }

    if (pool.currentMemoryMB + request.estimatedMemoryMB > pool.maxMemoryMB) {
      return {
        allocated: false,
        reason: 'Insufficient memory available',
      };
    }

    if (pool.currentCPUPercent + request.estimatedCPUPercent > pool.maxCPUPercent) {
      return {
        allocated: false,
        reason: 'Insufficient CPU available',
      };
    }

    // Allocate resources
    pool.currentMemoryMB += request.estimatedMemoryMB;
    pool.currentCPUPercent += request.estimatedCPUPercent;
    pool.currentOperations++;

    const resourceId = this.generateResourceId();
    this.allocations.set(resourceId, request);

    return { allocated: true, resourceId };
  }

  /**
   * Release allocated resources
   */
  releaseResources(resourceId: string): boolean {
    const request = this.allocations.get(resourceId);
    if (!request) {
      return false;
    }

    const pool = this.resourcePools.get(request.organizationId);
    if (pool) {
      pool.currentMemoryMB = Math.max(0, pool.currentMemoryMB - request.estimatedMemoryMB);
      pool.currentCPUPercent = Math.max(0, pool.currentCPUPercent - request.estimatedCPUPercent);
      pool.currentOperations = Math.max(0, pool.currentOperations - 1);
    }

    this.allocations.delete(resourceId);
    return true;
  }

  /**
   * Get resource pool status
   */
  getResourcePoolStatus(organizationId: string): ResourcePool | null {
    return this.resourcePools.get(organizationId) || null;
  }

  /**
   * Get all resource pools
   */
  getAllResourcePools(): ResourcePool[] {
    return Array.from(this.resourcePools.values());
  }

  /**
   * Update resource pool limits
   */
  updateResourcePool(
    organizationId: string,
    updates: Partial<Pick<ResourcePool, 'maxMemoryMB' | 'maxCPUPercent' | 'maxConcurrentOperations'>>
  ): boolean {
    const pool = this.resourcePools.get(organizationId);
    if (!pool) {
      return false;
    }

    if (updates.maxMemoryMB !== undefined) {
      pool.maxMemoryMB = updates.maxMemoryMB;
    }
    if (updates.maxCPUPercent !== undefined) {
      pool.maxCPUPercent = updates.maxCPUPercent;
    }
    if (updates.maxConcurrentOperations !== undefined) {
      pool.maxConcurrentOperations = updates.maxConcurrentOperations;
    }

    return true;
  }

  /**
   * Get resource utilization statistics
   */
  getUtilizationStats() {
    const pools = Array.from(this.resourcePools.values());
    
    return {
      totalPools: pools.length,
      totalAllocations: this.allocations.size,
      averageMemoryUtilization: this.calculateAverageUtilization(
        pools,
        p => p.currentMemoryMB / p.maxMemoryMB
      ),
      averageCPUUtilization: this.calculateAverageUtilization(
        pools,
        p => p.currentCPUPercent / p.maxCPUPercent
      ),
      averageOperationUtilization: this.calculateAverageUtilization(
        pools,
        p => p.currentOperations / p.maxConcurrentOperations
      ),
    };
  }

  /**
   * Calculate average utilization
   */
  private calculateAverageUtilization(
    pools: ResourcePool[],
    calculator: (pool: ResourcePool) => number
  ): number {
    if (pools.length === 0) {
      return 0;
    }

    const sum = pools.reduce((acc, pool) => acc + calculator(pool), 0);
    return sum / pools.length;
  }

  /**
   * Generate unique resource ID
   */
  private generateResourceId(): string {
    return `resource_${Date.now()}_${this.nextAllocationId++}`;
  }

  /**
   * Cleanup and reset
   */
  cleanup(): void {
    // Reset all current usage to 0
    for (const pool of this.resourcePools.values()) {
      pool.currentMemoryMB = 0;
      pool.currentCPUPercent = 0;
      pool.currentOperations = 0;
    }
    this.allocations.clear();
  }
}
