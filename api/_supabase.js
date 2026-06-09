const {
  APP_CATALOG,
  isAdminEmail,
  normalizeAppSlug,
  normalizeEmail,
  requireEnv,
} = require("./_auth");

const APP_ORDER = new Map(APP_CATALOG.map((app, index) => [app.key, index]));
const APP_DEFAULTS = new Map(APP_CATALOG.map((app) => [app.key, app]));

function getSupabaseUrl() {
  const rawUrl = requireEnv("SUPABASE_URL").trim();
  const url = new URL(rawUrl);
  url.pathname = url.pathname.replace(/\/rest\/v1\/?$/, "").replace(/\/auth\/v1\/?$/, "");

  return url.toString().replace(/\/$/, "");
}

function getServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function buildUrl(table, query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `${getSupabaseUrl()}/rest/v1/${table}${suffix}`;
}

async function supabaseRequest(table, options = {}) {
  const method = options.method || "GET";
  const serviceRoleKey = getServiceRoleKey();
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const response = await fetch(buildUrl(table, options.query), {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    const detail = text ? `: ${text.slice(0, 240)}` : "";
    const error = new Error(`Supabase request failed for ${table} (${response.status})${detail}`);
    error.statusCode = 500;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return text ? JSON.parse(text) : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function inFilter(values) {
  return `in.(${unique(values).join(",")})`;
}

function sortApps(apps) {
  return apps.sort((left, right) => {
    const leftIndex = APP_ORDER.has(left.key) ? APP_ORDER.get(left.key) : Number.MAX_SAFE_INTEGER;
    const rightIndex = APP_ORDER.has(right.key) ? APP_ORDER.get(right.key) : Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex || left.name.localeCompare(right.name);
  });
}

function toClientApp(row) {
  const slug = row.slug || row.key;
  const defaults = APP_DEFAULTS.get(slug) || {};
  const fallbackUrl = slug === "admin" ? "/admin" : defaults.urlEnv ? process.env[defaults.urlEnv] || null : null;

  return {
    key: slug,
    slug,
    name: row.name || defaults.name || slug,
    kind: defaults.kind || "App",
    url: row.url || fallbackUrl,
    description: row.description || null,
    status: row.status || "active",
  };
}

function getAppTargetUrl(app) {
  return app ? app.url || null : null;
}

function toLauncherApp(app) {
  const slug = app.slug || app.key;
  const targetUrl = getAppTargetUrl(app);
  const isLaunchable = app.status === "active" && Boolean(targetUrl);

  return {
    key: slug,
    slug,
    name: app.name,
    kind: app.kind,
    description: app.description || null,
    status: app.status,
    active: isLaunchable,
    launchPath: isLaunchable
      ? slug === "admin"
        ? "/admin"
        : `/api/apps/launch?app=${encodeURIComponent(slug)}`
      : null,
  };
}

async function upsertUser(profile) {
  const email = normalizeEmail(profile && profile.email);

  if (!email) {
    return null;
  }

  const rows = await supabaseRequest("users", {
    method: "POST",
    query: { on_conflict: "email" },
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      email,
      name: profile.name || "",
      avatar_url: profile.avatar_url || profile.picture || null,
      last_login_at: new Date().toISOString(),
    },
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

async function listActiveApps() {
  const rows = await supabaseRequest("apps", {
    query: {
      select: "slug,name,url,description,status",
      status: "eq.active",
    },
  });

  return sortApps((rows || []).map(toClientApp));
}

async function listAppsBySlugs(slugs) {
  const uniqueSlugs = unique(slugs);

  if (!uniqueSlugs.length) {
    return [];
  }

  const rows = await supabaseRequest("apps", {
    query: {
      select: "slug,name,url,description,status",
      slug: inFilter(uniqueSlugs),
      status: "eq.active",
    },
  });

  return sortApps((rows || []).map(toClientApp));
}

async function getAppBySlug(slug) {
  const normalizedSlug = normalizeAppSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const rows = await supabaseRequest("apps", {
    query: {
      select: "slug,name,url,description,status",
      slug: `eq.${normalizedSlug}`,
      limit: "1",
    },
  });

  return rows && rows[0] ? toClientApp(rows[0]) : null;
}

async function hasAppGrant(email, slug) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedSlug = normalizeAppSlug(slug);

  if (!normalizedEmail || !normalizedSlug) {
    return false;
  }

  if (isAdminEmail(normalizedEmail)) {
    return true;
  }

  const rows = await supabaseRequest("app_grants", {
    query: {
      select: "id",
      user_email: `eq.${normalizedEmail}`,
      app_slug: `eq.${normalizedSlug}`,
      limit: "1",
    },
  });

  return Boolean(rows && rows.length);
}

async function getAppsForUser(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  if (isAdminEmail(normalizedEmail)) {
    return (await listActiveApps()).map(toLauncherApp);
  }

  const grants = await supabaseRequest("app_grants", {
    query: {
      select: "app_slug",
      user_email: `eq.${normalizedEmail}`,
    },
  });

  return (await listAppsBySlugs((grants || []).map((grant) => grant.app_slug))).map(
    toLauncherApp
  );
}

async function createOrRefreshAccessRequest(profile) {
  const email = normalizeEmail(profile && profile.email);

  if (!email) {
    const error = new Error("Missing user email");
    error.statusCode = 400;
    throw error;
  }

  await upsertUser({
    email,
    name: profile.name || "",
    avatar_url: profile.picture || profile.avatar_url || null,
  });

  const existingRows = await supabaseRequest("access_requests", {
    query: {
      select: "id",
      user_email: `eq.${email}`,
      status: "eq.pending",
      limit: "1",
    },
  });
  const existing = existingRows && existingRows[0];
  const now = new Date().toISOString();

  if (existing) {
    const rows = await supabaseRequest("access_requests", {
      method: "PATCH",
      query: { id: `eq.${existing.id}` },
      prefer: "return=representation",
      body: {
        name: profile.name || "",
        requested_at: now,
      },
    });

    return Array.isArray(rows) ? rows[0] : rows;
  }

  const rows = await supabaseRequest("access_requests", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_email: email,
      name: profile.name || "",
      status: "pending",
      requested_at: now,
    },
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

async function getAdminDashboard() {
  const [requests, users, apps, grants] = await Promise.all([
    supabaseRequest("access_requests", {
      query: {
        select: "id,user_email,name,status,requested_at,resolved_at,resolved_by",
        order: "requested_at.desc",
      },
    }),
    supabaseRequest("users", {
      query: {
        select: "id,email,name,avatar_url,created_at,last_login_at",
        order: "email.asc",
      },
    }),
    supabaseRequest("apps", {
      query: {
        select: "id,slug,name,url,description,status",
        order: "name.asc",
      },
    }),
    supabaseRequest("app_grants", {
      query: {
        select: "id,user_email,app_slug,role,granted_at,granted_by",
        order: "granted_at.desc",
      },
    }),
  ]);

  return {
    requests: requests || [],
    users: users || [],
    apps: sortApps((apps || []).map(toClientApp)),
    grants: grants || [],
  };
}

async function resolveAccessRequest(requestId, status, adminEmail) {
  const nextStatus = String(status || "").toLowerCase();

  if (!["approved", "denied"].includes(nextStatus)) {
    const error = new Error("Invalid access request status");
    error.statusCode = 400;
    throw error;
  }

  const rows = await supabaseRequest("access_requests", {
    method: "PATCH",
    query: { id: `eq.${requestId}` },
    prefer: "return=representation",
    body: {
      status: nextStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: normalizeEmail(adminEmail),
    },
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

async function grantApps({ userEmail, appSlugs, role, grantedBy }) {
  const normalizedEmail = normalizeEmail(userEmail);
  const slugs = unique(appSlugs || []);

  if (!normalizedEmail || !slugs.length) {
    const error = new Error("Missing grant target");
    error.statusCode = 400;
    throw error;
  }

  const activeApps = await listAppsBySlugs(slugs);
  const activeSlugs = new Set(activeApps.map((app) => app.slug));
  const rows = slugs
    .filter((slug) => activeSlugs.has(slug))
    .map((slug) => ({
      user_email: normalizedEmail,
      app_slug: slug,
      role: role || "member",
      granted_by: normalizeEmail(grantedBy),
    }));

  if (!rows.length) {
    const error = new Error("No valid apps selected");
    error.statusCode = 400;
    throw error;
  }

  return supabaseRequest("app_grants", {
    method: "POST",
    query: { on_conflict: "user_email,app_slug" },
    prefer: "resolution=merge-duplicates,return=representation",
    body: rows,
  });
}

async function removeGrant({ grantId, userEmail, appSlug }) {
  const query = grantId
    ? { id: `eq.${grantId}` }
    : { user_email: `eq.${normalizeEmail(userEmail)}`, app_slug: `eq.${appSlug}` };

  await supabaseRequest("app_grants", {
    method: "DELETE",
    query,
    prefer: "return=minimal",
  });

  return { ok: true };
}

module.exports = {
  createOrRefreshAccessRequest,
  getAppBySlug,
  getAppTargetUrl,
  getAdminDashboard,
  getAppsForUser,
  grantApps,
  hasAppGrant,
  listActiveApps,
  removeGrant,
  resolveAccessRequest,
  toClientApp,
  toLauncherApp,
  upsertUser,
};
