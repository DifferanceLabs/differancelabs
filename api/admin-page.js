const fs = require("fs");
const path = require("path");
const { requireAdminPage } = require("./_admin");

module.exports = function adminPage(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  if (!requireAdminPage(req, res)) {
    return;
  }

  const html = fs.readFileSync(path.join(__dirname, "_admin.html"), "utf8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 200;
  res.end(html);
};
