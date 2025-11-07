import { useMemo, useState } from 'react';
import LoginForm from './components/LoginForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import EmployeeLoginForm from './components/EmployeeLoginForm.jsx';
import EmployeeDashboard from './components/EmployeeDashboard.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useEmployeeAuth } from './context/EmployeeAuthContext.jsx';

const App = () => {

  const { user, loading: customerLoading, loginCustomer, logoutCustomer } = useAuth();
  const {
    employee,
    loading: employeeLoading,
    loginEmployee,
    logoutEmployee
  } = useEmployeeAuth();

  const [portal, setPortal] = useState('customer');
  const portalDescription = useMemo(() => (
    portal === 'customer'
      ? 'Pre-enrolled customers can capture and track secure international payments.'
      : 'Authorised employees can review and forward captured international payments.'
  ), [portal]);

  const renderPortalContent = () => {
    if (portal === 'customer') {
      if (customerLoading) {
        return (
          <div className="card">
            <h2>Loading secure customer dashboard...</h2>
          </div>
        );
      }

      if (user) {
        return <Dashboard user={user} onLogout={logoutCustomer} />;
      }

      return (
        <>
          <LoginForm onLogin={loginCustomer} />
          <div className="card info-card" role="note">
            <h3>Need access?</h3>
            <p>
              Customer accounts are provisioned by our compliance team. Visit your nearest branch or contact support to enrol.
            </p>
          </div>
        </>
      );
    }

    if (employeeLoading) {
      return (
        <div className="card">
          <h2>Loading employee workspace...</h2>
        </div>
      );
    }

    return employee
      ? <EmployeeDashboard employee={employee} onLogout={logoutEmployee} />
      : <EmployeeLoginForm onLogin={loginEmployee} />;
  };

  return (
    <main className="container">
      <section className="card header-card">
        <h1>Secure International Payments Portal</h1>
        <div className="toggle portal-toggle" role="radiogroup" aria-label="Select portal">
          <button
            type="button"
            role="radio"
            aria-checked={portal === 'customer'}
            className={portal === 'customer' ? 'active' : ''}
            onClick={() => setPortal('customer')}
          >
            Customer portal
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={portal === 'employee'}
            className={portal === 'employee' ? 'active' : ''}
            onClick={() => setPortal('employee')}
          >
            Employee portal
          </button>
        </div>
        <p>{portalDescription}</p>
      </section>

      {renderPortalContent()}
    </main>
  );
};

export default App;
