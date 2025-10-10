import PropTypes from 'prop-types';

const formatStatus = (status) => {
  if (!status) {
    return 'Unknown';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const PaymentList = ({ payments }) => {
  if (!payments.length) {
    return (
      <div className="card">
        <h2>Recent Payments</h2>
        <p>No international payments captured yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Recent Payments</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Amount</th>
              <th scope="col">Currency</th>
              <th scope="col">Provider</th>
              <th scope="col">Beneficiary</th>
              <th scope="col">SWIFT</th>
              <th scope="col">Status</th>
              <th scope="col">Captured</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>{Number(payment.amount).toFixed(2)}</td>
                <td>{payment.currency}</td>
                <td>{payment.provider}</td>
                <td>{payment.beneficiaryAccount}</td>
                <td>{payment.swiftCode}</td>
                <td>
                  <span className={`status-badge status-${payment.status}`}>
                    {formatStatus(payment.status)}
                  </span>
                </td>
                <td>{new Date(payment.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

PaymentList.propTypes = {
  payments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    amount: PropTypes.number.isRequired,
    currency: PropTypes.string.isRequired,
    provider: PropTypes.string.isRequired,
    beneficiaryAccount: PropTypes.string.isRequired,
    swiftCode: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string
  })).isRequired
};

export default PaymentList;
