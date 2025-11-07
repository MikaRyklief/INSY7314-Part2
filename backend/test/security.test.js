import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

let server;
let baseUrl;
const cookieJar = new Map();

test.before(async () => {
  server = http.createServer(createApp());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (!server) {
    return;
  }
  server.close();
  await once(server, 'close');
  cookieJar.clear();
});

const sendRequest = async (path, { method = 'GET', headers = {}, body } = {}) => {
  const url = new URL(path, baseUrl);
  const requestHeaders = { ...headers };
  if (cookieJar.size) {
    requestHeaders.Cookie = Array.from(cookieJar.values()).join('; ');
  }

  let payload;
  if (body !== undefined) {
    payload = JSON.stringify(body);
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    requestHeaders['Content-Length'] = Buffer.byteLength(payload);
  }

  const response = await new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers: requestHeaders }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString()
        });
      });
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });

  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    cookies.forEach((cookieString) => {
      const [cookiePair] = cookieString.split(';');
      const [name, value] = cookiePair.split('=');
      if (name && value !== undefined) {
        cookieJar.set(name.trim(), `${name.trim()}=${value}`);
      }
    });
  }

  let json = {};
  try {
    json = response.body ? JSON.parse(response.body) : {};
  } catch (err) {
    json = {};
  }

  return { ...response, json };
};

const fetchCsrfToken = async () => {
  const response = await sendRequest('/api/security/csrf-token');
  assert.equal(response.statusCode, 200);
  assert.ok(response.json.csrfToken);
  return response.json.csrfToken;
};

test('health endpoint exposes defensive headers', async () => {
  const response = await sendRequest('/api/security/health');

  assert.equal(response.statusCode, 200);
  assert.equal(response.json.status, 'ok');
  assert.ok(response.headers['content-security-policy']);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-dns-prefetch-control'], 'off');
  assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
});

test('customer registration endpoint is disabled', async () => {
  const csrfToken = await fetchCsrfToken();
  const response = await sendRequest('/api/auth/register', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: {}
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json.status, 'error');
  assert.match(response.json.message, /disabled/i);
});

test('invalid login payload is rejected', async () => {
  const csrfToken = await fetchCsrfToken();
  const response = await sendRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { username: '123', accountNumber: 'abc', password: 'short' }
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json.status, 'error');
  assert.ok(Array.isArray(response.json.errors));
  assert.ok(response.json.errors.length >= 1);
});