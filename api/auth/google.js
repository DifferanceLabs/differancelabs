const {
  STATE_COOKIE,
  STATE_MAX_AGE_SECONDS,
  createStateValue,
  getGoogleRedirectUri,
  isSecureRequest,
  redirect,
  requireEnv,
  serializeCookie,
} = require("../_auth");

module.exports = async function googleAuth(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  try {
    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    const state = createStateValue();
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getGoogleRedirectUri(req),
      response_type: "code",
      scope: "openid email profile",
      state,
    }).toString();

    redirect(res, authorizationUrl.toString(), [
      serializeCookie(STATE_COOKIE, state, {
        maxAge: STATE_MAX_AGE_SECONDS,
        secure: isSecureRequest(req),
      }),
    ]);
  } catch {
    redirect(res, "/login?error=auth_config");
  }
};
