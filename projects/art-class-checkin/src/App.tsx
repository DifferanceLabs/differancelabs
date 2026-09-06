import { useState, useEffect, useCallback, useRef } from "react";
import {
  request,
  change,
  download,
  setCsrf,
  clearPrivateState,
  RequestError,
  pendingIds,
  forget,
} from "./api";
import { Field, Empty, StatusLabel } from "./components";
import { Forms, type ModalSpec } from "./forms";
import { businessDate, displayTime, clockTime } from "./time";
import type {
  Bootstrap,
  Snapshot,
  RosterRow,
  SaveResult,
  HistoryRow,
  AuditEvent,
} from "./types";
declare global {
  interface Window {
    __artLaunchToken?: string;
  }
}
declare const __BUILD_VERSION__: string;
const tabs = ["Today", "Students", "Classes", "History"] as const;
type Tab = (typeof tabs)[number];
export default function App() {
  const [data, setData] = useState<Bootstrap | null>(null),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [selected, setSelectedState] = useState("");
  const selectedRef = useRef(""),
    refreshEpoch = useRef(0);
  const setSelected = (id: string) => {
    selectedRef.current = id;
    ++refreshEpoch.current;
    setSelectedState(id);
    setSnapshot(null);
  };
  const [config, setConfig] = useState<{
      mode: string;
      portal: string;
      version: string;
    } | null>(null),
    [tab, setTab] = useState<Tab>(
      () =>
        tabs.find((t) =>
          location.pathname.toLowerCase().includes(t.toLowerCase()),
        ) || "Today",
    );
  const [modal, setModal] = useState<ModalSpec | null>(null),
    [notice, setNotice] = useState(""),
    [offline, setOffline] = useState(false),
    [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set()),
    [pending, setPending] = useState(pendingIds),
    [retryPayloads, setRetryPayloads] = useState<
      Record<string, { action: string; input: any }>
    >({});
  const [query, setQuery] = useState(""),
    [paidFilter, setPaidFilter] = useState(""),
    [showArchived, setShowArchived] = useState(false),
    [deviceCode, setDeviceCode] = useState("");
  const [deviceBusy, setDeviceBusy] = useState(false),
    [audit, setAudit] = useState<AuditEvent[] | null>(null);
  const handleError = useCallback((e: unknown) => {
    const err = e as RequestError;
    setNotice(err.message);
    setLoading(false);
    if (err.status === 401 || err.status === 403) {
      ++refreshEpoch.current;
      setData(null);
      setSnapshot(null);
      setModal(null);
      setAudit(null);
      setRetryPayloads({});
      clearPrivateState();
      setPending([]);
    } else if (err.uncertain || err.status >= 500) setOffline(true);
  }, []);
  const refresh = useCallback(
    async (preferred?: string) => {
      if (preferred) {
        selectedRef.current = preferred;
        setSelectedState(preferred);
        setSnapshot(null);
      }
      const epoch = ++refreshEpoch.current;
      try {
        const d = await request<Bootstrap & { csrf: string }>("/api/session");
        if (epoch !== refreshEpoch.current) return;
        setCsrf(d.csrf);
        setData(d);
        setOffline(false);
        const current = selectedRef.current;
        const next =
          current && d.sessions.some((s) => s.id === current)
            ? current
            : d.sessions.find(
                (s) => s.date === businessDate(d.settings.timezone),
              )?.id ||
              d.sessions[0]?.id ||
              "";
        if (next !== current) {
          selectedRef.current = next;
          setSelectedState(next);
        }
        const fresh = next
          ? await request<Snapshot>("/api/sessions/" + next)
          : null;
        if (epoch === refreshEpoch.current && next === selectedRef.current)
          setSnapshot(fresh);
      } catch (e) {
        if (epoch === refreshEpoch.current) handleError(e);
      } finally {
        if (epoch === refreshEpoch.current) setLoading(false);
      }
    },
    [handleError],
  );
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfg = await request<{
          mode: string;
          portal: string;
          version: string;
        }>("/api/config");
        if (alive) setConfig(cfg);
        if (window.__artLaunchToken) {
          const token = window.__artLaunchToken;
          delete window.__artLaunchToken;
          await request("/api/auth/exchange", {
            method: "POST",
            body: JSON.stringify({ token }),
          });
        }
      } catch (e) {
        if (alive) handleError(e);
      }
      if (alive) await refresh();
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (data && selected) void refresh();
  }, [selected]);
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [!!data, refresh]);
  useEffect(() => {
    if (!deviceCode) return;
    const t = setInterval(async () => {
      try {
        const result = await request<any>("/api/auth/device/finish", {
          method: "POST",
          body: "{}",
        });
        if (!result.pending) {
          setDeviceCode("");
          await refresh();
        }
      } catch (e) {
        setNotice((e as Error).message);
        setDeviceCode("");
      }
    }, 3000);
    return () => clearInterval(t);
  }, [deviceCode, refresh]);
  const navigate = (value: Tab) => {
    setTab(value);
    setQuery("");
    setAudit(null);
    history.pushState(null, "", "/" + value.toLowerCase());
  };
  useEffect(() => {
    const fn = () =>
      setTab(
        tabs.find((t) =>
          location.pathname.toLowerCase().includes(t.toLowerCase()),
        ) || "Today",
      );
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);
  const save = async (
    action: string,
    input: any,
    operationId: string = crypto.randomUUID(),
  ): Promise<SaveResult> => {
    const key = action + ":" + (input.id || "");
    setSaving((s) => new Set(s).add(key));
    setNotice("");
    try {
      const r = await change(action, input, operationId);
      setNotice("Saved on the server.");
      setPending(pendingIds());
      setRetryPayloads((p) => {
        const n = { ...p };
        delete n[operationId];
        return n;
      });
      if (action === "session.create") navigate("Today");
      await refresh(action === "session.create" ? r.id : undefined);
      return r;
    } catch (e) {
      setPending(pendingIds());
      if ((e as RequestError).uncertain)
        setRetryPayloads((p) => ({ ...p, [operationId]: { action, input } }));
      handleError(e);
      throw e;
    } finally {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  };
  const act = (action: string, input: any) => {
    void save(action, input).catch(() => {});
  };
  const reconcile = async (id: string) => {
    try {
      const result = await request<any>("/api/operations/" + id);
      if (result.ok) {
        forget(id);
        setPending(pendingIds());
        setNotice("The server confirms that change was saved.");
        await refresh();
      } else
        setNotice(
          "No committed result is confirmed yet. You can retry the original request below if this screen still has it. Otherwise inspect the roster and use paper until the outcome is clear.",
        );
    } catch (e) {
      handleError(e);
    }
  };
  const login = async (role: string) => {
    setLoading(true);
    setNotice("");
    try {
      await request("/api/auth/demo", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      await refresh();
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    try {
      await request("/api/auth/logout", { method: "POST", body: "{}" });
      clearPrivateState();
      setData(null);
      setSnapshot(null);
      setModal(null);
      setAudit(null);
      setRetryPayloads({});
      setPending([]);
      setSelected("");
      setQuery("");
      setNotice("Signed out. Private app data cleared.");
    } catch (e) {
      handleError(e);
    }
  };
  const startDevice = async () => {
    setDeviceBusy(true);
    try {
      const r = await request<{ code: string }>("/api/auth/device/start", {
        method: "POST",
        body: "{}",
      });
      setDeviceCode(r.code);
    } catch (e) {
      handleError(e);
    } finally {
      setDeviceBusy(false);
    }
  };
  const print = async () => {
    if (!selected) return;
    try {
      const r = await save("backup.create", { sessionId: selected });
      setModal({ kind: "print", backupId: r.id });
    } catch {}
  };
  const admin = data?.user.role === "admin";
  const zone =
    snapshot?.session.snapshot.timezone ||
    data?.settings.timezone ||
    "America/Chicago";
  const rowBusy = (action: string, id: string) => saving.has(action + ":" + id);
  const historyFor = (r: RosterRow) => {
    navigate("History");
    setQuery(r.student_id);
  };
  return (
    <div className="app">
      {config?.mode === "demo" && (
        <div className="demo-band">
          FICTIONAL DEMO{" "}
          <span>Practice only · Never enter real student information</span>
        </div>
      )}
      <header className="app-header">
        <div className="brand">
          <img src="/icons/icon-192.png" alt="" />
          <div>
            <span className="eyebrow">ART STUDIO</span>
            <h1>{data?.settings.business_name || "Art Class Check-In"}</h1>
          </div>
        </div>
        {data && (
          <details className="account-menu">
            <summary aria-label="Account and app settings">
              Account <span>⌄</span>
            </summary>
            <div className="account-panel">
              <strong>{data.user.email}</strong>
              <small>{admin ? "App administrator" : "Staff"}</small>
              <button onClick={() => setModal({ kind: "device" })}>
                Connect Home Screen device
              </button>
              {admin && (
                <>
                  <button onClick={() => setModal({ kind: "settings" })}>
                    App settings & staff
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const events =
                          await request<AuditEvent[]>("/api/audit");
                        navigate("History");
                        setAudit(events);
                      } catch (e) {
                        handleError(e);
                      }
                    }}
                  >
                    Administration audit
                  </button>
                </>
              )}
              <button onClick={() => void logout()}>Sign out</button>
            </div>
          </details>
        )}
      </header>
      {data && (
        <nav className="main-nav" aria-label="Primary navigation">
          {tabs.map((t) => (
            <button
              key={t}
              className={t === tab ? "active" : ""}
              aria-current={t === tab ? "page" : undefined}
              onClick={() => navigate(t)}
            >
              {t}
            </button>
          ))}
        </nav>
      )}
      <main>
        {notice && (
          <div className={offline ? "notice error" : "notice"} role="status">
            {notice}
          </div>
        )}
        {offline && data && (
          <div className="offline-banner" role="alert">
            <strong>
              Connection unavailable. Changes cannot be confirmed.
            </strong>
            <p>
              Use the printed backup for handoffs. Reconnect and reconcile
              afterward.
            </p>
            <button onClick={() => void refresh()}>Check connection</button>
          </div>
        )}
        {data && pending.length > 0 && (
          <div className="pending-banner">
            <strong>Check unconfirmed saves</strong>
            <p>
              A request may have reached the server even if this device lost its
              connection.
            </p>
            {pending.map((id) => (
              <div key={id}>
                <button onClick={() => void reconcile(id)}>
                  Check save status
                </button>
                {retryPayloads[id] && (
                  <button
                    onClick={async () => {
                      await reconcile(id);
                      if (pendingIds().includes(id)) {
                        const p = retryPayloads[id];
                        void save(p.action, p.input, id).catch(() => {});
                      }
                    }}
                  >
                    Retry same request
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {!data ? (
          <section className="signin-card">
            <div className="signin-art">
              <span>✳</span>
              <p>
                A calm start.
                <br />A careful handoff.
              </p>
            </div>
            <div className="signin-content">
              <span className="eyebrow">STAFF CHECK-IN</span>
              <h2>Welcome to the studio.</h2>
              <p>
                Keep arrivals, pickup permissions, and payment confirmations
                together.
              </p>
              {loading ? (
                <p role="status">Connecting securely…</p>
              ) : config?.mode === "demo" ? (
                <>
                  <p className="hint">
                    Use fictional staff identities to explore the complete
                    workflow.
                  </p>
                  <button
                    className="primary"
                    onClick={() => void login("staff")}
                  >
                    Enter demo as staff
                  </button>
                  <button onClick={() => void login("admin")}>
                    Enter demo as app administrator
                  </button>
                </>
              ) : (
                <>
                  <a
                    className="button primary"
                    href={
                      config?.portal || "https://www.differancelabs.com/apps"
                    }
                  >
                    Sign in with Differance Labs
                  </a>
                  <p className="hint">
                    After Google sign-in, select the Art Class Check-In card.
                    Your account must have an explicit app grant.
                  </p>
                  <button
                    onClick={() => void startDevice()}
                    disabled={deviceBusy}
                  >
                    Sign in to this Home Screen app
                  </button>
                  {deviceCode && (
                    <div className="device-code">
                      <strong>{deviceCode}</strong>
                      <p>
                        Keep this screen open. In Safari, sign in through
                        Differance Labs and open this app. Choose Account →
                        Connect Home Screen device and enter this code. Return
                        here after approval. Expires in five minutes.
                      </p>
                      <a href={config?.portal} target="_blank" rel="noreferrer">
                        Open Differance Labs in Safari
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        ) : (
          <>
            {tab === "Today" && (
              <>
                <section className="page-heading">
                  <div>
                    <span className="eyebrow">
                      {businessDate(data.settings.timezone)} ·{" "}
                      {data.settings.timezone}
                    </span>
                    <h2>Today at the studio</h2>
                    <p>Confirm each handoff when it happens.</p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => setModal({ kind: "session" })}
                    disabled={offline || !data.classes.length}
                  >
                    New session
                  </button>
                </section>
                {data.sessions
                  .filter((s) => s.id !== selected && !!s.present_count)
                  .map((s) => (
                    <div className="notice" key={s.id}>
                      <strong>
                        {s.present_count} still Present · {s.date} ·{" "}
                        {s.snapshot.name}
                      </strong>{" "}
                      <button onClick={() => setSelected(s.id)}>
                        Open this roster
                      </button>
                    </div>
                  ))}
                <div className="session-toolbar">
                  <Field label="Dated class session">
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option value="">Select a session</option>
                      {data.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.date} · {s.snapshot.name}
                          {s.present_count
                            ? " · " + s.present_count + " Present"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    onClick={() => void print()}
                    disabled={!snapshot || offline}
                  >
                    Print backup
                  </button>
                </div>
                {snapshot ? (
                  <>
                    <div className="class-strip">
                      <strong>{snapshot.session.snapshot.name}</strong>
                      <span>
                        {snapshot.session.date} · Instructor:{" "}
                        {snapshot.session.snapshot.instructor}
                      </span>
                    </div>
                    <div className="counts">
                      {["Expected", "Present", "Released", "Absent"].map(
                        (s) => (
                          <div key={s}>
                            <strong>
                              {
                                snapshot.roster.filter((r) => r.status === s)
                                  .length
                              }
                            </strong>
                            <span>{s}</span>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="roster-tools">
                      <label className="search">
                        <span>Search roster</span>
                        <input
                          placeholder="Find a student…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <Field label="Payment filter">
                        <select
                          value={paidFilter}
                          onChange={(e) => setPaidFilter(e.target.value)}
                        >
                          <option value="">All payment statuses</option>
                          <option value="paid">Paid</option>
                          <option value="unconfirmed">Not confirmed</option>
                        </select>
                      </Field>
                      <span className="sync-label">
                        {offline ? "Offline" : "Synced with server"}
                      </span>
                    </div>
                    <div className="roster">
                      {snapshot.roster
                        .filter(
                          (r) =>
                            r.student_snapshot.name
                              .toLowerCase()
                              .includes(query.toLowerCase()) &&
                            (!paidFilter ||
                              (paidFilter === "paid") === r.payment.confirmed),
                        )
                        .map((r) => (
                          <article
                            key={r.id}
                            className={
                              "student-row row-" + r.status.toLowerCase()
                            }
                          >
                            <div className="student-identity">
                              <div className="student-initials" aria-hidden>
                                {r.student_snapshot.name
                                  .split(" ")
                                  .map((s) => s[0])
                                  .slice(0, 2)
                                  .join("")}
                              </div>
                              <div>
                                <h3>{r.student_snapshot.name}</h3>
                                <div className="student-status-line">
                                  <StatusLabel status={r.status} />
                                  {r.arrival_at && (
                                    <span>
                                      In {clockTime(r.arrival_at, zone)}
                                    </span>
                                  )}
                                  {r.departure_at && (
                                    <span>
                                      Out {clockTime(r.departure_at, zone)}
                                    </span>
                                  )}
                                </div>
                                {r.release && (
                                  <small>Released to {r.release.name}</small>
                                )}
                                {r.student_snapshot.safetyNote && (
                                  <small className="safety-note">
                                    {data.students.find(
                                      (s) => s.id === r.student_id,
                                    )?.data.safetyNote ||
                                      r.student_snapshot.safetyNote}
                                  </small>
                                )}
                              </div>
                            </div>
                            <div className="payment-control">
                              <label>
                                <input
                                  type="checkbox"
                                  aria-label={
                                    "Paid for " + r.student_snapshot.name
                                  }
                                  checked={r.payment.confirmed}
                                  disabled={
                                    offline || rowBusy("payment.set", r.id)
                                  }
                                  onChange={(e) =>
                                    e.target.checked
                                      ? act("payment.set", {
                                          id: r.id,
                                          version: r.payment_version,
                                          payment: { confirmed: true },
                                        })
                                      : setModal({
                                          kind: "payment",
                                          row: r,
                                          item: { clear: true },
                                        })
                                  }
                                />
                                <span>
                                  Paid
                                  <small>
                                    {rowBusy("payment.set", r.id)
                                      ? "Saving…"
                                      : r.payment.confirmed
                                        ? "Confirmed"
                                        : "Not confirmed"}
                                  </small>
                                </span>
                              </label>
                              <button
                                className="text-button"
                                onClick={() =>
                                  setModal({ kind: "payment", row: r })
                                }
                              >
                                Details
                              </button>
                            </div>
                            <div className="attendance-actions">
                              {r.status === "Present" ? (
                                <button
                                  className="primary"
                                  disabled={
                                    offline ||
                                    rowBusy("attendance.release", r.id)
                                  }
                                  onClick={() =>
                                    setModal({ kind: "release", row: r })
                                  }
                                >
                                  Pick up
                                </button>
                              ) : r.status === "Released" ? (
                                <span className="handoff-complete">
                                  Handoff recorded
                                </span>
                              ) : (
                                <button
                                  className="primary"
                                  disabled={
                                    offline ||
                                    rowBusy("attendance.checkin", r.id)
                                  }
                                  onClick={() =>
                                    act("attendance.checkin", {
                                      id: r.id,
                                      version: r.attendance_version,
                                    })
                                  }
                                >
                                  {rowBusy("attendance.checkin", r.id)
                                    ? "Saving…"
                                    : "Check in"}
                                </button>
                              )}
                              <details className="row-menu">
                                <summary
                                  aria-label={
                                    "More actions for " +
                                    r.student_snapshot.name
                                  }
                                >
                                  More
                                </summary>
                                <div>
                                  <button
                                    onClick={() =>
                                      setModal({
                                        kind: "paper",
                                        row: r,
                                        snapshot,
                                      })
                                    }
                                    disabled={offline}
                                  >
                                    Enter paper attendance
                                  </button>
                                  {r.status === "Expected" && (
                                    <button
                                      disabled={offline}
                                      onClick={() =>
                                        act("attendance.absent", {
                                          id: r.id,
                                          version: r.attendance_version,
                                        })
                                      }
                                    >
                                      Mark absent
                                    </button>
                                  )}
                                  <button onClick={() => historyFor(r)}>
                                    View history
                                  </button>
                                  {admin && (
                                    <button
                                      disabled={offline}
                                      onClick={() =>
                                        setModal({
                                          kind: "correction",
                                          row: r,
                                          snapshot,
                                        })
                                      }
                                    >
                                      Correct attendance
                                    </button>
                                  )}
                                </div>
                              </details>
                            </div>
                          </article>
                        ))}
                    </div>
                    {!snapshot.roster.length && (
                      <Empty>
                        This session has no students. Add students to a class,
                        then create its next dated session.
                      </Empty>
                    )}
                  </>
                ) : (
                  <Empty>
                    Create a class and a dated session to start checking in
                    students.
                  </Empty>
                )}
              </>
            )}
            {tab === "Students" && (
              <>
                <section className="page-heading">
                  <div>
                    <span className="eyebrow">PEOPLE & PERMISSIONS</span>
                    <h2>Students</h2>
                    <p>
                      Contact information and pickup permission for each child.
                    </p>
                  </div>
                  {admin && (
                    <button
                      className="primary"
                      disabled={offline}
                      onClick={() => setModal({ kind: "student" })}
                    >
                      Add student
                    </button>
                  )}
                </section>
                <div className="roster-tools">
                  <label className="search">
                    <span>Search students</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a student…"
                    />
                  </label>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    Show archived
                  </label>
                </div>
                <div className="student-grid">
                  {data.students
                    .filter(
                      (s) =>
                        (showArchived || !s.data.archived) &&
                        s.data.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((s) => (
                      <article className="detail-card" key={s.id}>
                        <div className="card-heading">
                          <h3>{s.data.name}</h3>
                          {s.data.archived && <StatusLabel status="Archived" />}
                          {admin && (
                            <button
                              className="text-button"
                              disabled={offline}
                              onClick={() =>
                                setModal({ kind: "student", item: s })
                              }
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        <dl>
                          <dt>Parent / guardian</dt>
                          <dd>
                            {s.data.guardianName}
                            <br />
                            <a href={"tel:" + s.data.guardianPhone}>
                              {s.data.guardianPhone}
                            </a>
                          </dd>
                          <dt>Emergency contact · not pickup permission</dt>
                          <dd>
                            {s.data.emergencyName || "Not recorded"}{" "}
                            {s.data.emergencyPhone && (
                              <a href={"tel:" + s.data.emergencyPhone}>
                                {s.data.emergencyPhone}
                              </a>
                            )}
                          </dd>
                          {s.data.safetyNote && (
                            <>
                              <dt>Safety note</dt>
                              <dd className="safety-note">
                                {s.data.safetyNote}
                              </dd>
                            </>
                          )}
                        </dl>
                        <h4>Pickup adults</h4>
                        {data.permissions
                          .filter((p) => p.student_id === s.id)
                          .map((p) => (
                            <div className="permission-row" key={p.id}>
                              <span>
                                <strong>
                                  {
                                    data.adults.find((a) => a.id === p.adult_id)
                                      ?.data.name
                                  }
                                </strong>
                                <small>
                                  {p.relationship} ·{" "}
                                  {p.approved ? "Approved" : "Not approved"}
                                </small>
                              </span>
                              {admin && (
                                <button
                                  className="text-button"
                                  disabled={offline}
                                  onClick={() =>
                                    setModal({
                                      kind: "permission",
                                      studentId: s.id,
                                      permission: p,
                                    })
                                  }
                                >
                                  Change
                                </button>
                              )}
                            </div>
                          ))}
                        {admin && (
                          <button
                            disabled={offline || !data.adults.length}
                            onClick={() =>
                              setModal({ kind: "permission", studentId: s.id })
                            }
                          >
                            Link pickup adult
                          </button>
                        )}
                      </article>
                    ))}
                </div>
                <section className="page-heading section-gap">
                  <div>
                    <h2>Pickup adult directory</h2>
                    <p>
                      Share one adult record across siblings. Permission remains
                      separate for each child.
                    </p>
                  </div>
                  {admin && (
                    <button
                      disabled={offline}
                      onClick={() => setModal({ kind: "adult" })}
                    >
                      Add pickup adult
                    </button>
                  )}
                </section>
                <div className="adult-grid">
                  {data.adults.map((a) => (
                    <article className="adult-card" key={a.id}>
                      {a.data.photoPath && (
                        <img
                          className="portrait"
                          src={"/api/photos/" + a.id}
                          alt={a.data.name + " reference portrait"}
                        />
                      )}
                      <div>
                        <strong>{a.data.name}</strong>
                        <small>{a.data.phone || "No phone recorded"}</small>
                      </div>
                      {admin && (
                        <button
                          className="text-button"
                          disabled={offline}
                          onClick={() => setModal({ kind: "adult", item: a })}
                        >
                          Edit / photo
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
            {tab === "Classes" && (
              <>
                <section className="page-heading">
                  <div>
                    <span className="eyebrow">ROSTERS & DATES</span>
                    <h2>Classes</h2>
                    <p>
                      Update future enrollment without changing past sessions.
                    </p>
                  </div>
                  {admin && (
                    <button
                      className="primary"
                      disabled={offline}
                      onClick={() => setModal({ kind: "class" })}
                    >
                      Add class
                    </button>
                  )}
                </section>
                <div className="student-grid">
                  {data.classes.map((c) => (
                    <article className="detail-card" key={c.id}>
                      <div className="card-heading">
                        <h3>{c.data.name}</h3>
                        {c.data.archived && <StatusLabel status="Archived" />}
                      </div>
                      <p>
                        {c.data.instructor} · {c.data.studentIds.length}{" "}
                        enrolled
                      </p>
                      <div className="name-chips">
                        {c.data.studentIds.map((id) => (
                          <span key={id}>
                            {data.students.find((s) => s.id === id)?.data
                              .name || "Archived student"}
                          </span>
                        ))}
                      </div>
                      <div className="button-row">
                        <button
                          disabled={offline || c.data.archived}
                          className="primary"
                          onClick={() => setModal({ kind: "session", item: c })}
                        >
                          Create next session
                        </button>
                        {admin && (
                          <button
                            disabled={offline}
                            onClick={() => setModal({ kind: "class", item: c })}
                          >
                            Edit roster
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {!data.classes.length && (
                  <Empty>
                    Add a class, choose its students, and create a dated
                    session.
                  </Empty>
                )}
              </>
            )}
            {tab === "History" &&
              (audit ? (
                <>
                  <section className="page-heading">
                    <h2>Administration audit</h2>
                    <button onClick={() => setAudit(null)}>
                      Attendance history
                    </button>
                  </section>
                  {audit.map((e) => (
                    <EventDetail
                      key={e.id}
                      event={e}
                      zone={data.settings.timezone}
                    />
                  ))}
                </>
              ) : (
                <History
                  data={data}
                  initialStudent={query}
                  onError={handleError}
                />
              ))}
          </>
        )}
      </main>
      <footer>
        <span>Art Class Check-In · {config?.version || __BUILD_VERSION__}</span>
        <span>
          {data
            ? "Staff use only · Online saves required"
            : "Private staff workspace"}
        </span>
      </footer>
      {modal && data && (
        <Forms
          spec={modal}
          data={data}
          close={() => setModal(null)}
          save={save}
          refresh={refresh}
        />
      )}
    </div>
  );
}
function EventDetail({ event: e, zone }: { event: AuditEvent; zone: string }) {
  const describe = (v: any) => {
    if (!v) return "No previous record";
    if (v.payment && e.kind.includes("payment"))
      return (
        (v.payment.confirmed ? "Paid" : "Not confirmed") +
        " · " +
        (v.payment.method || "Method not recorded") +
        " · " +
        (v.payment.amountCents == null
          ? "Amount not recorded"
          : "$" + (v.payment.amountCents / 100).toFixed(2)) +
        " · Payment date " +
        (v.payment.paymentDate || "not recorded") +
        " · Confirmation " +
        displayTime(v.payment.confirmedAt, zone) +
        " · " +
        (v.payment.note || "No note")
      );
    if (v.status)
      return (
        v.status +
        " · arrival " +
        displayTime(v.arrival_at, zone) +
        " · departure " +
        displayTime(v.departure_at, zone) +
        (v.release ? " · " + v.release.name : "")
      );
    if (typeof v.approved === "boolean")
      return (
        (v.approved ? "Approved" : "Not approved") + " · " + v.relationship
      );
    if (v.name) return v.name;
    if (v.role) return v.email + " · " + v.role;
    return "Recorded details preserved in export";
  };
  return (
    <details className="audit-event">
      <summary>
        {e.kind.replaceAll(".", " · ").replaceAll("_", " ")}{" "}
        <span>{e.source}</span>
      </summary>
      <dl>
        <dt>Actual event time</dt>
        <dd>{displayTime(e.actual_at, zone)}</dd>
        <dt>Recorded by / recorded time</dt>
        <dd>
          {e.actor}
          <br />
          {displayTime(e.recorded_at, zone)}
        </dd>
        <dt>Previous</dt>
        <dd>{describe(e.before_value)}</dd>
        <dt>New</dt>
        <dd>{describe(e.after_value)}</dd>
        {e.reason && (
          <>
            <dt>Reason / authorization note</dt>
            <dd>{e.reason}</dd>
          </>
        )}
      </dl>
    </details>
  );
}
function History({
  data,
  initialStudent,
  onError,
}: {
  data: Bootstrap;
  initialStudent: string;
  onError: (e: unknown) => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({
    student: initialStudent,
    class: "",
    session: "",
    paid: "",
    from: "",
    to: "",
  });
  const [rows, setRows] = useState<HistoryRow[]>([]),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(0);
  const qs = () =>
    new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v),
    ).toString();
  useEffect(() => {
    let active = true;
    setLoading(true);
    setRows([]);
    request<HistoryRow[]>(
      "/api/history?" + qs() + "&offset=" + page * 100 + "&limit=100",
    )
      .then((r) => {
        if (active) setRows(r);
      })
      .catch(onError)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [JSON.stringify(filters), page]);
  const update = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };
  const exportFile = async () => {
    try {
      const blob = await download("/api/export.csv?" + qs()),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "art-attendance-payments.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      onError(e);
    }
  };
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">ATTENDANCE & PAYMENTS</span>
          <h2>History</h2>
          <p>
            Actual handoffs, recorded confirmations, and preserved corrections.
          </p>
        </div>
        <button onClick={() => void exportFile()}>Export CSV</button>
      </section>
      <div className="history-filters">
        <Field label="Student">
          <select
            value={filters.student}
            onChange={(e) => update("student", e.target.value)}
          >
            <option value="">All students</option>
            {data.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.data.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Class">
          <select
            value={filters.class}
            onChange={(e) => update("class", e.target.value)}
          >
            <option value="">All classes</option>
            {data.classes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.data.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Session">
          <select
            value={filters.session}
            onChange={(e) => update("session", e.target.value)}
          >
            <option value="">All sessions</option>
            {data.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date} · {s.snapshot.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment">
          <select
            value={filters.paid}
            onChange={(e) => update("paid", e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Paid</option>
            <option value="false">Not confirmed</option>
          </select>
        </Field>
        <Field label="From date">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => update("from", e.target.value)}
          />
        </Field>
        <Field label="Through date">
          <input
            type="date"
            value={filters.to}
            onChange={(e) => update("to", e.target.value)}
          />
        </Field>
      </div>
      {loading && <p role="status">Loading saved history…</p>}
      {!loading && !rows.length && (
        <Empty>No records match these filters.</Empty>
      )}
      {rows.map((r) => (
        <article className="history-card" key={r.id}>
          <div className="card-heading">
            <div>
              <h3>{r.student_snapshot.name}</h3>
              <small>
                {r.session.date} · {r.session.snapshot.name} ·{" "}
                {r.session.snapshot.timezone}
              </small>
            </div>
            <StatusLabel status={r.status} />
          </div>
          <div className="history-facts">
            <div>
              <span>Arrival</span>
              <strong>
                {displayTime(r.arrival_at, r.session.snapshot.timezone)}
              </strong>
            </div>
            <div>
              <span>Departure</span>
              <strong>
                {displayTime(r.departure_at, r.session.snapshot.timezone)}
              </strong>
            </div>
            <div>
              <span>Pickup adult</span>
              <strong>{r.release?.name || "Not recorded"}</strong>
              <small>{r.release?.verification}</small>
            </div>
            <div>
              <span>Payment</span>
              <strong>{r.payment.confirmed ? "Paid" : "Not confirmed"}</strong>
              <small>
                {r.payment.method}
                {r.payment.amountCents != null
                  ? " · $" + (r.payment.amountCents / 100).toFixed(2)
                  : ""}
              </small>
            </div>
          </div>
          {r.payment.confirmed && (
            <p className="hint">
              Confirmation: {r.payment.confirmedBy} ·{" "}
              {displayTime(r.payment.confirmedAt, r.session.snapshot.timezone)}{" "}
              · Recorded{" "}
              {displayTime(r.payment.recordedAt, r.session.snapshot.timezone)}
              {r.payment.paymentDate
                ? " · Payment date " + r.payment.paymentDate
                : ""}
              {r.payment.note ? " · " + r.payment.note : ""}
            </p>
          )}
          {r.events.map((e) => (
            <EventDetail
              key={e.id}
              event={e}
              zone={r.session.snapshot.timezone}
            />
          ))}
        </article>
      ))}
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          disabled={rows.length < 100}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
