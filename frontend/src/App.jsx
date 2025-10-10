import { useMemo, useState } from 'react';
import RegistrationForm from './components/RegistrationForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import EmployeeLoginForm from './components/EmployeeLoginForm.jsx';
import EmployeeDashboard from './components/EmployeeDashboard.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useEmployeeAuth } from './context/EmployeeAuthContext.jsx';

const App = () => {
  const {
    user,
    loading: customerLoading,
    registerCustomer,
    loginCustomer,
    logoutCustomer
  } = useAuth();
  const {
    employee,
    loading: employeeLoading,
    loginEmployee,
    logoutEmployee
  } = useEmployeeAuth();

  const [portal, setPortal] = useState('customer');
  const [customerMode, setCustomerMode] = useState('login');

  const portalDescription = useMemo(() => (
    portal === 'customer'
      ? 'Register to capture international payments or sign in with your verified details.'
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

      return customerMode === 'register'
        ? <RegistrationForm onRegister={registerCustomer} />
        : <LoginForm onLogin={loginCustomer} />;
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
        {portal === 'customer' && !user && (
          <div className="toggle" role="radiogroup" aria-label="Customer options">
            <button
              type="button"
              role="radio"
              aria-checked={customerMode === 'login'}
              className={customerMode === 'login' ? 'active' : ''}
              onClick={() => setCustomerMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={customerMode === 'register'}
              className={customerMode === 'register' ? 'active' : ''}
              onClick={() => setCustomerMode('register')}
            >
              Register
            </button>
          </div>
        )}
      </section>

      {renderPortalContent()}
    </main>
  );
};

export default App;
