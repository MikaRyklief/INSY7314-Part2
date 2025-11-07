# Secure International Payments Portal

This project delivers a secure international payments experience for both customers and bank employees. Customers capture cross-border transfers via a React SPA, while pre-registered staff review, verify, and forward payments to SWIFT using a hardened employee workspace. All traffic flows through a Node.js/Express API that enforces strict validation, TLS-only transport, and defensive controls suitable for sensitive banking workloads.

## Key Features

- **Customer portal** - Pre-provisioned logins capture international payments and track statuses (pending, verified, rejected).
- **Employee workspace** - Dedicated staff login, payment queue with filters, verification/rejection actions, and SWIFT submission summary.
- **Security-first foundation** - Bcrypt password hashing, strict input whitelisting, CSRF protection, secure cookies, and opinionated security headers.
- **Automated governance** - CircleCI workflow (`.circleci/config.yml`) that enforces linting, builds, and security scans on every push.

## Architecture Overview

- **Backend (`backend/`)** - Express API served exclusively over HTTPS, persisted in MongoDB (Atlas or any compatible cluster) via the official driver, with CSRF middleware and layered security hardening.
- **Frontend (`frontend/`)** - React SPA (Vite) that communicates with the API using Axios, HTTP-only session cookies, and CSRF tokens. Includes both customer and employee interfaces.
- **Database** - MongoDB cluster with enforced unique indexes for customers, employees, and payments plus seed data for initial employee access.
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
  - Controlled MongoDB queries with strict filter objects and unique indexes to prevent injection.

### Threat coverage

- **Session jacking** – JWTs are issued in HTTP-only, `SameSite=strict` cookies with bcrypt-hashed credentials and short lifetimes.
- **Clickjacking** – Helmet’s CSP denies all frames (`frame-ancestors 'none'`) and the app hides the `X-Powered-By` hint.
- **Injection attacks** – Validators sanitize inputs, Mongo queries whitelist fields, and unique indexes plus ObjectId casting block crafted payloads.
- **Cross-site scripting** – Strict CSP, `xss-clean`, payload validation, and template escaping prevent script injection.
- **Man-in-the-middle** – The API only serves over HTTPS with TLSv1.2+, and the frontend calls the same secure origin.
- **DDoS** – `express-rate-limit` throttles bursts, body payloads are capped at 10kb, and additional WAF guidance is included below.

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
   - `backend/.env`: provide a strong `JWT_SECRET`, adjust `PORT`/`ALLOWED_ORIGINS`, and set `MONGO_URI` plus `MONGO_DB_NAME` to point at your MongoDB Atlas cluster (or self-hosted replica set). Allow your local IP in the Atlas network access list.
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
   - Customer access is provisioned centrally — self-service registration is disabled by design.
   - Seed credentials for secure testing:
      - Customer 1: `Nomsa Dlamini` — ID `8501011234088`, Account `110000123456`, Password `Customer!2024`
      - Customer 2: `Daniel Naidoo` — ID `9005057654085`, Account `210098765432`, Password `GlobalPay!2024`
      - Employee: `OPS001` / `OpsPortal!2024`

## CI/CD & Automation (CircleCI)

The CircleCI pipeline (`.circleci/config.yml`) runs on every push:

1. Installs backend dependencies with `npm ci`, lints the API, runs automated API smoke tests, and executes `npm run security-scan` (`npm audit --audit-level=high`).
2. Installs frontend dependencies, runs ESLint, and builds the React application.
3. Executes a SonarQube scan (`sonar-scanner`) to surface hotspots and code smells (configure `SONAR_TOKEN`, `SONAR_HOST_URL`, and `SONAR_PROJECT_KEY` in CircleCI project settings).

### First-time setup

1. Push your changes to the remote repository.
2. Sign in at [CircleCI](https://app.circleci.com), select this project, and click **Set Up Project** (no starter config required).
3. Confirm the default branch; CircleCI will pull the repo and run the `build_and_secure` workflow automatically.

### Local verification

```bash
# Backend
cd backend
npm install
npm run lint
npm run test:api
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

## Future Runtime Hardening 

- Protect the API behind a WAF or API gateway with additional DDoS safeguards.
- Store secrets in a vault service (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault) instead of `.env` files.
- Enable MongoDB encryption at rest, restrict network ingress to trusted CIDRs, and schedule secure point-in-time backups of the cluster.
- Monitor logs for repeated authentication failures and integrate alerts with your SIEM.

## YouTube Link

- https://youtu.be/LcZwnxqDG4c?si=pu4kwPPyZ_n18nWX