const {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  STATE_COOKIE,
  clearCookie,
  createSessionToken,
  getGoogleRedirectUri,
  isSecureRequest,
  parseCookies,
  redirect,
  requireEnv,
  serializeCookie,
} = require("../_auth");
const { upsertUser } = require("../_supabase");

module.exports = async function googleCallback(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const requestUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookies = parseCookies(req);
  const clearStateCookie = clearCookie(STATE_COOKIE, req);

  if (error) {
    redirect(res, "/login?error=google_denied", [clearStateCookie]);
    return;
  }

  if (!code || !returnedState || cookies[STATE_COOKIE] !== returnedState) {
    redirect(res, "/login?error=invalid_state", [clearStateCookie]);
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: requireEnv("GOOGLE_CLIENT_ID"),
        client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: getGoogleRedirectUri(req),
      }),
    });

    if (!tokenResponse.ok) {
      redirect(res, "/login?error=token_exchange", [clearStateCookie]);
      return;
    }

    const tokenPayload = await tokenResponse.json();

    if (!tokenPayload.access_token) {
      redirect(res, "/login?error=token_exchange", [clearStateCookie]);
      return;
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      redirect(res, "/login?error=profile", [clearStateCookie]);
      return;
    }

    const profile = await profileResponse.json();
    const emailVerified =
      profile.email_verified === true || profile.email_verified === "true";

    if (!profile.email || !emailVerified) {
      redirect(res, "/login?error=access_denied", [clearStateCookie]);
      return;
    }

    await upsertUser({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    const sessionToken = createSessionToken({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    redirect(res, "/apps", [
      clearStateCookie,
      serializeCookie(SESSION_COOKIE, sessionToken, {
        maxAge: SESSION_MAX_AGE_SECONDS,
        secure: isSecureRequest(req),
      }),
    ]);
  } catch {
    redirect(res, "/login?error=server", [clearStateCookie]);
  }
};
