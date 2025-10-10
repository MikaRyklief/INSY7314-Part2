# Secure International Payments Portal

This project delivers a secure international payments experience for both customers and bank employees. Customers capture cross-border transfers via a React SPA, while pre-registered staff review, verify, and forward payments to SWIFT using a hardened employee workspace. All traffic flows through a Node.js/Express API that enforces strict validation, TLS-only transport, and defensive controls suitable for sensitive banking workloads.

## Key Features

- **Customer portal** - Registration, login, and payment capture with status tracking (pending, verified, rejected).
- **Employee workspace** - Dedicated staff login, payment queue with filters, verification/rejection actions, and SWIFT submission summary.
- **Security-first foundation** - Bcrypt password hashing, strict input whitelisting, CSRF protection, secure cookies, and opinionated security headers.
- **Automated governance** - GitHub Actions workflow (`.github/workflows/ci.yml`) linting, building, and auditing every change.

## Architecture Overview

- **Backend (`backend/`)** - Express API served exclusively over HTTPS, backed by SQLite (`backend/data/payments.db`) with parameterised queries, CSRF middleware, and layered security hardening.
- **Frontend (`frontend/`)** - React SPA (Vite) that communicates with the API using Axios, HTTP-only session cookies, and CSRF tokens. Includes both customer and employee interfaces.
- **Database** – SQLite database (backend/data/payments.db) created automatically with hardened schema and parameterised statements.
- **Certificates** - Provide PEM encoded key/cert pairs in `backend/certs/server.key` and `backend/certs/server.crt`. Use self-signed certificates for local development or a trusted CA in higher environments.

## Security Controls

- **Password safety** - All customer and employee passwords are hashed with bcrypt (12 rounds) before storage.
- **Input whitelisting** - Client and server share strict RegEx validators for names, South African ID numbers, account numbers, currencies, providers, beneficiary accounts, and SWIFT codes.
- **SSL/TLS enforcement** - The API only listens via HTTPS and the frontend dev server is configured to target the same secure origin.
- **Defence in depth**
  - Helmet headers (CSP with `frame-ancestors 'none'`, HSTS, referrer policy).
  - CORS allow-list with credential support.
  - CSRF protection via `csurf` (double-submit cookie) and Axios interceptors.
  - XSS mitigation (`xss-clean`), HTTP parameter pollution protection (`hpp`), and JSON body size limits.
  - Rate limiting, secure session cookies, and strict SameSite policies.
  - Parameterised SQL statements to prevent injection.

## Getting Started

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd INSY7314-Part2

   cd backend
   npm install
   cp .env.example .env

   cd ../frontend
   npm install
   cp .env.example .env
   ```

2. **Generate local SSL/TLS certificates (example)**
   ```bash
   cd backend/certs
   openssl req -x509 -nodes -newkey rsa:4096 \
     -keyout server.key -out server.crt -days 365 \
     -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=InternalBank/OU=Payments/CN=localhost"
   ```
   Copy the same `server.key` and `server.crt` to the frontend (or point Vite to them) so both apps operate over HTTPS.

3. **Configure environment variables**
   - `backend/.env`: provide a strong `JWT_SECRET`, adjust `PORT`, `ALLOWED_ORIGINS`, and database paths if required.
   - `frontend/.env`: set `VITE_API_BASE_URL` to the backend HTTPS origin (for example `https://localhost:8445`).
   - Restart the API if you change the port to avoid conflicts.

4. **Run the stack**
   ```bash
   # Terminal 1 - API
   cd backend
   npm run dev

   # Terminal 2 - React app
   cd frontend
   npm run dev
   ```
   Open `https://localhost:5173` in the browser and accept the self-signed certificate if prompted.

5. **Default access**
   - Customers register with their South African ID number (used as the username), account number, and strong password.
   - A seed employee account is created automatically:
     - Employee ID: `OPS001`
     - Password: `OpsPortal!2024`

## DevSecOps Pipeline and Automation

The repository ships with the `secure-ci` GitHub Actions workflow that runs on every push, pull request, or manual trigger:

1. Installs dependencies for `backend` and `frontend`.
2. Runs ESLint on both projects.
3. Builds the React app.
4. Executes `npm run security-scan` (`npm audit --audit-level=high`) for the API.
5. Performs a dedicated dependency audit job to block high severity issues from promotion.

To mirror the pipeline locally after pulling fresh code:
```bash
# Backend
cd backend
npm install
npm run lint
npm run security-scan

# Frontend
cd ../frontend
npm install
npm run lint
npm run build
```

## Operational Notes

- Customer payment submissions default to `pending` and appear instantly in the employee workspace for verification.
- Staff actions update the shared database so customer status badges reflect `Verified` or `Rejected` in real time.
- Staff use the "Submit to SWIFT" control to record that verified payments have been forwarded downstream (integration stubbed for now, Future updates).

## Runtime Hardening 

- Protect the API behind a WAF or API gateway with additional DDoS safeguards.
- Store secrets in a vault service (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault) instead of `.env` files.
- Enable database encryption at rest and schedule secure backups of `payments.db`.
- Monitor logs for repeated authentication failures and integrate alerts with your SIEM.
