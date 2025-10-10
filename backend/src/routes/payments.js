import express from 'express';
import { requireCustomerAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { validatePaymentPayload, PROVIDERS } from '../utils/validators.js';
import { createPayment, listPaymentsForCustomer, findPaymentById } from '../db/index.js';

const router = express.Router();

router.get(
  '/',
  requireCustomerAuth,
  async (req, res) => {
    try {
      const payments = await listPaymentsForCustomer(req.user.id);
      res.json({ status: 'ok', payments });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Unable to retrieve payments.' });
    }
  }
);

router.post(
  '/',
  requireCustomerAuth,
  validateBody(validatePaymentPayload),
  async (req, res) => {
    try {
      const payload = {
        customerId: req.user.id,
        amount: Number(req.body.amount),
        currency: String(req.body.currency).trim(),
        provider: String(req.body.provider).trim(),
        beneficiaryAccount: String(req.body.beneficiaryAccount).trim().toUpperCase(),
        swiftCode: String(req.body.swiftCode).trim().toUpperCase()
      };

      const result = await createPayment(payload);
      const payment = await findPaymentById(result.id);
      if (!payment) {
        throw new Error('Payment not found after creation');
      }
      res.status(201).json({
        status: 'ok',
        payment
      });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Unable to create payment.' });
    }
  }
);

router.get('/providers', requireCustomerAuth, (req, res) => {
  res.json({
    status: 'ok',
    providers: PROVIDERS.map((provider) => ({
      id: provider,
      name: provider
    }))
  });
});

export default router;
