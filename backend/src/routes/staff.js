import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  findEmployeeByCredentials,
  findEmployeeById,
  listPaymentsForReview,
  updatePaymentStatus,
  findPaymentForReview,
  isValidDocumentId
} from '../db/index.js';
import { config } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { requireEmployeeAuth } from '../middleware/auth.js';
import {
  validateEmployeeLoginPayload,
  validatePaymentReviewPayload
} from '../utils/validators.js';

const router = express.Router();

const EMPLOYEE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.security.cookieSecure,
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 8 // 8 hours
};

router.post(
  '/login',
  validateBody(validateEmployeeLoginPayload),
  async (req, res) => {
    try {
      const employeeId = String(req.body.employeeId).trim();
      const password = String(req.body.password);

      const employee = await findEmployeeByCredentials({ employeeId });
      if (!employee) {
        res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
        return;
      }

      const passwordMatches = await bcrypt.compare(password, employee.passwordHash);
      if (!passwordMatches) {
        res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
        return;
      }

      const tokenPayload = {
        sub: employee.id,
        fullName: employee.fullName,
        employeeId: employee.employeeId,
        role: 'employee'
      };
      const token = jwt.sign(tokenPayload, config.jwtSecret, {
        expiresIn: '8h',
        issuer: 'secure-payments'
      });

      res.cookie('employee_session', token, EMPLOYEE_COOKIE_OPTIONS);
      res.json({
        status: 'ok',
        employee: {
          id: employee.id,
          fullName: employee.fullName,
          employeeId: employee.employeeId,
          role: 'employee'
        }
      });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Unable to login.' });
    }
  }
);

router.post('/logout', (req, res) => {
  res.clearCookie('employee_session', {
    httpOnly: true,
    secure: config.security.cookieSecure,
    sameSite: 'strict'
  });
  res.json({ status: 'ok', message: 'Logged out.' });
});

router.get('/me', requireEmployeeAuth, async (req, res) => {
  try {
    const employee = await findEmployeeById(req.user.id);
    if (!employee) {
      res.status(404).json({ status: 'error', message: 'Employee not found.' });
      return;
    }
    res.json({ status: 'ok', employee: { ...employee, role: 'employee' } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Unable to fetch profile.' });
  }
});

router.get('/payments', requireEmployeeAuth, async (req, res) => {
  try {
    const payments = await listPaymentsForReview();
    const allowedStatuses = (req.query?.status || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const filteredPayments = allowedStatuses.length
      ? payments.filter((payment) => allowedStatuses.includes(payment.status.toLowerCase()))
      : payments;

    res.json({ status: 'ok', payments: filteredPayments });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Unable to retrieve payments.' });
  }
});

router.post(
  '/payments/:paymentId/status',
  requireEmployeeAuth,
  validateBody(validatePaymentReviewPayload),
  async (req, res) => {
    const paymentId = String(req.params.paymentId).trim();
    if (!isValidDocumentId(paymentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid payment reference.' });
      return;
    }

    const status = String(req.body.status).toLowerCase();

    try {
      const existingPayment = await findPaymentForReview(paymentId);
      if (!existingPayment) {
        res.status(404).json({ status: 'error', message: 'Payment not found.' });
        return;
      }

      if (existingPayment.status === status) {
        res.json({ status: 'ok', payment: existingPayment });
        return;
      }

      await updatePaymentStatus({ paymentId, status });
      const payment = await findPaymentForReview(paymentId);
      res.json({ status: 'ok', payment });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Unable to update payment status.' });
    }
  }
);

router.post('/payments/submit', requireEmployeeAuth, async (req, res) => {
  try {
    const payments = await listPaymentsForReview();
    const verifiedCount = payments.filter((payment) => payment.status === 'verified').length;
    res.json({
      status: 'ok',
      message: `Submitted ${verifiedCount} verified payment(s) to SWIFT.`,
      submitted: verifiedCount
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Unable to submit payments.' });
  }
});

export default router;
