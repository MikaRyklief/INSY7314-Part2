import fs from 'fs';
import https from 'https';
import { createApp } from './app.js';
import { config } from './config.js';
import { initializeDatabase } from './db/index.js';

const readFileIfExists = (filePath) => {
  if (!filePath) {
    return undefined;
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`SSL file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath);
};

const startServer = async () => {
  try {
    await initializeDatabase();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unable to initialize database connection:', err);
    process.exit(1);
  }

  const app = createApp();

  const sslOptions = {
    key: readFileIfExists(config.ssl.keyPath),
    cert: readFileIfExists(config.ssl.certPath),
    ca: config.ssl.caPath ? readFileIfExists(config.ssl.caPath) : undefined,
    minVersion: 'TLSv1.2',
    requestCert: false,
    rejectUnauthorized: true
  };

  const server = https.createServer(sslOptions, app);

  server.listen(config.port, config.host, () => {
    // eslint-disable-next-line no-console
    console.log(`Secure API listening on https://${config.host}:${config.port}`);
  });

  server.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unable to start HTTPS server:', err);
    process.exit(1);
  });
};

startServer();
