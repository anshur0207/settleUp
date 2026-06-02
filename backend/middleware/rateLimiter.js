const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

const limiter = rateLimit({
  windowMs: isProduction ? 15 * 60 * 1000 : 60 * 1000, // 15 minutes in prod
  max: isProduction ? 5000 : 5000, // significantly increased to avoid proxy issues
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests. Please wait a moment and try again.',
    });
  },
});

module.exports = limiter;
