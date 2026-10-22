// Require the browser to identify the same origin for cookie-authenticated writes.
// SameSite cookies alone do not protect against another app on a sibling subdomain.
function requireSameOrigin(req, res, sendJson) {
  const host = String(req.headers.host || "");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  const expected = `${local ? "http" : "https"}://${host}`;
  if (!host || req.headers.origin !== expected) {
    sendJson(res, 403, { error: "Invalid request origin" });
    return false;
  }
  return true;
}

module.exports = { requireSameOrigin };
