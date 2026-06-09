const crypto = require("crypto");

const SESSION_COOKIE = "dl_session";
const STATE_COOKIE = "dl_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const STATE_MAX_AGE_SECONDS = 10 * 60;

const APP_CATALOG = [
  {
    key: "admin",
    name: "Admin",
    kind: "App",
    urlEnv: "APP_URL_ADMIN",
  },
  {
    key: "adme",
    name: "AdMe",
    kind: "App",
    urlEnv: "APP_URL_ADME",
  },
  {
    key: "nomnomgo",
    name: "NomNomGo",
    kind: "App",
    urlEnv: "APP_URL_NOMNOMGO",
  },
  {
    key: "pie",
    name: "PIE",
    kind: "App",
    urlEnv: "APP_URL_PIE",
  },
  {
    key: "divvi",
    name: "Divvi",
    kind: "App",
    urlEnv: "APP_URL_DIVVI",
  },
  {
    key: "prosperity-platform",
    name: "Prosperity Platform",
    kind: "Platform",
    urlEnv: "APP_URL_PROSPERITY_PLATFORM",
  },
  {
    key: "crieve-hall-plumbing",
    name: "Crieve Hall Plumbing",
    kind: "Site",
    urlEnv: "APP_URL_CRIEVE_HALL_PLUMBING",
  },
];

const APP_ALIASES = new Map(
  APP_CATALOG.flatMap((app) => [
    [normalizeAppKey(app.key), app.key],
    [normalizeAppKey(app.name), app.key],
  ])
);

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeAppKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getAdminEmail() {
  return normalizeEmail(process.env.ALLOWED_ADMIN_EMAIL || process.env.ADMIN_EMAIL);
}

function getRawAppGrants() {
  if (!process.env.APP_GRANTS_JSON) {
    return {};
  }

  try {
    const parsed = JSON.parse(process.env.APP_GRANTS_JSON);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getAppGrants() {
  const grants = {};

  for (const [email, appKeys] of Object.entries(getRawAppGrants())) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !Array.isArray(appKeys)) {
      continue;
    }

    grants[normalizedEmail] = appKeys
      .map((appKey) => APP_ALIASES.get(normalizeAppKey(appKey)))
      .filter(Boolean);
  }

  return grants;
}

function isAdminEmail(email) {
  const adminEmail = getAdminEmail();
  return Boolean(adminEmail && normalizeEmail(email) === adminEmail);
}

function getAppsForEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const appKeys = isAdminEmail(normalizedEmail)
    ? APP_CATALOG.map((app) => app.key)
    : getAppGrants()[normalizedEmail] || [];
  const uniqueAppKeys = [...new Set(appKeys)];

  return uniqueAppKeys
    .map((appKey) => APP_CATALOG.find((app) => app.key === appKey))
    .filter(Boolean)
    .map((app) => ({
      key: app.key,
      name: app.name,
      kind: app.kind,
      url: process.env[app.urlEnv] || null,
    }));
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    const error = new Error(`Missing required environment variable: ${name}`);
    error.statusCode = 500;
    throw error;
  }

  return value;
}

function getOrigin(req) {
  if (process.env.PUBLIC_SITE_URL) {
    return process.env.PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const forwardedHost = req.headers["x-forwarded-host"];
  const host = forwardedHost || req.headers.host || "localhost:3000";
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    forwardedProto ||
    (String(host).includes("localhost") || String(host).startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

function getGoogleRedirectUri(req) {
  return process.env.GOOGLE_REDIRECT_URI || `${getOrigin(req)}/api/auth/callback`;
}

function isSecureRequest(req) {
  const host = String(req.headers.host || "");
  return (
    req.headers["x-forwarded-proto"] === "https" ||
    (!host.includes("localhost") && !host.startsWith("127.0.0.1"))
  );
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function sign(value) {
  const secret = requireEnv("SESSION_SECRET");
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(value).digest());
}

function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email: normalizeEmail(user.email),
    name: user.name || "",
    picture: user.picture || "",
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));

  return `${body}.${sign(body)}`;
}

function verifySessionToken(token) {
  const [body, signature] = String(token || "").split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.email || !payload.exp || payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const separatorIndex = cookie.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = decodeURIComponent(cookie.slice(0, separatorIndex));
      const value = decodeURIComponent(cookie.slice(separatorIndex + 1));
      cookies[name] = value;
      return cookies;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  parts.push(`Path=${options.path || "/"}`);

  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  parts.push(`SameSite=${options.sameSite || "Lax"}`);

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function clearCookie(name, req) {
  return serializeCookie(name, "", {
    maxAge: 0,
    secure: isSecureRequest(req),
  });
}

function createStateValue() {
  return crypto.randomBytes(32).toString("base64url");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function redirect(res, location, cookies = []) {
  if (cookies.length) {
    res.setHeader("Set-Cookie", cookies);
  }

  res.writeHead(302, { Location: location });
  res.end();
}

module.exports = {
  APP_CATALOG,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  STATE_COOKIE,
  STATE_MAX_AGE_SECONDS,
  clearCookie,
  createSessionToken,
  createStateValue,
  getAppsForEmail,
  getGoogleRedirectUri,
  getOrigin,
  isAdminEmail,
  isSecureRequest,
  parseCookies,
  redirect,
  requireEnv,
  sendJson,
  serializeCookie,
  verifySessionToken,
};
