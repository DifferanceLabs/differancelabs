const { requireAdminApi } = require("../_admin");
const { sendJson } = require("../_auth");
const { resolveAccessRequest } = require("../_supabase");

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function adminRequests(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const admin = requireAdminApi(req, res);

  if (!admin) {
    return;
  }

  try {
    const body = await readJson(req);
    const request = await resolveAccessRequest(body.requestId, body.status, admin.email);
    sendJson(res, 200, { ok: true, request });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: "request_update_failed" });
  }
};
