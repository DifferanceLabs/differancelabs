const { requireAdminApi } = require("../_admin");
const { sendJson } = require("../_auth");
const { grantApps, removeGrant } = require("../_supabase");

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function adminGrants(req, res) {
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

    if (body.action === "remove") {
      await removeGrant({
        grantId: body.grantId,
        userEmail: body.userEmail,
        appSlug: body.appSlug,
      });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (body.action === "grant") {
      const grants = await grantApps({
        userEmail: body.userEmail,
        appSlugs: body.appSlugs,
        role: body.role || "member",
        grantedBy: admin.email,
      });
      sendJson(res, 200, { ok: true, grants });
      return;
    }

    sendJson(res, 400, { error: "invalid_grant_action" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: "grant_update_failed" });
  }
};
