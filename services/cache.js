/**
 * Cache Service - 3-Level Caching Strategy
 *
 * Implements efficient caching with TTL-based auto-expiration
 * Reduces database queries and improves response times
 *
 * Cache Instances:
 * - userPrefs: User preferences (5 min TTL)
 * - dashboardStats: Dashboard analytics (30 min TTL)
 * - userSettings: User settings (1 hour TTL)
 */

let NodeCache;
try {
  NodeCache = require('node-cache');
} catch (err) {
  console.warn('⚠️ node-cache not installed. Install with: npm install node-cache');
  // Fallback: create a simple in-memory cache
  NodeCache = class {
    constructor() {
      this.data = new Map();
    }
    get(key) { return this.data.get(key); }
    set(key, value) { this.data.set(key, value); }
    del(key) { this.data.delete(key); }
    flushAll() { this.data.clear(); }
  };
}

/**
 * Cache configuration with TTL (in seconds)
 * - stdTTL: Standard Time To Live
 * - checkperiod: Auto-cleanup check interval
 */
const cacheConfigs = {
  userPrefs: { stdTTL: 300, checkperiod: 60 },     // 5 minutes
  dashboardStats: { stdTTL: 1800, checkperiod: 300 }, // 30 minutes
  userSettings: { stdTTL: 3600, checkperiod: 600 }  // 1 hour
};

// Initialize cache instances
const caches = {
  userPrefs: new NodeCache(cacheConfigs.userPrefs),
  dashboardStats: new NodeCache(cacheConfigs.dashboardStats),
  userSettings: new NodeCache(cacheConfigs.userSettings)
};

// Track cache statistics
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  startTime: Date.now()
};

/**
 * Cache Service - Unified interface for all cache operations
 */
const CacheService = {
  /**
   * Get user preferences from cache
   * @param {string} userId - User ID
   * @returns {Object|null} Cached preferences or null
   */
  getUserPreferences: function(userId) {
    const key = `user:prefs:${userId}`;
    const value = caches.userPrefs.get(key);
    if (value) {
      stats.hits++;
      return value;
    }
    stats.misses++;
    return null;
  },

  /**
   * Set user preferences in cache
   * @param {string} userId - User ID
   * @param {Object} preferences - Preferences object
   */
  setUserPreferences: function(userId, preferences) {
    const key = `user:prefs:${userId}`;
    caches.userPrefs.set(key, preferences);
    stats.sets++;
  },

  /**
   * Get dashboard statistics from cache
   * @param {string} userId - User ID
   * @returns {Object|null} Cached stats or null
   */
  getDashboardStats: function(userId) {
    const key = `dashboard:stats:${userId}`;
    const value = caches.dashboardStats.get(key);
    if (value) {
      stats.hits++;
      return value;
    }
    stats.misses++;
    return null;
  },

  /**
   * Set dashboard statistics in cache
   * @param {string} userId - User ID
   * @param {Object} statsData - Statistics object
   */
  setDashboardStats: function(userId, statsData) {
    const key = `dashboard:stats:${userId}`;
    caches.dashboardStats.set(key, statsData);
    stats.sets++;
  },

  /**
   * Get user settings from cache
   * @param {string} userId - User ID
   * @returns {Object|null} Cached settings or null
   */
  getUserSettings: function(userId) {
    const key = `user:settings:${userId}`;
    const value = caches.userSettings.get(key);
    if (value) {
      stats.hits++;
      return value;
    }
    stats.misses++;
    return null;
  },

  /**
   * Set user settings in cache
   * @param {string} userId - User ID
   * @param {Object} settings - Settings object
   */
  setUserSettings: function(userId, settings) {
    const key = `user:settings:${userId}`;
    caches.userSettings.set(key, settings);
    stats.sets++;
  },

  /**
   * Invalidate user preference cache
   * @param {string} userId - User ID to invalidate
   */
  invalidateUserPreferences: function(userId) {
    const key = `user:prefs:${userId}`;
    caches.userPrefs.del(key);
    stats.deletes++;
  },

  /**
   * Invalidate dashboard stats cache
   * @param {string} userId - User ID to invalidate
   */
  invalidateDashboardStats: function(userId) {
    const key = `dashboard:stats:${userId}`;
    caches.dashboardStats.del(key);
    stats.deletes++;
  },

  /**
   * Invalidate user settings cache
   * @param {string} userId - User ID to invalidate
   */
  invalidateUserSettings: function(userId) {
    const key = `user:settings:${userId}`;
    caches.userSettings.del(key);
    stats.deletes++;
  },

  /**
   * Invalidate all caches for a user
   * @param {string} userId - User ID to invalidate
   */
  invalidateAllUserCaches: function(userId) {
    this.invalidateUserPreferences(userId);
    this.invalidateDashboardStats(userId);
    this.invalidateUserSettings(userId);
  },

  /**
   * Get comprehensive cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats: function() {
    const uptime = Date.now() - stats.startTime;
    const hitRate = stats.hits + stats.misses > 0
      ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
      : 0;

    return {
      summary: {
        hits: stats.hits,
        misses: stats.misses,
        sets: stats.sets,
        deletes: stats.deletes,
        hitRate: `${hitRate}%`,
        uptime: `${(uptime / 1000).toFixed(1)}s`
      },
      caches: {
        userPrefs: {
          size: caches.userPrefs.getStats().keys,
          config: cacheConfigs.userPrefs
        },
        dashboardStats: {
          size: caches.dashboardStats.getStats().keys,
          config: cacheConfigs.dashboardStats
        },
        userSettings: {
          size: caches.userSettings.getStats().keys,
          config: cacheConfigs.userSettings
        }
      }
    };
  },

  /**
   * Clear all caches
   */
  clearAllCaches: function() {
    caches.userPrefs.flushAll();
    caches.dashboardStats.flushAll();
    caches.userSettings.flushAll();
    stats.deletes += 3;
  },

  /**
   * Reset statistics
   */
  resetStats: function() {
    stats.hits = 0;
    stats.misses = 0;
    stats.sets = 0;
    stats.deletes = 0;
    stats.startTime = Date.now();
  }
};

module.exports = CacheService;
