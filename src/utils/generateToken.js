const jwt = require("jsonwebtoken");

/**
 * Gera um token JWT com o id do usuário e a role (ADMIN / OPERADOR)
 */
function generateToken({ id, role, adminId }) {
  const payload = {
    userId: id,
    role,
    adminId: adminId ?? null,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
}

module.exports = generateToken;
