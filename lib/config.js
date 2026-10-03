const path = require('path');

const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);

module.exports = {
  PORT: Number(env('PORT', 3000)),
  BASE_URL: env('BASE_URL', '').replace(/\/$/, ''),
  SESSION_SECRET: env('SESSION_SECRET', 'dev-only-secret-change-me'),
  PRODUCTION: env('NODE_ENV', '') === 'production',
  DATA_DIR: env('DATA_DIR', path.join(__dirname, '..', 'data')),
  MASTER_USERNAME: env('MASTER_USERNAME', ''),
  MASTER_PASSWORD: env('MASTER_PASSWORD', ''),
  MASTER_NAME: env('MASTER_NAME', 'Wosy'),
  COUNT_NAME: env('COUNT_NAME', ''),
  COUNTESS_NAME: env('COUNTESS_NAME', ''),
  CURRENT_YEAR: Number(env('CURRENT_YEAR', 226))
};
