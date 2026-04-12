import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpMethod, FeatureFlagAction, FeatureFlag } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface FeatureFlagCache {
  [key: string]: boolean; // key = "METHOD:path", value = is_active
}

interface RouteContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface DiscoveredRoute {
  module: string;
  method: HttpMethod;
  path: string;
}

@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagService.name);
  private cache: FeatureFlagCache = {};
  private cacheInitialized = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Cache will be initialized after routes are synced
    // This is handled by main.ts
  }

  /**
   * Load all feature flags into memory cache
   */
  async loadCache(): Promise<void> {
    try {
      const flags = await this.prisma.featureFlag.findMany({
        where: { is_deleted: false },
        select: {
          method: true,
          path: true,
          is_active: true,
        },
      });

      this.cache = {};
      for (const flag of flags) {
        const key = this.getCacheKey(flag.method, flag.path);
        this.cache[key] = flag.is_active;
      }

      this.cacheInitialized = true;
      this.logger.log(`✅ Loaded ${flags.length} feature flags into cache`);
    } catch (error) {
      this.logger.error('Failed to load feature flags cache', error);
      throw error;
    }
  }

  /**
   * Invalidate cache and reload from database
   */
  async invalidateCache(): Promise<void> {
    await this.loadCache();
  }

  /**
   * Get cache key from method and path
   */
  private getCacheKey(method: string, path: string): string {
    return `${method}:${path}`;
  }

  /**
   * Normalize path for matching (remove trailing slash, handle params)
   */
  private normalizePath(path: string): string {
    // Remove trailing slash
    let normalized =
      path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    // Ensure starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    return normalized;
  }

  /**
   * Check if a route is enabled (from cache, instant response)
   */
  isRouteEnabled(method: string, path: string): boolean {
    // If cache not initialized, allow all (fail-open for startup)
    if (!this.cacheInitialized) {
      return true;
    }

    const normalizedPath = this.normalizePath(path);
    const key = this.getCacheKey(method.toUpperCase(), normalizedPath);

    // If route not in cache, it's enabled by default
    if (!(key in this.cache)) {
      return true;
    }

    return this.cache[key];
  }

  /**
   * Sync routes from NestJS application
   * Discovers all registered routes and ensures they exist in the database
   */
  async syncRoutes(routes: DiscoveredRoute[]): Promise<void> {
    this.logger.log(`🔄 Syncing ${routes.length} discovered routes...`);

    try {
      // Get all existing feature flags
      const existingFlags = await this.prisma.featureFlag.findMany({
        select: {
          id: true,
          method: true,
          path: true,
          is_deleted: true,
        },
      });

      const existingMap = new Map<
        string,
        { id: string; is_deleted: boolean }
      >();
      for (const flag of existingFlags) {
        const key = this.getCacheKey(flag.method, flag.path);
        existingMap.set(key, { id: flag.id, is_deleted: flag.is_deleted });
      }

      // Track which routes exist in the current application
      const currentRouteKeys = new Set<string>();

      for (const route of routes) {
        const normalizedPath = this.normalizePath(route.path);
        const key = this.getCacheKey(route.method, normalizedPath);
        currentRouteKeys.add(key);

        const existing = existingMap.get(key);

        if (!existing) {
          // Create new feature flag
          await this.prisma.featureFlag.create({
            data: {
              module: route.module,
              method: route.method,
              path: normalizedPath,
              is_active: true,
              is_deleted: false,
            },
          });
          this.logger.debug(
            `Created feature flag: ${route.method} ${normalizedPath}`,
          );
        } else if (existing.is_deleted) {
          // Restore soft-deleted flag if route exists again
          await this.prisma.featureFlag.update({
            where: { id: existing.id },
            data: { is_deleted: false, deleted_at: null },
          });
          this.logger.debug(
            `Restored feature flag: ${route.method} ${normalizedPath}`,
          );
        }
      }

      // Soft delete flags for routes that no longer exist
      for (const [key, existing] of existingMap) {
        if (!currentRouteKeys.has(key) && !existing.is_deleted) {
          await this.prisma.featureFlag.update({
            where: { id: existing.id },
            data: { is_deleted: true, deleted_at: new Date() },
          });
          this.logger.debug(`Soft-deleted feature flag: ${key}`);
        }
      }

      // Load cache after sync
      await this.loadCache();
      this.logger.log('✅ Feature flags sync completed');
    } catch (error) {
      this.logger.error('Failed to sync routes', error);
      throw error;
    }
  }

  /**
   * Get all feature flags with pagination
   */
  async getAll(options?: {
    page?: number;
    limit?: number;
    module?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
    search?: string;
  }): Promise<{ data: FeatureFlag[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    const andConditions: any[] = [];

    if (!options?.includeDeleted) {
      where.is_deleted = false;
    }

    if (options?.module) {
      where.module = options.module;
    }

    if (options?.isActive !== undefined) {
      where.is_active = options.isActive;
    }

    // Handle text search
    if (options?.search && options.search.trim().length > 0) {
      const searchTerm = options.search.trim();
      // Note: 'method' is an enum, checking for contains(string) causes issues or is invalid.
      // We focus on path and module for text search.
      const searchConditions = [
        { path: { contains: searchTerm, mode: 'insensitive' } },
        { module: { contains: searchTerm, mode: 'insensitive' } },
      ];

      // If the search term exactly matches an HTTP method, include it (optional/advanced)
      // But for now, safely searching path and module is sufficient and fixes the crash/ignore issue.

      // Allow explicit OR composition to ensure it doesn't get overridden
      if (Object.keys(where).length > 0) {
        // If we have other conditions (e.g. module, is_active), we must combine search carefully
        // Prisma supports implicit top-level props as AND, but let's be explicit
      }
      where.OR = searchConditions;
    }

    const [data, total] = await Promise.all([
      this.prisma.featureFlag.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ module: 'asc' }, { path: 'asc' }],
      }),
      this.prisma.featureFlag.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get feature flag by ID
   */
  async getById(id: string): Promise<FeatureFlag | null> {
    return this.prisma.featureFlag.findUnique({
      where: { id },
      include: { logs: { take: 10, orderBy: { created_at: 'desc' } } },
    });
  }

  /**
   * Get feature flag stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [total, active] = await Promise.all([
      this.prisma.featureFlag.count({ where: { is_deleted: false } }),
      this.prisma.featureFlag.count({
        where: { is_deleted: false, is_active: true },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }

  /**
   * Get distinct modules
   */
  async getModules(): Promise<string[]> {
    const results = await this.prisma.featureFlag.findMany({
      where: { is_deleted: false },
      distinct: ['module'],
      select: { module: true },
      orderBy: { module: 'asc' },
    });
    return results.map((r) => r.module);
  }

  /**
   * Toggle feature flag status
   */
  async toggle(
    id: string,
    isActive: boolean,
    context: RouteContext,
  ): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    const previousState = flag.is_active;

    // Update flag
    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: { is_active: isActive },
    });

    // Create log entry
    await this.prisma.featureFlagLog.create({
      data: {
        feature_flag_id: id,
        action: isActive
          ? FeatureFlagAction.ENABLED
          : FeatureFlagAction.DISABLED,
        previous_state: previousState,
        new_state: isActive,
        user_id: context.userId,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        description: `Feature flag ${isActive ? 'enabled' : 'disabled'} for ${flag.method} ${flag.path}`,
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    return updated;
  }

  /**
   * Bulk toggle feature flags
   */
  async bulkToggle(
    ids: string[],
    isActive: boolean,
    context: RouteContext,
  ): Promise<{ updated: number }> {
    const flags = await this.prisma.featureFlag.findMany({
      where: { id: { in: ids }, is_deleted: false },
    });

    for (const flag of flags) {
      await this.prisma.featureFlag.update({
        where: { id: flag.id },
        data: { is_active: isActive },
      });

      await this.prisma.featureFlagLog.create({
        data: {
          feature_flag_id: flag.id,
          action: isActive
            ? FeatureFlagAction.ENABLED
            : FeatureFlagAction.DISABLED,
          previous_state: flag.is_active,
          new_state: isActive,
          user_id: context.userId,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          description: `Bulk ${isActive ? 'enable' : 'disable'} for ${flag.method} ${flag.path}`,
        },
      });
    }

    // Invalidate cache
    await this.invalidateCache();

    return { updated: flags.length };
  }

  /**
   * Get logs for a feature flag
   */
  async getLogs(
    featureFlagId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: any[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.featureFlagLog.findMany({
        where: { feature_flag_id: featureFlagId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.featureFlagLog.count({
        where: { feature_flag_id: featureFlagId },
      }),
    ]);

    return { data, total };
  }
}
