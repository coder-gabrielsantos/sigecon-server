/**
 * requireRole("ADMIN")
 * bloqueia se req.user.role !== "ADMIN"
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Sem permissão" });
    }
    next();
  };
}

module.exports = {
  requireRole
};
