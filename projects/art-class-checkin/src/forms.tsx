import { useState, useEffect, type FormEvent } from "react";
import { Field, Dialog } from "./components";
import { request, download } from "./api";
import { businessDate, localInput, resolveLocal } from "./time";
import type {
  Bootstrap,
  RosterRow,
  SaveResult,
  Snapshot,
  Permission,
} from "./types";
export interface ModalSpec {
  kind: string;
  item?: any;
  row?: RosterRow;
  snapshot?: Snapshot;
  permission?: Permission;
  studentId?: string;
  backupId?: string;
}
type Props = {
  spec: ModalSpec;
  data: Bootstrap;
  close: () => void;
  save: (action: string, input: any) => Promise<SaveResult>;
  refresh: () => Promise<void>;
};
export function Forms({ spec, data, close, save, refresh }: Props) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selectedAdult, setSelectedAdult] = useState(
      spec.permission?.adult_id || "",
    );
  const [correctStatus, setCorrectStatus] = useState(
    spec.row?.status || "Expected",
  );
  const [permissionBaseline] = useState(data.permissions);
  const row = spec.row,
    item = spec.item,
    zone = spec.snapshot?.session.snapshot.timezone || data.settings.timezone;
  const submit =
    (callback: (f: FormData) => Promise<void>) =>
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      try {
        await callback(new FormData(e.currentTarget));
        close();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
  const str = (f: FormData, key: string) => String(f.get(key) || "");
  const pay = (f: FormData, confirmed: boolean) => ({
    confirmed,
    method: str(f, "method"),
    amountCents: str(f, "amount")
      ? Math.round(Number(str(f, "amount")) * 100)
      : null,
    paymentDate: str(f, "paymentDate") || null,
    note: str(f, "note"),
  });
  let title = "",
    body;
  if (spec.kind === "student") {
    title = item ? "Edit student" : "Add student";
    body = (
      <form
        onSubmit={submit(async (f) => {
          await save("student.save", {
            id: item?.id,
            version: item?.version || 0,
            data: {
              name: str(f, "name"),
              guardianName: str(f, "guardianName"),
              guardianPhone: str(f, "guardianPhone"),
              emergencyName: str(f, "emergencyName"),
              emergencyPhone: str(f, "emergencyPhone"),
              safetyNote: str(f, "safetyNote"),
              archived: f.has("archived"),
            },
          });
        })}
      >
        <Field label="Student name">
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={item?.data.name}
          />
        </Field>
        <Field label="Primary parent / guardian">
          <input
            name="guardianName"
            required
            maxLength={160}
            defaultValue={item?.data.guardianName}
          />
        </Field>
        <Field label="Parent / guardian phone">
          <input
            name="guardianPhone"
            type="tel"
            required
            maxLength={60}
            defaultValue={item?.data.guardianPhone}
          />
        </Field>
        <div className="form-grid">
          <Field label="Emergency contact">
            <input
              name="emergencyName"
              defaultValue={item?.data.emergencyName}
            />
          </Field>
          <Field label="Emergency phone">
            <input
              name="emergencyPhone"
              type="tel"
              defaultValue={item?.data.emergencyPhone}
            />
          </Field>
        </div>
        <p className="hint">
          An emergency contact is not automatically authorized for pickup.
        </p>
        <Field label="Concise allergy / safety note">
          <textarea
            name="safetyNote"
            maxLength={300}
            defaultValue={item?.data.safetyNote}
          />
        </Field>
        <label className="check-field">
          <input
            name="archived"
            type="checkbox"
            defaultChecked={item?.data.archived}
          />
          Archived — keep history, exclude from new rosters
        </label>
        <button className="primary" disabled={busy}>
          Save student
        </button>
      </form>
    );
  } else if (spec.kind === "adult") {
    title = item ? "Edit pickup adult" : "Add pickup adult";
    body = (
      <>
        <form
          onSubmit={submit(async (f) => {
            await save("adult.save", {
              id: item?.id,
              version: item?.version || 0,
              data: { name: str(f, "name"), phone: str(f, "phone") },
            });
          })}
        >
          <p className="hint">
            One adult can be linked to multiple siblings. Add pickup permission
            separately for each child.
          </p>
          <Field label="Adult name">
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={item?.data.name}
            />
          </Field>
          <Field label="Phone (optional)">
            <input name="phone" type="tel" defaultValue={item?.data.phone} />
          </Field>
          <button className="primary" disabled={busy}>
            Save adult
          </button>
        </form>
        {item && (
          <div className="photo-editor">
            <h3>Reference portrait</h3>
            <p className="hint">
              Optional. Use a portrait, never an image of an ID document.
              Maximum 2 MB.
            </p>
            {item.data.photoPath && (
              <img
                className="portrait"
                src={"/api/photos/" + item.id}
                alt={item.data.name + " reference portrait"}
              />
            )}
            <input
              aria-label="Upload reference portrait"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                const form = new FormData();
                form.set("photo", file);
                form.set("version", String(item.version));
                try {
                  await request("/api/photos/" + item.id, {
                    method: "POST",
                    body: form,
                  });
                  await refresh();
                  close();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        )}
      </>
    );
  } else if (spec.kind === "permission") {
    const student = data.students.find((s) => s.id === spec.studentId);
    title = "Pickup permission";
    body = (
      <form
        onSubmit={submit(async (f) => {
          const existing = permissionBaseline.find(
            (p) =>
              p.student_id === spec.studentId &&
              p.adult_id === str(f, "adultId"),
          );
          await save("permission.set", {
            studentId: spec.studentId,
            adultId: str(f, "adultId"),
            approved: f.has("approved"),
            relationship: str(f, "relationship"),
            note: str(f, "note"),
            version: existing?.version || 0,
          });
        })}
      >
        <p className="callout">
          <strong>{student?.data.name}</strong>
          <br />
          Verify with {student?.data.guardianName} using the contact already on
          file:{" "}
          <a href={"tel:" + student?.data.guardianPhone}>
            {student?.data.guardianPhone}
          </a>
          .
        </p>
        <Field label="Pickup adult">
          <select
            name="adultId"
            required
            value={selectedAdult}
            onChange={(e) => setSelectedAdult(e.target.value)}
          >
            <option value="">Choose an adult</option>
            {data.adults.map((a) => (
              <option key={a.id} value={a.id}>
                {a.data.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Relationship">
          <input
            name="relationship"
            maxLength={80}
            defaultValue={spec.permission?.relationship || ""}
          />
        </Field>
        <label className="check-field">
          <input
            type="checkbox"
            name="approved"
            defaultChecked={spec.permission?.approved ?? true}
          />
          Approved for this child
        </label>
        <Field
          label="Authorization confirmation note"
          hint="Record how you verified authorization through the parent's contact on file."
        >
          <textarea name="note" required minLength={3} maxLength={500} />
        </Field>
        <button disabled={busy || !selectedAdult} className="primary">
          Save permission
        </button>
      </form>
    );
  } else if (spec.kind === "class") {
    title = item ? "Edit class" : "Add class";
    body = (
      <form
        onSubmit={submit(async (f) => {
          await save("class.save", {
            id: item?.id,
            version: item?.version || 0,
            data: {
              name: str(f, "name"),
              instructor: str(f, "instructor"),
              studentIds: f.getAll("students").map(String),
              archived: f.has("archived"),
            },
          });
        })}
      >
        <Field label="Class name">
          <input name="name" required defaultValue={item?.data.name} />
        </Field>
        <Field label="Instructor">
          <input
            name="instructor"
            required
            defaultValue={item?.data.instructor}
          />
        </Field>
        <fieldset>
          <legend>Students for future sessions</legend>
          {data.students
            .filter((s) => !s.data.archived)
            .map((s) => (
              <label className="check-field" key={s.id}>
                <input
                  type="checkbox"
                  name="students"
                  value={s.id}
                  defaultChecked={item?.data.studentIds.includes(s.id)}
                />
                {s.data.name}
              </label>
            ))}
        </fieldset>
        <label className="check-field">
          <input
            type="checkbox"
            name="archived"
            defaultChecked={item?.data.archived}
          />
          Archive class; preserve its history
        </label>
        <button className="primary" disabled={busy}>
          Save class
        </button>
      </form>
    );
  } else if (spec.kind === "session") {
    title = "Create dated session";
    body = (
      <form
        onSubmit={submit(async (f) => {
          await save("session.create", {
            classId: str(f, "classId"),
            date: str(f, "date"),
          });
        })}
      >
        <Field label="Class">
          <select name="classId" required defaultValue={item?.id}>
            {data.classes
              .filter((c) => !c.data.archived)
              .map((c) => (
                <option value={c.id} key={c.id}>
                  {c.data.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Session date">
          <input
            name="date"
            type="date"
            required
            defaultValue={businessDate(zone)}
          />
        </Field>
        <p className="hint">
          Copies the current class roster. Attendance starts Expected and Paid
          starts Not confirmed.
        </p>
        <button className="primary" disabled={busy}>
          Create session
        </button>
      </form>
    );
  } else if (spec.kind === "release" && row) {
    const permissions = data.permissions.filter(
      (p) => p.student_id === row.student_id && p.approved,
    );
    const parent =
      data.students.find((s) => s.id === row.student_id)?.data ||
      row.student_snapshot;
    title = "Pick up " + row.student_snapshot.name;
    body = (
      <form
        onSubmit={submit(async (f) => {
          await save("attendance.release", {
            id: row.id,
            version: row.attendance_version,
            permissionId: str(f, "permissionId"),
            verification: str(f, "verification"),
          });
        })}
      >
        <p>
          Choose the adult present with you. Confirm only at the physical
          handoff.
        </p>
        <fieldset>
          <legend>Currently approved adults</legend>
          {permissions.map((p) => {
            const a = data.adults.find((a) => a.id === p.adult_id);
            return (
              <label className="adult-option" key={p.id}>
                <input type="radio" name="permissionId" value={p.id} required />
                {a?.data.photoPath && (
                  <img
                    className="portrait"
                    src={"/api/photos/" + a.id}
                    alt={a.data.name + " reference portrait"}
                  />
                )}
                <span>
                  <strong>{a?.data.name}</strong>
                  <small>
                    {p.relationship} · {a?.data.phone || "No phone recorded"}
                  </small>
                </span>
              </label>
            );
          })}
        </fieldset>
        {!permissions.length && (
          <p className="error">
            No approved adults. An app administrator must verify and record
            authorization.
          </p>
        )}
        <fieldset>
          <legend>How did you verify the adult?</legend>
          {["Known to staff", "Photo ID checked"].map((v) => (
            <label key={v} className="check-field">
              <input type="radio" name="verification" required value={v} />
              {v}
            </label>
          ))}
        </fieldset>
        <p className="callout">
          Adult not listed? Contact {parent.guardianName}:{" "}
          <a href={"tel:" + parent.guardianPhone}>{parent.guardianPhone}</a>. An
          app administrator can update permission after verifying authorization.
        </p>
        <button
          className="primary release-confirm"
          disabled={busy || !permissions.length}
        >
          Confirm release
        </button>
      </form>
    );
  } else if (spec.kind === "payment" && row) {
    const p = row.payment;
    title = "Payment · " + row.student_snapshot.name;
    body = (
      <form
        onSubmit={submit(async (f) => {
          await save("payment.set", {
            id: row.id,
            version: row.payment_version,
            payment: pay(f, f.has("confirmed")),
            reason: str(f, "reason"),
          });
        })}
      >
        <label className="check-field">
          <input
            type="checkbox"
            name="confirmed"
            defaultChecked={item?.clear ? false : p.confirmed}
          />
          Paid — manually confirmed
        </label>
        <p className="hint">
          Confirm independently in Square, Venmo, or your records. Not confirmed
          does not mean money is owed. Clearing does not issue a refund.
        </p>
        <PaymentFields payment={p} />
        {p.confirmed && (
          <Field
            label="Reason for clearing or correcting"
            hint="The previous values remain in the audit history."
          >
            <textarea name="reason" required minLength={3} maxLength={500} />
          </Field>
        )}
        <button className="primary" disabled={busy}>
          Save payment confirmation
        </button>
      </form>
    );
  } else if ((spec.kind === "paper" || spec.kind === "correction") && row) {
    const correction = spec.kind === "correction";
    title =
      (correction ? "Correct attendance · " : "Enter paper attendance · ") +
      row.student_snapshot.name;
    const showArrival =
        !correction || ["Present", "Released"].includes(correctStatus),
      showRelease = !correction || correctStatus === "Released";
    const eligible = data.adults.filter((a) =>
      data.permissions.some(
        (p) => p.student_id === row.student_id && p.adult_id === a.id,
      ),
    );
    body = (
      <form
        onSubmit={submit(async (f) => {
          const occurrence = str(f, "occurrence");
          await save(correction ? "attendance.correct" : "paper.reconcile", {
            id: row.id,
            version: row.attendance_version,
            arrivalAt: showArrival
              ? resolveLocal(str(f, "arrival"), zone, occurrence)
              : null,
            departureAt: showRelease
              ? resolveLocal(str(f, "departure"), zone, occurrence)
              : null,
            adultId: str(f, "adultId") || undefined,
            verification: str(f, "verification") || undefined,
            staffInitials: str(f, "staffInitials"),
            paid: f.has("paid"),
            paymentVersion: row.payment_version,
            confirmedAt: resolveLocal(str(f, "confirmedAt"), zone, occurrence),
            payment: pay(f, true),
            reason: str(f, "reason"),
            ...(correction ? { status: correctStatus } : {}),
          });
        })}
      >
        <p className="hint">
          Enter actual times in {zone}. Your account and the later entry time
          are recorded separately. Original records remain in history.
        </p>
        {correction && (
          <Field label="Correct attendance status">
            <select
              value={correctStatus}
              onChange={(e) => setCorrectStatus(e.target.value as any)}
            >
              {["Expected", "Absent", "Present", "Released"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        {showArrival && (
          <Field label="Actual arrival">
            <input
              name="arrival"
              type="datetime-local"
              required={correction}
              defaultValue={correction ? localInput(row.arrival_at, zone) : ""}
            />
          </Field>
        )}
        {showRelease && (
          <>
            <Field label="Actual departure (leave blank if still present)">
              <input
                name="departure"
                type="datetime-local"
                required={correction}
                defaultValue={
                  correction ? localInput(row.departure_at, zone) : ""
                }
              />
            </Field>
            <Field label="Pickup adult recorded on paper">
              <select name="adultId" defaultValue={row.release?.adultId || ""}>
                <option value="">Choose adult if released</option>
                {eligible.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.data.name}
                    {!data.permissions.find(
                      (p) =>
                        p.student_id === row.student_id && p.adult_id === a.id,
                    )?.approved
                      ? " (not currently approved)"
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Verification recorded on paper">
              <select
                name="verification"
                defaultValue={row.release?.verification || ""}
              >
                <option value="">Choose if released</option>
                <option>Known to staff</option>
                <option>Photo ID checked</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Handwritten staff initials (if available)">
          <input name="staffInitials" maxLength={80} />
        </Field>
        {!correction && (
          <>
            <label className="check-field">
              <input type="checkbox" name="paid" />
              Paper records a payment confirmation
            </label>
            <p className="hint">
              Leave unchecked to keep the saved digital payment unchanged.
            </p>
            <Field label="Original payment confirmation time (if known)">
              <input name="confirmedAt" type="datetime-local" />
            </Field>
            <PaymentFields />
          </>
        )}
        <Field label="Daylight saving repeated time">
          <select name="occurrence">
            <option value="">Choose only if the time occurred twice</option>
            <option value="first">First occurrence</option>
            <option value="second">Second occurrence</option>
          </select>
        </Field>
        {data.user.role === "admin" && (
          <Field
            label={
              correction
                ? "Required correction reason"
                : "Admin reconciliation / historical authorization note (only for a conflict)"
            }
          >
            <textarea
              name="reason"
              required={correction}
              minLength={3}
              maxLength={500}
            />
          </Field>
        )}
        <button className="primary" disabled={busy}>
          {correction ? "Save audited correction" : "Reconcile paper record"}
        </button>
      </form>
    );
  } else if (spec.kind === "settings") {
    title = "App settings";
    body = (
      <>
        <form
          onSubmit={submit(async (f) => {
            await save("settings.save", {
              businessName: str(f, "businessName"),
              timezone: str(f, "timezone"),
            });
          })}
        >
          <Field label="Business name">
            <input
              name="businessName"
              required
              defaultValue={data.settings.business_name}
            />
          </Field>
          <Field
            label="Business timezone"
            hint="Existing sessions keep their original timezone."
          >
            <input
              name="timezone"
              required
              defaultValue={data.settings.timezone}
            />
          </Field>
          <button className="primary" disabled={busy}>
            Save settings
          </button>
        </form>
        <h3>App staff</h3>
        <p className="hint">
          Add or revoke app grants in Differance Labs → Admin. These roles apply
          only to Art Class Check-In.
        </p>
        {data.staff.map((s) => (
          <div className="staff-row" key={s.email}>
            <span>
              {s.email}
              <small>
                {s.role === "admin" ? "App administrator" : "Staff"}
              </small>
            </span>
            {s.email !== data.user.email && (
              <button
                disabled={busy}
                onClick={async () => {
                  const reason = window.prompt(
                    "Reason for changing this app role:",
                  );
                  if (!reason) return;
                  setBusy(true);
                  try {
                    await save("staff.role", {
                      email: s.email,
                      role: s.role === "admin" ? "staff" : "admin",
                      reason,
                    });
                    close();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {s.role === "admin" ? "Make staff" : "Make app admin"}
              </button>
            )}
          </div>
        ))}
      </>
    );
  } else if (spec.kind === "device") {
    title = "Connect a Home Screen device";
    body = (
      <form
        onSubmit={submit(async (f) => {
          await request("/api/auth/device/approve", {
            method: "POST",
            body: JSON.stringify({
              code: str(f, "code").replaceAll(" ", "").toUpperCase(),
            }),
          });
        })}
      >
        <p>
          Enter the code displayed on your own Home Screen app. This signs that
          waiting device in as <strong>{data.user.email}</strong>.
        </p>
        <Field label="Code from your Home Screen app">
          <input
            name="code"
            required
            maxLength={10}
            autoComplete="off"
            autoCapitalize="characters"
          />
        </Field>
        <button className="primary" disabled={busy}>
          Approve my waiting device
        </button>
      </form>
    );
  } else if (spec.kind === "print") {
    title = "Print backup";
    body = <PrintFiles id={spec.backupId!} />;
  }
  return (
    <Dialog title={title} onClose={close} busy={busy}>
      {body}
      {busy && <p role="status">Saving on the server…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
function PaymentFields({ payment: p }: { payment?: any }) {
  return (
    <>
      <div className="form-grid">
        <Field label="Method (optional)">
          <select name="method" defaultValue={p?.method || ""}>
            <option value="">Not recorded</option>
            {["Square", "Venmo", "Cash", "Other"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount USD (optional)">
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              p?.amountCents == null ? "" : (p.amountCents / 100).toFixed(2)
            }
          />
        </Field>
      </div>
      <Field label="Actual payment date (optional)">
        <input
          name="paymentDate"
          type="date"
          defaultValue={p?.paymentDate || ""}
        />
      </Field>
      <Field label="Reference / note (optional)">
        <textarea name="note" maxLength={500} defaultValue={p?.note || ""} />
      </Field>
    </>
  );
}
function PrintFiles({ id }: { id: string }) {
  const [files, setFiles] = useState<
      { label: string; url: string; blob: Blob; name: string }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true,
      urls: string[] = [];
    Promise.all(
      ["roster", "reference"].map(async (kind) => {
        const blob = await download("/api/backups/" + id + "/" + kind + ".pdf");
        if (!alive) return null;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        return {
          label:
            kind === "roster"
              ? "Attendance roster"
              : "Staff pickup / contact reference",
          url,
          blob,
          name: "art-" + kind + ".pdf",
        };
      }),
    )
      .then((f) => {
        if (alive) setFiles(f.filter((x): x is NonNullable<typeof x> => !!x));
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [id]);
  return (
    <>
      <p>
        Print both sheets before class. Keep them under staff control, then
        reconcile actual attendance and payment confirmations afterward.
      </p>
      {!files.length && !error && (
        <p role="status">Preparing US Letter PDFs…</p>
      )}
      {files.map((f) => (
        <div className="print-file" key={f.name}>
          <h3>{f.label}</h3>
          <a
            className="button primary"
            href={f.url}
            target="_blank"
            rel="noreferrer"
          >
            Open PDF
          </a>{" "}
          <a className="button" href={f.url} download={f.name}>
            Save PDF
          </a>
          {typeof navigator.share === "function" && (
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    files: [
                      new File([f.blob], f.name, { type: "application/pdf" }),
                    ],
                  });
                } catch (e) {
                  if ((e as Error).name !== "AbortError")
                    setError(
                      "Use Save PDF, then open the file in Files and choose Share → Print.",
                    );
                }
              }}
            >
              Share / print
            </button>
          )}
        </div>
      ))}
      <p className="hint">
        On iPhone/iPad, open the PDF and choose Share → Print. If Home Screen
        mode does not show printing, save the PDF to Files, open it there, and
        choose Share → Print. The saved PDF contains private information.
      </p>
      <a
        className="button"
        href={location.origin}
        target="_blank"
        rel="noreferrer"
      >
        Open app in Safari for printing
      </a>
      <p className="hint">
        If Safari opens a sign-in screen, sign in through Differance Labs,
        select this dated session and tap Print backup again.
      </p>
      {error && <p className="error">{error}</p>}
    </>
  );
}
