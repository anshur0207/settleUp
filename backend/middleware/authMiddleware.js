const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { getCachedUser, setCachedUser } = require('../utils/userCache');

const protect = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check cache first — avoids ~200ms DB roundtrip per request
    let user = getCachedUser(decoded.id);

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true, name: true, email: true, currency: true, avatar: true,
          createdAt: true, updatedAt: true, settings: true
        }
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Cache for subsequent requests
      setCachedUser(decoded.id, user);
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

module.exports = { protect };
