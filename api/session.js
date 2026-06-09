const {
  SESSION_COOKIE,
  clearCookie,
  getAppsForEmail,
  isAdminEmail,
  isAllowedEmail,
  parseCookies,
  sendJson,
  verifySessionToken,
} = require("./_auth");

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

  if (!isAllowedEmail(payload.email)) {
    res.setHeader("Set-Cookie", clearCookie(SESSION_COOKIE, req));
    sendJson(res, 403, { error: "access_denied" });
    return;
  }

  sendJson(res, 200, {
    user: {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      isAdmin: isAdminEmail(payload.email),
    },
    apps: getAppsForEmail(payload.email),
  });
};
