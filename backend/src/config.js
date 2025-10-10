import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: process.env.NODE_ENV === 'test'
    ? path.resolve(__dirname, '..', '..', '.env.test')
    : path.resolve(__dirname, '..', '.env')
});

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8443),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET,
  mongo: {
    uri: process.env.MONGO_URI,
    dbName: process.env.MONGO_DB_NAME
  },
  ssl: {
    keyPath: process.env.SSL_KEY_PATH || path.resolve(__dirname, '..', '..', 'certs', 'server.key'),
    certPath: process.env.SSL_CERT_PATH || path.resolve(__dirname, '..', '..', 'certs', 'server.crt'),
    caPath: process.env.SSL_CA_PATH || ''
  },
  security: {
    rateLimitWindowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15),
    rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
    cookieSecure: isProduction,
    allowOrigins: (process.env.ALLOWED_ORIGINS || 'https://localhost:5173').split(',').map(origin => origin.trim())
  }
};

if (!config.jwtSecret) {
  throw new Error('Missing JWT_SECRET. Please set it in the environment.');
}
