const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");

/**
 * Gera um token JWT com o id do usuário e a role (ADMIN / OPERADOR)
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

module.exports = generateToken;
