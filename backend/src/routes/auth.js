import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createCustomer, findCustomerByCredentials, findCustomerById } from '../db/index.js';
import { config } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { validateLoginPayload, validateRegistrationPayload } from '../utils/validators.js';
import { requireCustomerAuth } from '../middleware/auth.js';

const router = express.Router();

const ISSUE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.security.cookieSecure,
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 8 // 8 hours
};

router.post(
  '/register',
  validateBody(validateRegistrationPayload),
  async (req, res) => {
    try {
      const fullName = String(req.body.fullName).trim();
      const idNumber = String(req.body.idNumber).trim();
      const accountNumber = String(req.body.accountNumber).trim();
      const password = String(req.body.password);
      const passwordHash = await bcrypt.hash(password, 12);

      const result = await createCustomer({
        fullName,
        idNumber,
        accountNumber,
        passwordHash
      });

      const tokenPayload = {
        sub: result.id,
        fullName,
        accountNumber,
        role: 'customer'
      };
      const token = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: '8h',
        issuer: 'secure-payments'
      });

      res.cookie('session', token, ISSUE_COOKIE_OPTIONS);
      res.status(201).json({
        status: 'ok',
        message: 'Registration successful.',
        user: {
          id: result.id,
          fullName,
          accountNumber,
          role: 'customer'
        }
      });
    } catch (err) {
      if (err?.code === 'DUPLICATE_CUSTOMER') {
        res.status(409).json({
          status: 'error',
          message: 'A customer with that ID number or account already exists.'
        });
        return;
      }
      res.status(500).json({ status: 'error', message: 'Unable to complete registration.' });
    }
  }
);

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

      const passwordMatches = await bcrypt.compare(password, customer.passwordHash);
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
