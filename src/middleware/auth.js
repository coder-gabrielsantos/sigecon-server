const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

/**
 * requireAuth:
 * - lê Authorization: Bearer <token>
 * - valida
 * - coloca req.user = { id, role }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessão inválida" });
  }
}

module.exports = {
  requireAuth
};
