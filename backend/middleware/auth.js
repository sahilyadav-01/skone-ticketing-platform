const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getAuthFromHeaders(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice('bearer '.length).trim();
    return { type: 'jwt', token };
  }

  return { type: 'none' };
}

async function authMiddleware(req, res, next) {
  try {

    // Developer bypass support: allow bypass via query ?bypass=1 or header X-DEV-BYPASS: 1
    const isBypassQuery = String(req.query?.bypass || '') === '1';
    const isBypassHeader = String(req.headers['x-dev-bypass'] || '') === '1';
    if (isBypassQuery || isBypassHeader) {
      // Build user from headers or query params: X-User-Id, X-User-Role, X-User-Name
      const userId = req.headers['x-user-id'] || req.query?.b_user_id || '9999';
      const role = req.headers['x-user-role'] || req.query?.b_role || 'Admin';
      const username = req.headers['x-user-name'] || req.query?.b_username || 'Dev Bypass';
      req.user = { user_id: Number(userId), role: String(role), username: String(username) };
      return next();
    }

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

