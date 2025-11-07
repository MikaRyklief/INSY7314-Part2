import { useState } from 'react';
import PropTypes from 'prop-types';
import { validateLoginPayload } from '../utils/validators.js';

const initialFormState = {
  username: '',
  accountNumber: '',
  password: ''
};

const LoginForm = ({ onLogin }) => {
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors([]);

    const validationErrors = validateLoginPayload(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    const result = await onLogin(form);
    if (!result.success) {
      setErrors(result.errors || ['Login failed.']);
    } else {
      setForm(initialFormState);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Customer Login</h2>
      <p className="helper-text">
        Use the 13 digit ID number and account number issued to you during onboarding.
      </p>

      <label htmlFor="username">Username (ID Number)</label>
      <input
        id="username"
        name="username"
        type="text"
        inputMode="numeric"
        value={form.username}
        onChange={handleChange}
        required
        pattern="^\d{13}$"
        placeholder="13 digit ID number"
      />

      <label htmlFor="accountNumber">Account Number</label>
      <input
        id="accountNumber"
        name="accountNumber"
        type="text"
        inputMode="numeric"
        value={form.accountNumber}
        onChange={handleChange}
        required
        pattern="^\d{10,20}$"
        placeholder="10-20 digit account number"
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        value={form.password}
        onChange={handleChange}
        required
        placeholder="Your secure password"
      />

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
};

LoginForm.propTypes = {
  onLogin: PropTypes.func.isRequired
};

export default LoginForm;
