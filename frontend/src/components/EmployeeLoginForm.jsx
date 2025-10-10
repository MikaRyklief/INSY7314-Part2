import { useState } from 'react';
import PropTypes from 'prop-types';

const INITIAL_FORM_STATE = {
  employeeId: '',
  password: ''
};

const EmployeeLoginForm = ({ onLogin }) => {
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      const result = await onLogin(formState);
      if (!result.success) {
        setErrors(result.errors || ['Unable to login.']);
        return;
      }
      setFormState(INITIAL_FORM_STATE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card" aria-labelledby="employee-login-heading">
      <h2 id="employee-login-heading">Employee sign in</h2>
      <p className="helper-text">
        Use your assigned employee ID and strong password to access the payments workspace.
      </p>

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <p>{errors[0]}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="employeeId">Employee ID</label>
        <input
          id="employeeId"
          type="text"
          name="employeeId"
          value={formState.employeeId}
          onChange={handleChange}
          placeholder="OPS001"
          autoComplete="username"
          required
        />

        <label htmlFor="employeePassword">Password</label>
        <input
          id="employeePassword"
          type="password"
          name="password"
          value={formState.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in securely'}
        </button>
      </form>
    </section>
  );
};

EmployeeLoginForm.propTypes = {
  onLogin: PropTypes.func.isRequired
};

export default EmployeeLoginForm;
