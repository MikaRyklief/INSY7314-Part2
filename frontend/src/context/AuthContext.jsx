import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient, { fetchCsrfToken } from '../api/client.js';
import { validateLoginPayload, validateRegistrationPayload } from '../utils/validators.js';

const AuthContext = createContext(undefined);

const sanitizeRegistrationPayload = (payload) => ({
  fullName: payload.fullName.trim(),
  idNumber: payload.idNumber.trim(),
  accountNumber: payload.accountNumber.trim(),
  password: payload.password
});

const sanitizeLoginPayload = (payload) => ({
  username: payload.username.trim(),
  accountNumber: payload.accountNumber.trim(),
  password: payload.password
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      await fetchCsrfToken();
      const response = await apiClient.get('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const registerCustomer = useCallback(async (payload) => {
    const errors = validateRegistrationPayload(payload);
    if (errors.length > 0) {
      return { success: false, errors };
    }
    try {
      await fetchCsrfToken();
      const response = await apiClient.post('/auth/register', sanitizeRegistrationPayload(payload));
      setUser(response.data?.user);
      return { success: true, user: response.data?.user };
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      const message = err.response?.data?.message || 'Unable to register.';
      return { success: false, errors: serverErrors || [message] };
    }
  }, []);

  const loginCustomer = useCallback(async (payload) => {
    const errors = validateLoginPayload(payload);
    if (errors.length > 0) {
      return { success: false, errors };
    }
    try {
      await fetchCsrfToken();
      const response = await apiClient.post('/auth/login', sanitizeLoginPayload(payload));
      setUser(response.data?.user);
      return { success: true, user: response.data?.user };
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      const message = err.response?.data?.message || 'Unable to login.';
      return { success: false, errors: serverErrors || [message] };
    }
  }, []);

  const logoutCustomer = useCallback(async () => {
    try {
      await fetchCsrfToken();
      await apiClient.post('/auth/logout');
      setUser(null);
      return { success: true };
    } catch (err) {
      return { success: false, errors: ['Unable to logout.'] };
    }
  }, []);

  const value = {
    user,
    loading,
    registerCustomer,
    loginCustomer,
    logoutCustomer,
    refreshSession: loadSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
