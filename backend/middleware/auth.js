const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getAuthFromHeaders(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice('bearer '.length).trim();
    return { type: 'jwt', token };
  }

  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  if (userId && userRole) {
    return { type: 'header', userId, userRole };
  }

  return { type: 'none' };
}

async function authMiddleware(req, res, next) {
  try {
    const auth = getAuthFromHeaders(req);

    if (auth.type === 'jwt') {
      const payload = jwt.verify(auth.token, JWT_SECRET);
      req.user = {
        user_id: payload.user_id,
        role: payload.role,
        username: payload.username,
      };
      return next();
    }

    if (auth.type === 'header') {
      req.user = {
        user_id: Number(auth.userId),
        role: String(auth.userRole),
      };
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = String(req.user.role);
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
  JWT_SECRET,
};

