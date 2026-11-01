// GOAL APP isolated loopback OAuth verification. No production config, no secrets logged.
// This file contacts only http://127.0.0.1:7987 and a temporary localhost callback.
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const BASE = 'http://127.0.0.1:7987';
const RESOURCE = `${BASE}/mcp`;
const SCOPE = 'chatgpt2codex chatgpt2codex.goal';
const TIMEOUT_MS = 4 * 60 * 1000;
const short = (x) => String(x).slice(0, 160);
const fail = (message) => { throw new Error(message); };
async function request(path, options = {}) {
  try {
    return await fetch(`${BASE}${path}`, {
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      ...options,
    });
  } catch (error) {
    // Do not confuse a stopped loopback stage with failed OAuth or a bad Owner Token.
    // Never echo tokens, OAuth codes, or request payloads in diagnostics.
    const code = error?.cause?.code;
    if (code === 'ECONNREFUSED' || code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
      fail('LOCAL_STAGING_NOT_LISTENING: http://127.0.0.1:7987 연결 실패. ' +
        '격리 시험 서버를 별도 PowerShell에서 다시 실행한 후 이 검증을 다시 시작하세요. ' +
        '토큰 재발급은 필요하지 않습니다.');
    }
    if (error?.name === 'TimeoutError' || code === 'ETIMEDOUT') {
      fail('LOCAL_STAGING_HTTP_TIMEOUT: 격리 시험 서버 응답 지연. 포트 7987 상태를 확인하세요.');
    }
    fail('LOCAL_STAGING_HTTP_REQUEST_FAILED: ' + String(code || error?.name || 'unknown'));
  }
}
async function readJson(path, options = {}) {
  const r = await request(path, options);
  const data = await r.json().catch(() => null);
  if (!r.ok) fail(`${path}: HTTP ${r.status} ${data?.error ?? ''}`);
  return data;
}
function parseMcp(body) {
  try { return JSON.parse(body); } catch { /* SSE variant below */ }
  const messages = body.split(/\r?\n/).filter(x => x.startsWith('data:'));
  for (const message of messages.reverse()) {
    try { return JSON.parse(message.slice(5).trim()); } catch { /* next */ }
  }
  return null;
}
function makeCallbackServer(expectedState) {
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method !== 'GET' || u.pathname !== '/callback') {
      res.writeHead(404).end('Not Found');
      return;
    }
    const ok = u.searchParams.get('state') === expectedState && Boolean(u.searchParams.get('code'));
    const error = u.searchParams.get('error');
    res.writeHead(ok ? 200 : 400, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    });
    res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>GOAL OAuth 로컬 검사</title><body>' +
      (ok ? '<h2>로컬 승인 요청이 접수됐습니다.</h2><p>PowerShell 실행 화면에서 검증 결과를 확인하세요.</p>' : '<h2>인증 응답이 올바르지 않습니다.</h2>') + '</body></html>');
    if (ok) resolveCode(u.searchParams.get('code'));
    else rejectCode(new Error('OAuth 콜백 검증 실패: ' + (error ? '사용자 거부/인증 오류' : 'state 또는 code 불일치')));
  });
  return { server, codePromise };
}
async function main() {
  let server;
  let accessToken;
  let refreshToken;
  let clientId;
  let sessionId;
  let testStatus = 'NOT_RUN';
  let approvalTimer;
  let revocationFailure = false;
  try {
    const health = await readJson('/healthz');
    if (health?.ok !== true) fail('시험 서버 건강 상태가 정상이 아닙니다.');
    const meta = await readJson('/.well-known/openid-configuration');
    if (!Array.isArray(meta.scopes_supported) || !meta.scopes_supported.includes('chatgpt2codex.goal')) fail('GOAL 권한 범위가 없습니다.');
    console.log('LOCAL_STAGING_HEALTH=PASS');

    const state = randomBytes(24).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const cb = makeCallbackServer(state);
    server = cb.server;
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    const redirectUri = `http://127.0.0.1:${address.port}/callback`;

    const registered = await readJson('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Local GOAL OAuth verification (one-time, nonproduction)',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });
    clientId = registered?.client_id;
    if (typeof clientId !== 'string' || !clientId) fail('로컬 테스트 클라이언트 등록 실패');
    console.log('OAUTH_CLIENT_REGISTRATION=PASS');

    const authorize = new URL(`${BASE}/authorize`);
    for (const [key, value] of Object.entries({
      response_type: 'code', client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: SCOPE,
      state,
      resource: RESOURCE,
      ui_locales: 'ko',
    })) authorize.searchParams.set(key, value);

    console.log('OAUTH_OWNER_CONSENT=AWAITING_LOCAL_BROWSER');
    console.log('브라우저의 127.0.0.1:7987 승인 화면에서 개인 Owner Token을 직접 입력하세요.');
    console.log('토큰을 채팅이나 PowerShell 출력에 복사하지 마세요.');
    const opener = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', authorize.href], {
      stdio: 'ignore', windowsHide: true,
    });
    opener.on('error', () => console.log('BROWSER_AUTO_OPEN_FAILED: Windows 브라우저 실행에 실패했습니다.'));
    // Show the localhost URL so the owner can open it if the default browser does not launch.
    console.log('LOCAL_APPROVAL_URL=' + authorize.href);

    const code = await Promise.race([
      cb.codePromise,
      new Promise((_, reject) => { approvalTimer = setTimeout(() => reject(new Error('승인 제한 시간(4분)을 초과했습니다. 다시 실행하세요.')), TIMEOUT_MS); }),
    ]);
    if (approvalTimer) clearTimeout(approvalTimer);
    console.log('OWNER_APPROVAL_CALLBACK=PASS');
    const granted = await readJson('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', client_id: clientId, redirect_uri: redirectUri,
        code, code_verifier: verifier, resource: RESOURCE,
      }),
    });
    accessToken = granted.access_token;
    refreshToken = granted.refresh_token;
    if (typeof accessToken !== 'string' || !accessToken) fail('OAuth 접근 토큰 발급 실패');
    if (!String(granted.scope || '').split(' ').includes('chatgpt2codex.goal')) fail('OAuth GOAL 범위가 실제 토큰에 없습니다.');
    console.log('OAUTH_PKCE_AND_GOAL_SCOPE=PASS');

    const common = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
    async function callMcp(payload, withSession = false) {
      const headers = { ...common };
      if (withSession) headers['Mcp-Session-Id'] = sessionId;
      const r = await request('/mcp', { method: 'POST', headers, body: JSON.stringify(payload) });
      const body = await r.text();
      return { status: r.status, sessionId: r.headers.get('mcp-session-id'), parsed: parseMcp(body) };
    }
    const initialized = await callMcp({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'local-goal-oauth-check', version: '1.0.0' } },
    });
    sessionId = initialized.sessionId;
    if (initialized.status !== 200 || !sessionId || !initialized.parsed?.result?.serverInfo) {
      fail(`인증된 MCP initialize 실패: HTTP ${initialized.status} session=${Boolean(sessionId)} response=${Boolean(initialized.parsed?.result?.serverInfo)}`);
    }
    console.log('AUTHENTICATED_MCP_INITIALIZE=PASS');

    const notified = await callMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, true);
    if (![200, 202, 204].includes(notified.status)) fail('MCP initialized 통지 실패: HTTP ' + notified.status);
    const status = await callMcp({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'goal_app_command', arguments: { action: 'status' } },
    }, true);
    const sc = status.parsed?.result?.structuredContent;
    testStatus = sc?.code === 'APP_GOAL_INTENT_STATUS_ONLY' &&
      sc?.researchExecutionAuthorized === false && sc?.effectsIssued === 0 &&
      status.parsed?.result?.isError !== true ? 'PASS' : 'FAILED';
    if (testStatus !== 'PASS') {
      fail(`GOAL 읽기 전용 상태 검사 실패: HTTP ${status.status} code=${short(sc?.code ?? 'missing')}`);
    }
    console.log('GOAL_READ_ONLY_STATUS=PASS');
    console.log('GOAL_EXECUTION_ISSUED=NO');
  } finally {
    if (approvalTimer) clearTimeout(approvalTimer);
    // Revocation minimizes the lifetime of temporary test permissions.
    // Do not print, log, persist, or send access/refresh tokens anywhere else.
    if (accessToken && clientId) {
      let revokeOk = true;
      for (const token of [accessToken, refreshToken].filter(Boolean)) {
        try {
          const response = await request('/revoke', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: clientId, token }),
          });
          if (!response.ok) revokeOk = false;
        } catch { revokeOk = false; }
      }
      if (revokeOk) {
        try {
          const probe = await request('/mcp', {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
          });
          revokeOk = probe.status === 401;
        } catch { revokeOk = false; }
      }
      console.log('TEST_TOKENS_REVOKED=' + (revokeOk ? 'PASS' : 'NOT_VERIFIED'));
      revocationFailure = !revokeOk;
    }
    if (server) await new Promise((resolve) => server.close(() => resolve()));
    if (revocationFailure) throw new Error('시험용 접근 토큰 폐기가 확인되지 않았습니다. 인증 시험 결과를 성공으로 인정하지 마세요.');
  }
}
main().then(() => console.log('LOCAL_OAUTH_SMOKE=PASS')).catch((error) => {
  // Sanitized error messages only; never print secrets or arbitrary server bodies.
  console.error('LOCAL_OAUTH_SMOKE=FAILED: ' + short(error?.message ?? 'unknown'));
  process.exitCode = 1;
});
