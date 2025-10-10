import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import apiClient, { fetchCsrfToken } from '../api/client.js';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' }
];

const STATUS_LABELS = {
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected'
};

const formatStatus = (status) => STATUS_LABELS[status] || status;

const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleString();
};

const EmployeeDashboard = ({ employee, onLogout }) => {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await fetchCsrfToken();
      const response = await apiClient.get('/staff/payments');
      setPayments(response.data?.payments || []);
    } catch (err) {
      setError('Unable to load payments for review.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    if (filter === 'all') {
      return payments;
    }
    return payments.filter((payment) => payment.status === filter);
  }, [payments, filter]);

  const verifiedCount = useMemo(
    () => payments.filter((payment) => payment.status === 'verified').length,
    [payments]
  );

  const handleStatusChange = useCallback(async (paymentId, status) => {
    setUpdatingPaymentId(paymentId);
    setActionMessage('');
    setError('');
    try {
      await fetchCsrfToken();
      const response = await apiClient.post(`/staff/payments/${paymentId}/status`, { status });
      if (response.data?.payment) {
        setPayments((prev) => prev.map((payment) => {
          if (payment.id === paymentId) {
            return response.data.payment;
          }
          return payment;
        }));

        let message = 'Payment marked as rejected.';
        if (status === 'verified') {
          message = 'Payment marked as verified.';
        }
        setActionMessage(message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update payment status.');
    } finally {
      setUpdatingPaymentId(null);
    }
  }, []);

  const handleSubmitToSwift = useCallback(async () => {
    setSubmitting(true);
    setActionMessage('');
    setError('');
    try {
      await fetchCsrfToken();
      const response = await apiClient.post('/staff/payments/submit');
      const message = response.data?.message || 'Submitted verified payments to SWIFT.';
      setActionMessage(message);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit payments to SWIFT.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleLogout = async () => {
    await onLogout();
  };

  const submitButtonLabel = useMemo(() => {
    if (submitting) {
      return 'Submitting to SWIFT...';
    }
    if (verifiedCount === 0) {
      return 'Submit verified payments to SWIFT';
    }
    const paymentLabel = verifiedCount === 1 ? 'payment' : 'payments';
    return `Submit ${verifiedCount} verified ${paymentLabel} to SWIFT`;
  }, [submitting, verifiedCount]);

  let paymentsContent;
  if (loading) {
    paymentsContent = <p>Loading payments for review...</p>;
  } else if (filteredPayments.length === 0) {
    paymentsContent = <p>No payments match the selected filter.</p>;
  } else {
    paymentsContent = (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Customer</th>
              <th scope="col">Amount</th>
              <th scope="col">Provider</th>
              <th scope="col">Beneficiary</th>
              <th scope="col">SWIFT</th>
              <th scope="col">Status</th>
              <th scope="col">Captured</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => {
              const isUpdating = updatingPaymentId === payment.id;
              let verifyLabel = 'Verify';
              let rejectLabel = 'Reject';

              if (isUpdating && payment.status !== 'verified') {
                verifyLabel = 'Verifying...';
              }

              if (isUpdating && payment.status !== 'rejected') {
                rejectLabel = 'Rejecting...';
              }

              return (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>
                    <strong>{payment.customerName}</strong>
                    <div className="muted-text">Account {payment.customerAccountNumber}</div>
                  </td>
                  <td>
                    {Number(payment.amount).toFixed(2)} {payment.currency}
                  </td>
                  <td>{payment.provider}</td>
                  <td>{payment.beneficiaryAccount}</td>
                  <td>{payment.swiftCode}</td>
                  <td>
                    <span className={`status-badge status-${payment.status}`}>
                      {formatStatus(payment.status)}
                    </span>
                  </td>
                  <td>{formatDateTime(payment.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn-verify"
                        disabled={isUpdating || payment.status === 'verified'}
                        onClick={() => handleStatusChange(payment.id, 'verified')}
                      >
                        {verifyLabel}
                      </button>
                      <button
                        type="button"
                        className="btn-reject"
                        disabled={isUpdating || payment.status === 'rejected'}
                        onClick={() => handleStatusChange(payment.id, 'rejected')}
                      >
                        {rejectLabel}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <header className="toolbar">
        <div>
          <h1>International Payments Workspace</h1>
          <p>Employee review and forwarding</p>
        </div>
        <div className="identity">
          <p>{employee.fullName}</p>
          <p>ID: {employee.employeeId}</p>
          <button type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
        </div>
      )}

      {actionMessage && (
        <div className="success-box" role="status">
          <p>{actionMessage}</p>
        </div>
      )}

      <section className="card">
        <div className="employee-controls">
          <h2>Captured payments</h2>
          <div className="control-actions">
            <div
              className="toggle filter-toggle"
              role="radiogroup"
              aria-label="Filter payments by status"
            >
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={filter === option.id}
                  className={filter === option.id ? 'active' : ''}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={loadPayments}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {paymentsContent}

        <div className="swift-submit">
          <p className="helper-text">
            Verified payments are queued for the next SWIFT release.
          </p>
          <button
            type="button"
            disabled={verifiedCount === 0 || submitting}
            onClick={handleSubmitToSwift}
          >
            {submitButtonLabel}
          </button>
        </div>
      </section>
    </>
  );
};

EmployeeDashboard.propTypes = {
  employee: PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    employeeId: PropTypes.string.isRequired
  }).isRequired,
  onLogout: PropTypes.func.isRequired
};

export default EmployeeDashboard;
