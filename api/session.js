const {
  SESSION_COOKIE,
  isAdminEmail,
  parseCookies,
  sendJson,
  verifySessionToken,
} = require("./_auth");
const { getAppsForUser } = require("./_supabase");

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

  try {
    sendJson(res, 200, {
      user: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        isAdmin: isAdminEmail(payload.email),
      },
      apps: await getAppsForUser(payload.email),
    });
  } catch {
    sendJson(res, 500, { error: "apps_unavailable" });
  }
};
