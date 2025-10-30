const { CORS_ORIGINS } = require("./env");

const corsOptions = {
  origin(origin, cb) {
    // permite requests sem Origin (ex.: curl, healthcheck)
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // ok mesmo usando Bearer; não quebra
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600, // cache do preflight (10min)
};

module.exports = { corsOptions };
