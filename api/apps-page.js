const fs = require("fs");
const path = require("path");
const {
  SESSION_COOKIE,
  parseCookies,
  redirect,
  verifySessionToken,
} = require("./_auth");

module.exports = async function appsPage(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  let payload = null;

  try {
    payload = verifySessionToken(parseCookies(req)[SESSION_COOKIE]);
  } catch {
    redirect(res, "/login?error=server");
    return;
  }

  if (!payload) {
    redirect(res, "/login?error=unauthenticated");
    return;
  }

  const html = fs.readFileSync(path.join(process.cwd(), "api", "_apps.html"), "utf8");
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(html);
};
