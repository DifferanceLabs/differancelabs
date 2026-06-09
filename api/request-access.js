const {
  SESSION_COOKIE,
  parseCookies,
  sendJson,
  verifySessionToken,
} = require("./_auth");

module.exports = async function requestAccess(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  console.log("Access request received", {
    email: payload.email,
    requestedAt: new Date().toISOString(),
  });

  sendJson(res, 200, {
    ok: true,
    message: "Access request noted.",
  });
};
