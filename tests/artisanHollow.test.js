const test = require('node:test');
const assert = require('node:assert/strict');
const { getArtisanHollow, withArtisanHollow } = require('../lib/artisan-hollow');
const { createSessionToken } = require('../api/_auth');
const launch = require('../api/apps/launch');
function response() { return { headers: {}, statusCode: null, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, writeHead(s, h) { this.statusCode = s; for (const [k,v] of Object.entries(h)) this.setHeader(k,v); }, end(value) { this.body = value; } }; }
test('signed-in studio access never exposes the app URL in session metadata', t => {
  const previous = process.env.APP_URL_ARTISAN_HOLLOW; process.env.APP_URL_ARTISAN_HOLLOW = 'https://artisan-hollow.vercel.app';
  t.after(() => { if (previous === undefined) delete process.env.APP_URL_ARTISAN_HOLLOW; else process.env.APP_URL_ARTISAN_HOLLOW = previous; });
  const apps = withArtisanHollow([{ slug: 'other', active: false }]);
  assert.equal(apps.length, 2); assert.equal(apps[1].url, undefined); assert.equal(apps[1].launchPath, '/api/apps/launch?app=artisan-hollow');
  assert.equal(withArtisanHollow(apps).length, 2);
  process.env.APP_URL_ARTISAN_HOLLOW = 'http://untrusted.example'; assert.equal(getArtisanHollow(), null);
});
test('Artisan Hollow requires sign-in, allows a member with no grant and uses a fragment', async t => {
  const original = { ...process.env }; const originalFetch = global.fetch;
  Object.assign(process.env, { APP_URL_ARTISAN_HOLLOW: 'https://artisan-hollow.vercel.app', SESSION_SECRET: 'test-session-secret', AH_PORTAL_LAUNCH_SECRET: 'test-launch-secret' });
  t.after(() => { for (const key of ['APP_URL_ARTISAN_HOLLOW', 'SESSION_SECRET', 'AH_PORTAL_LAUNCH_SECRET']) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } global.fetch = originalFetch; });
  global.fetch = async () => { throw new Error('Studio launch must not depend on grant records'); };
  const unauth = response(); await launch({ method: 'GET', url: '/api/apps/launch?app=artisan-hollow', headers: { host: 'portal.example' } }, unauth);
  assert.equal(unauth.headers.location, '/login?error=unauthenticated');
  const member = response(); await launch({ method: 'GET', url: '/api/apps/launch?app=artisan-hollow', headers: { host: 'portal.example', cookie: `dl_session=${createSessionToken({ email: 'ordinary@example.invalid' })}` } }, member);
  const target = new URL(member.headers.location); assert.equal(target.origin, 'https://artisan-hollow.vercel.app'); assert.equal(target.pathname, '/enter'); assert.equal(target.search, ''); assert.ok(target.hash.startsWith('#dl_launch_token='));
  const claims = JSON.parse(Buffer.from(target.hash.split('=')[1].split('.')[1], 'base64url')); assert.equal(claims.app_slug, 'artisan-hollow'); assert.equal(claims.user_email, 'ordinary@example.invalid');
});
