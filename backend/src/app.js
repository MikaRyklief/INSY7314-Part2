import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import xssClean from 'xss-clean';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRouter from './routes/auth.js';
import paymentsRouter from './routes/payments.js';
import securityRouter from './routes/security.js';
import staffRouter from './routes/staff.js';
import { csrfProtection, handleCsrfErrors } from './middleware/csrf.js';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  const defaultDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
  const contentSecurityPolicy = {
    ...defaultDirectives,
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'connect-src': ["'self'", ...config.security.allowOrigins],
    'frame-ancestors': ["'none'"]
  };

  app.use(helmet({
    contentSecurityPolicy: {
      directives: contentSecurityPolicy
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-origin' }
  }));

  const rateLimiter = rateLimit({
    windowMs: config.security.rateLimitWindowMinutes * 60 * 1000,
    max: config.security.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use(rateLimiter);
  app.use(hpp());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.security.allowOrigins.includes(origin)) {
        callback(null, origin || true);
        return;
      }
      callback(new Error('CORS policy violation'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token']
  }));

  app.use(express.json({ limit: '10kb' }));
  app.use(xssClean());
  app.use(cookieParser());

  app.use('/api/security', securityRouter);
  app.use('/api/auth', csrfProtection, authRouter);
  app.use('/api/payments', csrfProtection, paymentsRouter);
  app.use('/api/staff', csrfProtection, staffRouter);

  app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found.' });
  });

  app.use(handleCsrfErrors);

  app.use((err, req, res, next) => {
    // eslint-disable-line no-unused-vars
    res.status(500).json({ status: 'error', message: 'Unexpected server error.' });
  });

  return app;
};
