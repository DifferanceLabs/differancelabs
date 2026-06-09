const {
  SESSION_COOKIE,
  isAdminEmail,
  parseCookies,
  redirect,
  sendJson,
  verifySessionToken,
} = require("./_auth");

function getSession(req) {
  return verifySessionToken(parseCookies(req)[SESSION_COOKIE]);
}

function requireAdminApi(req, res) {
  const session = getSession(req);

  if (!session) {
    sendJson(res, 401, { error: "Authentication required" });
    return null;
  }

  if (!isAdminEmail(session.email)) {
    sendJson(res, 403, { error: "Admin access required" });
    return null;
  }

  return session;
}

function requireAdminPage(req, res) {
  const session = getSession(req);

  if (!session) {
    redirect(res, "/login");
    return null;
  }

  if (!isAdminEmail(session.email)) {
    redirect(res, "/apps");
    return null;
  }

  return session;
}

module.exports = {
  getSession,
  requireAdminApi,
  requireAdminPage,
};
