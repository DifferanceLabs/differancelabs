const {
  APP_CATALOG,
  SESSION_COOKIE,
  isAdminEmail,
  parseCookies,
  sendJson,
  verifySessionToken,
} = require("./_auth");
const { getAppsForUser } = require("./_supabase");

function getFallbackAppsForEmail(email) {
  if (!isAdminEmail(email)) {
    return [];
  }

  return APP_CATALOG.map((app) => ({
    key: app.key,
    slug: app.key,
    name: app.name,
    kind: app.kind,
    url: app.key === "admin" ? "/admin" : process.env[app.urlEnv] || null,
    description: null,
    status: "active",
  }));
}

module.exports = async function session(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  let payload = null;

  try {
    payload = verifySessionToken(parseCookies(req)[SESSION_COOKIE]);
  } catch {
    sendJson(res, 500, { error: "session_not_configured" });
    return;
  }

  if (!payload) {
    sendJson(res, 401, { error: "unauthenticated" });
    return;
  }

  const user = {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    isAdmin: isAdminEmail(payload.email),
  };

  try {
    sendJson(res, 200, {
      user,
      apps: await getAppsForUser(payload.email),
    });
  } catch (error) {
    console.warn("App grants lookup failed", {
      message: error.message,
      statusCode: error.statusCode || null,
    });
    sendJson(res, 200, {
      user,
      apps: getFallbackAppsForEmail(payload.email),
      degraded: true,
    });
  }
};
