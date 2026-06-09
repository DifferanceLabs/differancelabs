const { requireAdminApi } = require("../_admin");
const { sendJson } = require("../_auth");
const { getAdminDashboard } = require("../_supabase");

module.exports = async function adminDashboard(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (!requireAdminApi(req, res)) {
    return;
  }

  try {
    sendJson(res, 200, await getAdminDashboard());
  } catch {
    sendJson(res, 500, { error: "admin_dashboard_unavailable" });
  }
};
