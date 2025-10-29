/**
 * Captura qualquer erro lançado nos controllers/services
 * e responde com JSON consistente.
 */
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || "Erro interno";

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
