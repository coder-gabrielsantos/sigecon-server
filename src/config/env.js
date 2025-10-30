require("dotenv").config();

const CORS_ORIGINS = process.env.CORS_ORIGINS
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT || 3306,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  CORS_ORIGINS,
};
