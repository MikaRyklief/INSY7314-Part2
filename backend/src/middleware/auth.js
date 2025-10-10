import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// Validate JWTs stored in HTTP-only cookies so session data never touches client-side JS
const verifyTokenFromCookie = (req, res, cookieName) => {
  const token = req.cookies?.[cookieName];
  if (!token) {
    res.status(401).json({ status: 'error', message: 'Authentication required.' });
    return null;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return payload;
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired session.' });
    return null;
  }
};

export const requireCustomerAuth = (req, res, next) => {
  const payload = verifyTokenFromCookie(req, res, 'session');
  if (!payload) {
    return;
  }

  if (payload.role !== 'customer') {
    res.status(403).json({ status: 'error', message: 'Customer access required.' });
    return;
  }

  req.user = {
    id: payload.sub,
    role: payload.role,
    fullName: payload.fullName,
    accountNumber: payload.accountNumber
  };
  next();
};

export const requireEmployeeAuth = (req, res, next) => {
  const payload = verifyTokenFromCookie(req, res, 'employee_session');
  if (!payload) {
    return;
  }

  if (payload.role !== 'employee') {
    res.status(403).json({ status: 'error', message: 'Employee access required.' });
    return;
  }

  req.user = {
    id: payload.sub,
    role: payload.role,
    fullName: payload.fullName,
    employeeId: payload.employeeId
  };
  next();
};
