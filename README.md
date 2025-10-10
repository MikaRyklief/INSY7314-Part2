# Secure International Payments Portal

This repository implements a secure international payments customer portal (React) and accompanying API (Node.js/Express). The solution is designed for sensitive banking workloads and addresses password safety, input whitelisting, transport security, common attack mitigations, and DevSecOps automation.

## Architecture

- **Backend (`backend/`)** – Express API served exclusively over HTTPS, persists customers and payments in SQLite, enforces strict validation, hashing, and security middleware.
- **Frontend (`frontend/`)** – React single-page application communicating with the API via HTTPS using HTTP-only session cookies and CSRF tokens.
- **Database** – SQLite database (`backend/data/payments.db`) created automatically with hardened schema and parameterised statements.
- **Certificates** – Place PEM encoded private key and certificate in `backend/certs/server.key` and `backend/certs/server.crt` (self-signed is acceptable for internal environments).

## Security Controls

- **Password security** – Customer passwords are hashed with bcrypt (12 rounds) and never stored or returned in plaintext.
- **Input whitelisting** – All inputs are validated on both the client and server using strict regular expressions tailored to South African IDs, bank accounts, SWIFT codes, and ISO currency rules.
- **SSL/TLS enforcement** – The API boots as an HTTPS server only. The React dev server is configured to reuse the same certificates so every request uses TLS in development and production.
- **Attack mitigations**
  - `helmet` CSP/headers, HSTS, referrer policy.
  - Strict CORS allow-list with credential support.
  - CSRF protection using `csurf` with double-submit cookie and Axios interceptor.
  - HTTP parameter pollution and XSS hardening via `hpp` and `xss-clean`.
  - Rate limiting, body size limits, and secure cookies.
  - Parameterised SQL queries prevent injection.
- **DevSecOps pipeline** – GitHub Actions workflow (`.github/workflows/ci.yml`) runs linting, builds, security scanning, and dependency audits on every push/PR.

## Getting Started

1. **Clone & install**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   cd ../frontend
   npm install
   cp .env.example .env
   ```

2. **Generate TLS certificates (self-signed example)**
   ```bash
   cd backend/certs
   openssl req -x509 -nodes -newkey rsa:4096 -keyout server.key -out server.crt -days 365 \
     -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=InternalBank/OU=Payments/CN=localhost"
   ```
   Share the same `server.key` and `server.crt` with the frontend dev server for HTTPS parity.

3. **Configure environment (`backend/.env`)**
   - Set a strong `JWT_SECRET`.
   - Adjust `PORT`, `ALLOWED_ORIGINS` (e.g. `https://localhost:5173`), and database paths as needed.

4. **Run the stack**
   ```bash
   # Terminal 1 (API)
   cd backend
   npm run dev

   # Terminal 2 (React portal)
   cd frontend
   npm run dev
   ```
   Visit `https://localhost:5173`. Accept the self-signed certificate in the browser if prompted.

5. **Operational notes**
   - During registration, the South African ID number doubles as the username for subsequent logins.
   - All state-changing requests automatically include CSRF tokens and rely on HTTP-only session cookies.
   - Payments are stored with status `pending` for back-office processing by SWIFT operators.

## DevSecOps Pipeline

GitHub Actions workflow `secure-ci` executes on every push/PR:

- Installs dependencies for `backend` and `frontend`.
- Lints code (`eslint`) and builds the React app.
- Runs backend security scan (`npm audit --audit-level=high`).
- Executes a dedicated dependency audit job to block high severity issues from production deployments.

Extend the pipeline with additional SAST/DAST tooling (e.g., CodeQL, OWASP ZAP) as deployment policies require.

## Runtime Hardening Future Production Tips

- Host the API behind a Web Application Firewall (WAF) with mutual TLS for internal operator portals.
- Store secrets in a managed vault (Azure Key Vault, AWS Secrets Manager) instead of `.env` for production.
- Enable database at-rest encryption and configure regular backups of `payments.db`.
- Monitor API logs for repeated authentication failures; adjust the rate limit or integrate with SIEM tooling.

This project provides a secure baseline ready for integration with the bank’s internal SWIFT processing portal.
