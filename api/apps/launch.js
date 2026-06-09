const {
  SESSION_COOKIE,
  createAppLaunchToken,
  normalizeAppSlug,
  parseCookies,
  redirect,
  sendJson,
  verifySessionToken,
} = require("../_auth");
const { getAppBySlug, getAppTargetUrl, hasAppGrant } = require("../_supabase");

function sendPlainText(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function redirectToApps(res, error) {
  res.setHeader("Cache-Control", "no-store");
  redirect(res, `/apps?error=${encodeURIComponent(error)}`);
}

function isAllowedLaunchTarget(url) {
  if (url.protocol === "https:") {
    return true;
  }

  const localHttpHostnames = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  return url.protocol === "http:" && localHttpHostnames.has(url.hostname);
}

module.exports = async function launchApp(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "method_not_allowed" });
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

  const requestUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const appSlug = normalizeAppSlug(requestUrl.searchParams.get("app"));

  if (!appSlug) {
    redirectToApps(res, "app_not_found");
    return;
  }

  let app = null;
  let userHasGrant = false;

  try {
    app = await getAppBySlug(appSlug);
    userHasGrant = await hasAppGrant(payload.email, appSlug);
  } catch (error) {
    console.warn("App launch lookup failed", {
      message: error.message,
      statusCode: error.statusCode || null,
    });
    redirectToApps(res, "launch_unavailable");
    return;
  }

  if (!app) {
    redirectToApps(res, "app_not_found");
    return;
  }

  if (app.status !== "active") {
    redirectToApps(res, "app_inactive");
    return;
  }

  if (!userHasGrant) {
    redirectToApps(res, "app_not_granted");
    return;
  }

  const appUrl = getAppTargetUrl(app);

  if (!appUrl) {
    redirectToApps(res, "app_inactive");
    return;
  }

  if (app.slug === "admin") {
    redirect(res, "/admin");
    return;
  }

  if (!process.env.DL_APP_LAUNCH_SECRET) {
    sendPlainText(res, 500, "DL_APP_LAUNCH_SECRET");
    return;
  }

  let destination = null;

  try {
    destination = new URL(appUrl);
  } catch {
    redirectToApps(res, "app_inactive");
    return;
  }

  if (!isAllowedLaunchTarget(destination)) {
    redirectToApps(res, "app_inactive");
    return;
  }

  destination.searchParams.set("dl_launch_token", createAppLaunchToken(app, payload.email));
  res.setHeader("Cache-Control", "no-store");
  redirect(res, destination.toString());
};
