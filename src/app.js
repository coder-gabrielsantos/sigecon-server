const express = require("express");
const cors = require("cors");
const { CORS_ORIGINS } = require("./config/env");
const errorHandler = require("./middleware-error/errorHandler");

const app = express();

/** CORS */
const corsOptions = {
  origin(origin, cb) {
    // Permite requisições sem Origin (ex.: curl/healthcheck)
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600, // cache do preflight (10 min)
};

app.use(cors(corsOptions));
// Trata preflight de todos os caminhos
app.options(/.*/, cors(corsOptions));

app.use(express.json());

/** Rotas */
app.use("/auth", require("./routes/auth.routes"));
app.use("/usuarios", require("./routes/users.routes"));
app.use("/contracts", require("./routes/contracts.routes"));

/** Handler global de erros */
app.use(errorHandler);

module.exports = app;
