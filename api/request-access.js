const {
  SESSION_COOKIE,
  parseCookies,
  sendJson,
  verifySessionToken,
} = require("./_auth");
const { createOrRefreshAccessRequest } = require("./_supabase");

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

  try {
    await createOrRefreshAccessRequest(payload);
    // TODO: notify the admin when the notification channel is selected.
    sendJson(res, 200, {
      ok: true,
      message: "Access request sent.",
    });
  } catch (error) {
    console.warn("Access request persistence failed", {
      message: error.message,
      statusCode: error.statusCode || null,
    });
    sendJson(res, 500, { error: "request_unavailable" });
  }
};
