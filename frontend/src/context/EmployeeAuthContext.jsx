import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient, { fetchCsrfToken } from '../api/client.js';
import { validateEmployeeLoginPayload } from '../utils/validators.js';

const EmployeeAuthContext = createContext(undefined);

const sanitizeLoginPayload = (payload) => ({
  employeeId: payload.employeeId.trim(),
  password: payload.password
});

export const EmployeeAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      await fetchCsrfToken();
      const response = await apiClient.get('/staff/me');
      if (response.data?.employee) {
        setEmployee(response.data.employee);
      } else {
        setEmployee(null);
      }
    } catch (err) {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const loginEmployee = useCallback(async (payload) => {
    const errors = validateEmployeeLoginPayload(payload);
    if (errors.length > 0) {
      return { success: false, errors };
    }
    try {
      await fetchCsrfToken();
      const response = await apiClient.post('/staff/login', sanitizeLoginPayload(payload));
      setEmployee(response.data?.employee);
      return { success: true, employee: response.data?.employee };
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      const message = err.response?.data?.message || 'Unable to login.';
      return { success: false, errors: serverErrors || [message] };
    }
  }, []);

  const logoutEmployee = useCallback(async () => {
    try {
      await fetchCsrfToken();
      await apiClient.post('/staff/logout');
      setEmployee(null);
      return { success: true };
    } catch (err) {
      return { success: false, errors: ['Unable to logout.'] };
    }
  }, []);

  const value = {
    employee,
    loading,
    loginEmployee,
    logoutEmployee,
    refreshSession: loadSession
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

EmployeeAuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};
