// 브라우저가 Firebase 로그인 토큰을 보내면: 토큰 확인 → Cloudflare 가 알려 주는 접속 국가(request.cf.country)
// → Firestore profiles/{uid} = { country, ts } 를 서버 권한으로 기록. 사용자는 이 문서를 직접 쓸 수 없음(규칙).
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
const enc = o => btoa(typeof o === 'string' ? o : JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = s => JSON.parse(new TextDecoder().decode(b64u(s)));

let JWKS = null, JWKS_AT = 0;
async function verifyIdToken(tok, project) {
  const [h, p, s] = tok.split('.'); const head = dec(h), pay = dec(p), now = Date.now() / 1000;
  if (head.alg !== 'RS256') throw new Error('alg');
  if (pay.aud !== project || pay.iss !== 'https://securetoken.google.com/' + project) throw new Error('aud');
  if (!(pay.exp > now) || !(pay.iat <= now + 300) || !pay.sub) throw new Error('exp');
  if (!JWKS || Date.now() - JWKS_AT > 3600e3) {
    JWKS = (await (await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')).json()).keys; JWKS_AT = Date.now();
  }
  const jwk = JWKS.find(k => k.kid === head.kid); if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(h + '.' + p))) throw new Error('sig');
  return pay.sub;
}

let TOKEN = null, TOKEN_EXP = 0;
async function accessToken(sa) {
  if (TOKEN && Date.now() / 1000 < TOKEN_EXP - 60) return TOKEN;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const der = b64u(sa.private_key.replace(/-----[^-]+-----|\s/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  const r = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + unsigned + '.' + enc(String.fromCharCode(...sig)) })).json();
  if (!r.access_token) throw new Error('token');
  TOKEN = r.access_token; TOKEN_EXP = now + (r.expires_in || 3600);
  return TOKEN;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const cors = { 'access-control-allow-origin': env.ORIGINS.split(',').includes(origin) ? origin : 'null', 'access-control-allow-headers': 'authorization', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    try {
      const uid = await verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, ''), env.PROJECT);
      const c = String(req.cf?.country || '').toUpperCase();
      const country = /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : '';
      const t = await accessToken(JSON.parse(env.SA_KEY));
      const url = `https://firestore.googleapis.com/v1/projects/${env.PROJECT}/databases/(default)/documents/profiles/${uid}?updateMask.fieldPaths=country&updateMask.fieldPaths=ts`;
      const w = await fetch(url, { method: 'PATCH', headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json' },
        body: JSON.stringify({ fields: { country: { stringValue: country }, ts: { timestampValue: new Date().toISOString() } } }) });
      if (!w.ok) throw new Error('write ' + w.status);
      return Response.json({ country }, { headers: cors });
    } catch (e) {
      return Response.json({ error: String(e.message || e) }, { status: 400, headers: cors });
    }
  }
};
