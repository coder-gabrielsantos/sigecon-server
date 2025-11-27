const jwt = require("jsonwebtoken");

/**
 * requireAuth:
 * - lê Authorization: Bearer <token>
 * - valida
 * - coloca req.user = { id, role }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      adminId: decoded.adminId ?? null,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

module.exports = {
  requireAuth
};
