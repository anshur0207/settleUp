const rateLimit = require('express-rate-limit');

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 requests per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many actions from this user, please try again later.',
  handler: (req, res) => {
    res.status(429).json({
      message: 'You are performing this action too fast. Please wait a moment.',
    });
  },
  keyGenerator: (req, res) => {
    // If the user is logged in, rate limit by their ID instead of IP
    // This perfectly solves the proxy IP sharing issue while preventing abuse
    return req.user ? req.user.id : req.ip;
  }
});

module.exports = strictLimiter;
