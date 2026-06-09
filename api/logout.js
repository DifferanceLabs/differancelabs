const { SESSION_COOKIE, clearCookie, redirect, sendJson } = require("./_auth");

module.exports = async function logout(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const cookie = clearCookie(SESSION_COOKIE, req);

  if (req.method === "POST") {
    res.setHeader("Set-Cookie", cookie);
    sendJson(res, 200, { ok: true });
    return;
  }

  redirect(res, "/login?logged_out=1", [cookie]);
};
