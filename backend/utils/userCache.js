const NodeCache = require('node-cache');

// Cache users for 5 minutes — avoids hitting DB on every authenticated request
const userCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Get cached user by ID. Returns null if not cached.
 */
const getCachedUser = (userId) => {
  return userCache.get(userId) || null;
};

/**
 * Cache a user object. Strips password before caching.
 */
const setCachedUser = (userId, userData) => {
  // Never cache passwords
  const { password, ...safeUser } = userData;
  userCache.set(userId, safeUser);
};

/**
 * Invalidate a user from cache (e.g. after profile update).
 */
const invalidateUser = (userId) => {
  userCache.del(userId);
};

/**
 * Clear entire user cache.
 */
const clearUserCache = () => {
  userCache.flushAll();
};

module.exports = { getCachedUser, setCachedUser, invalidateUser, clearUserCache };
