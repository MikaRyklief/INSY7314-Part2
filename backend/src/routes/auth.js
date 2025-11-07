import express from 'express';
import jwt from 'jsonwebtoken';
import { findCustomerByCredentials, findCustomerById } from '../db/index.js';
import { config } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { validateLoginPayload } from '../utils/validators.js';
import { requireCustomerAuth } from '../middleware/auth.js';
import { verifyPassword } from '../utils/passwords.js';

const router = express.Router();

// Lock customer session cookie against theft via HTTP-only and strict SameSite policies
const ISSUE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.security.cookieSecure,
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 8 // 8 hours
};

router.post('/register', (req, res) => {
  res.status(403).json({
    status: 'error',
    message: 'Self-service registration is disabled. Contact support to provision access.'
  });
});

router.post(
  '/login',
  validateBody(validateLoginPayload),
  async (req, res) => {
    try {
      const username = String(req.body.username).trim();
      const accountNumber = String(req.body.accountNumber).trim();
      const password = String(req.body.password);
      const customer = await findCustomerByCredentials({
        idNumber: username,
        accountNumber
      });

      if (!customer) {
        res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
        return;
      }

      const passwordMatches = await verifyPassword(password, customer.passwordHash);
      if (!passwordMatches) {
        res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
        return;
      }

      const tokenPayload = {
        sub: customer.id,
        fullName: customer.fullName,
        accountNumber: customer.accountNumber,
        role: 'customer'
      };
      const token = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: '8h',
        issuer: 'secure-payments'
      });

      res.cookie('session', token, ISSUE_COOKIE_OPTIONS);
      res.json({
        status: 'ok',
        user: {
          id: customer.id,
          fullName: customer.fullName,
          accountNumber: customer.accountNumber,
          role: 'customer'
        }
      });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Unable to login.' });
    }
  }
);

router.post('/logout', (req, res) => {
  res.clearCookie('session', {
    httpOnly: true,
    secure: config.security.cookieSecure,
    sameSite: 'strict'
  });
  res.json({ status: 'ok', message: 'Logged out.' });
});

router.get('/me', requireCustomerAuth, async (req, res) => {
  try {
    const customer = await findCustomerById(req.user.id);
    if (!customer) {
      res.status(404).json({ status: 'error', message: 'Customer not found.' });
      return;
    }
    res.json({ status: 'ok', user: { ...customer, role: 'customer' } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Unable to fetch profile.' });
  }
});

export default router;
