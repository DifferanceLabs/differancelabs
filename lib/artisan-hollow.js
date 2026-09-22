const crypto = require('node:crypto');
const { isAdminEmail } = require('../api/_auth');
// Explicit exception approved by the owner: every signed-in portal member can
// launch Artisan Hollow. Other applications retain their existing grant checks.
function getArtisanHollow() {
  const target = process.env.APP_URL_ARTISAN_HOLLOW;
  if (!target) return null;
  try {
    const url = new URL(target);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
  } catch { return null; }
  return {
    key: 'artisan-hollow', slug: 'artisan-hollow', name: 'Artisan Hollow', kind: 'Studio',
    description: 'A family art studio taking shape in Franklin, Tennessee.',
    status: 'active', statusLabel: 'Preview', url: target
  };
}
function withArtisanHollow(apps) {
  const app = getArtisanHollow();
  if (!app) return apps;
  return [...apps.filter(a => (a.slug || a.key) !== app.slug), {
    key: app.key, slug: app.slug, name: app.name, kind: app.kind,
    description: app.description, status: app.status, statusLabel: app.statusLabel,
    active: true, launchPath: '/api/apps/launch?app=artisan-hollow'
  }];
}
function createArtisanLaunchToken(email) {
  const secret = process.env.AH_PORTAL_LAUNCH_SECRET;
  if (!secret) throw new Error('AH_PORTAL_LAUNCH_SECRET');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ app_slug: 'artisan-hollow', user_email: email.trim().toLowerCase(), issued_at: now, expires_at: now + 180, nonce: crypto.randomBytes(16).toString('base64url'), studio_role: isAdminEmail(email) ? 'owner' : 'family' })).toString('base64url');
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${crypto.createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}
module.exports = { getArtisanHollow, withArtisanHollow, createArtisanLaunchToken };
