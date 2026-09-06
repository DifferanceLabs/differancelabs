import "./styles.css";
import "./simulation.css";
import {
  active,
  approvedAdults,
  closingIssues,
  counts,
  createState,
  pending,
  rowFor,
  stamp,
  student,
  timeLabel,
  transition,
  type Action,
  type Role,
  type Row,
  type State,
} from "./state";

const KEY = "art-school-class-simulation-v3";
const root = document.getElementById("art-school-desk")!;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  root.querySelector<T>(selector)!;
const h = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
const button = (
  text: string,
  action: string,
  id = "",
  primary = false,
  disabled = false,
) =>
  '<button type="button" class="sd-btn ' +
  (primary ? "sd-primary" : "sd-quiet") +
  '" data-action="' +
  action +
  '" data-id="' +
  h(id) +
  '"' +
  (disabled ? " disabled" : "") +
  ">" +
  text +
  "</button>";
const pill = (text: string, warm = false) =>
  '<span class="sd-pill' +
  (warm ? " sd-pill-warm" : "") +
  '">' +
  h(text) +
  "</span>";
const heading = (title: string, subtitle = "") =>
  '<div class="sd-page-title"><h1>' +
  h(title) +
  '</h1><p class="sd-muted">' +
  h(subtitle) +
  "</p></div>";
const panel = (body: string) =>
  '<div class="sd-panel sd-stack">' + body + "</div>";
const notice = (text: string) => '<div class="sd-notice">' + h(text) + "</div>";
const field = (
  label: string,
  name: string,
  value = "",
  type = "text",
  required = true,
) =>
  '<label class="sd-field">' +
  label +
  '<input name="' +
  name +
  '" type="' +
  type +
  '" value="' +
  h(value) +
  '"' +
  (required ? " required" : "") +
  "></label>";
const area = (label: string, name: string, value = "", required = true) =>
  '<label class="sd-field">' +
  label +
  '<textarea name="' +
  name +
  '" aria-label="' +
  h(label) +
  '"' +
  (required ? " required" : "") +
  ">" +
  h(value) +
  "</textarea></label>";
const submit = (text: string) =>
  '<button type="submit" class="sd-btn sd-primary">' + text + "</button>";
const check = (
  label: string,
  name: string,
  checked = false,
  required = false,
) =>
  '<label class="sd-check"><input type="checkbox" name="' +
  name +
  '"' +
  (checked ? " checked" : "") +
  (required ? " required" : "") +
  "><span>" +
  label +
  "</span></label>";
const select = (
  label: string,
  name: string,
  options: [string, string][],
  selected = "",
) =>
  '<label class="sd-field">' +
  label +
  '<select name="' +
  name +
  '" aria-label="' +
  h(label) +
  '">' +
  options
    .map(
      ([value, text]) =>
        '<option value="' +
        h(value) +
        '"' +
        (value === selected ? " selected" : "") +
        ">" +
        h(text) +
        "</option>",
    )
    .join("") +
  "</select></label>";
const form = (name: string, body: string, id = "", extra = "") =>
  '<form class="sd-form" data-form="' +
  name +
  '" data-id="' +
  h(id) +
  '" ' +
  extra +
  ">" +
  body +
  "</form>";
const storage = { available: true };
let state = load();
let role: Role = "manager";
let view = "today";
let detail: { kind: string; id: string } | null = null;
let filter = "All",
  search = "";
let returnView = "today";
let eventOperation = 0;
function load(): State {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(KEY) || "null",
    ) as State | null;
    if (
      saved?.schema === 3 &&
      saved.sessions?.length &&
      saved.students?.length &&
      Array.isArray(saved.audit)
    )
      return saved;
  } catch {
    /* A blocked or stale browser store starts a new fictional run. */
  }
  return createState();
}
function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
    storage.available = true;
  } catch {
    storage.available = false;
  }
}
function announce(message: string) {
  $("#sd-status").textContent =
    message +
    (storage.available
      ? " · Saved in this tab only."
      : " · Browser storage is unavailable; this run will reset on reload.");
}
function fail(error: unknown) {
  $("#sd-error").hidden = false;
  $("#sd-error").textContent =
    error instanceof Error ? error.message : String(error);
  $("#sd-error").scrollIntoView({ block: "nearest" });
}
function perform(
  action: Action,
  destination = view,
  message = "Practice record updated.",
) {
  try {
    state = transition(
      state,
      action,
      role,
      "browser-" + crypto.randomUUID() + "-" + eventOperation++,
    );
    save();
    detail = null;
    view = destination;
    render();
    announce(message);
    return true;
  } catch (error) {
    fail(error);
    return false;
  }
}
function open(kind: string, id = "") {
  returnView = view;
  detail = { kind, id };
  render();
  window.scrollTo({ top: 0 });
}
function changeRole(next: Role) {
  role = next;
  detail = null;
  view = "today";
  render();
  announce(
    next === "staff"
      ? "Riley is running class. The same practice records are shared with the manager."
      : "Morgan can review staff requests and close the class.",
  );
  window.scrollTo({ top: 0 });
}
const session = () => active(state);
const safeDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "America/Chicago",
  }).format(new Date(date + "T12:00:00Z"));
const currentRows = () => session().roster;
const rowName = (row: Row) => student(state, row.studentId).name;
function countStrip() {
  const c = counts(session());
  return (
    '<div class="sd-kpis">' +
    Object.entries(c)
      .map(
        ([label, value]) =>
          '<div class="sd-small sd-muted"><span class="sd-number">' +
          value +
          "</span>" +
          label +
          "</div>",
      )
      .join("") +
    "</div>"
  );
}
function task(key: string, label: string) {
  return (
    '<label class="sd-check"><input type="checkbox" data-task="' +
    key +
    '"' +
    (session().tasks[key] ? " checked" : "") +
    (["Closed", "Submitted"].includes(session().phase) ? " disabled" : "") +
    "><span>" +
    label +
    "</span></label>"
  );
}
function phaseAction() {
  const s = session();
  if (s.phase === "Preparing")
    return button("Start arrivals", "phase", "Arrivals", true);
  if (s.phase === "Arrivals")
    return button("Begin lesson", "phase", "Teaching", true);
  if (s.phase === "Teaching")
    return button("Begin pickup · 4:25 PM", "phase", "Pickup", true);
  if (s.phase === "Pickup") return button("Finish class", "finish", "", true);
  if (s.phase === "Submitted")
    return role === "manager"
      ? button("Review & close class", "finish", "", true)
      : pill("Waiting for manager review", true);
  return button("Open completed class", "summary", "", true);
}
function today() {
  const s = session(),
    c = counts(s);
  const hint =
    s.phase === "Preparing"
      ? "Start in Run class: prepare the room and paper backup."
      : s.phase === "Closed"
        ? "Class is closed. Its records and audit history remain available."
        : s.phase === "Submitted"
          ? "Staff finished. The manager can review the class and close it."
          : "Keep the roster current. Each child needs their own release confirmation.";
  return (
    heading(
      role === "manager"
        ? "Your class, from start to finish."
        : "Ready for your artists?",
      hint,
    ) +
    panel(
      '<div class="sd-between">' +
        pill(s.phase, s.phase === "Submitted") +
        '<span class="sd-small sd-muted">' +
        h(s.room) +
        " · " +
        s.roster.length +
        " students</span></div><h2>" +
        h(s.name) +
        '</h2><p class="sd-muted">Color & collage · 3:30–4:30 PM</p>' +
        countStrip() +
        '<div class="sd-gap">' +
        button("Open roster", "roster", "", true) +
        button("Print backup", "print") +
        phaseAction() +
        "</div>",
    ) +
    (role === "staff" && s.phase === "Preparing"
      ? panel(
          "<h3>Before the door opens</h3>" +
            task("kits", "Set out " + s.roster.length + " collage kits") +
            task("safety", "Review the class safety notes") +
            task("backup", "Paper backup is ready and under staff control") +
            button("Open lesson & safety notes", "lesson"),
        )
      : "") +
    (role === "manager"
      ? panel(
          '<div class="sd-between"><h3>Manager review</h3>' +
            button("Open reviews (" + pending(state).length + ")", "reviews") +
            "</div>" +
            (pending(state).length
              ? pending(state)
                  .map(
                    (r) =>
                      '<button type="button" class="sd-action" data-action="review" data-id="' +
                      r.id +
                      '"><span>' +
                      h(r.summary) +
                      '<span class="sd-small sd-muted">' +
                      h(r.createdBy) +
                      " · " +
                      timeLabel(r.createdAt) +
                      '</span></span><span class="sd-arrow">→</span></button>',
                  )
                  .join("")
              : '<p class="sd-muted">No pending decisions. Staff requests appear here as the class runs.</p>') +
            (s.tasks.restock
              ? notice("Staff flagged glue sticks for restocking.") +
                button("Mark supplies restocked", "restocked")
              : ""),
        )
      : "") +
    panel(
      '<h3>Practice route</h3><ol class="sd-steps"><li>Staff prepare, open arrivals and check in students. Mark a no-show Absent.</li><li>Staff can send a pickup request or a correction to the manager.</li><li>Manager resolves requests; staff see the result on the same roster.</li><li>Record each pickup, reconcile paper, and submit the finished class.</li><li>Manager reviews the summary, simulates a family recap and closes class.</li></ol>' +
        (role === "manager" && s.phase === "Preparing"
          ? button("Switch to staff", "staff", "", true)
          : button("View class history", "history")),
    ) +
    (c.Present && s.phase === "Pickup"
      ? notice(
          c.Present +
            " children remain Present. No one is released automatically.",
        )
      : "")
  );
}
function rosterHtml() {
  const s = session();
  const rows = s.roster.filter(
    (r) =>
      (filter === "All" || r.status === filter) &&
      rowName(r).toLowerCase().includes(search.toLowerCase()),
  );
  const closed = ["Closed", "Submitted"].includes(s.phase);
  return (
    heading(
      s.name,
      "Record the actual handoff. Payment controls are separate.",
    ) +
    countStrip() +
    '<div class="sd-filter">' +
    field("Find a student", "search", search, "search", false) +
    select(
      "Attendance",
      "filter",
      ["All", "Expected", "Present", "Released", "Absent"].map((x) => [x, x]),
      filter,
    ) +
    "</div>" +
    '<div class="sd-gap sd-tools">' +
    phaseAction() +
    button("Print backup", "print") +
    button("Enter paper attendance", "paper") +
    "</div>" +
    '<div class="sd-roster">' +
    (rows
      .map((r) => {
        const child = student(state, r.studentId);
        return (
          '<article class="sd-student" data-student="' +
          r.studentId +
          '"><div><h2 class="sd-student-name">' +
          h(child.name) +
          '</h2><div class="sd-attendance">' +
          r.status +
          (r.departure
            ? " · " + timeLabel(r.departure)
            : r.arrival
              ? " · " + timeLabel(r.arrival)
              : "") +
          "</div>" +
          (child.safety
            ? '<p class="sd-small sd-safety">' + h(child.safety) + "</p>"
            : "") +
          '</div><div class="sd-gap">' +
          (closed
            ? ""
            : r.status === "Expected"
              ? button(
                  "Check in",
                  "checkin",
                  r.studentId,
                  true,
                  s.phase === "Preparing",
                ) + button("Absent", "absent", r.studentId)
              : r.status === "Present"
                ? button("Pick up", "pickup", r.studentId, true)
                : "") +
          button("Details", "student", r.studentId) +
          '</div><div class="sd-payment-controls"><label class="sd-check"><input type="checkbox" data-paid="' +
          r.studentId +
          '" data-version="' +
          r.payment.version +
          '"' +
          (r.payment.confirmed ? " checked" : "") +
          '><span>Paid <span class="sd-small sd-muted">' +
          (r.payment.confirmed ? "· Confirmed" : "· Not confirmed") +
          "</span></span></label>" +
          button("Payment details", "payment", r.studentId) +
          "</div></article>"
        );
      })
      .join("") || '<p class="sd-muted">No matching students.</p>') +
    "</div>"
  );
}
function reviewsHtml() {
  return (
    heading(
      role === "manager"
        ? "Decisions that move class forward."
        : "Your requests to the manager.",
      "Approved changes update this practice roster immediately.",
    ) +
    (state.reviews
      .filter((r) => r.sessionId === session().id)
      .map((r) =>
        panel(
          '<div class="sd-between"><h3>' +
            h(r.summary) +
            "</h3>" +
            pill(r.status, r.status === "Pending") +
            '</div><p class="sd-muted">' +
            h(r.note) +
            '</p><p class="sd-small">' +
            h(r.createdBy) +
            " · " +
            timeLabel(r.createdAt) +
            "</p>" +
            (r.resolution
              ? "<p>Manager decision: " + h(r.resolution) + "</p>"
              : role === "manager"
                ? button("Review request", "review", r.id, true)
                : '<p class="sd-small sd-muted">Waiting for Morgan. Switch to Manage studio to practice the review.</p>'),
        ),
      )
      .join("") ||
      panel(
        "<p>No requests yet. Staff can request pickup approval, record an incident, or flag an attendance correction.</p>",
      ))
  );
}
function tasksHtml() {
  return (
    heading(
      "Finish the room. Finish the records.",
      "Submitted classes go to the manager for sign-off.",
    ) +
    panel(
      task("clean", "Clean tables and put away materials") +
        task("supplies", "Check supplies for the next class") +
        task("reconcile", "Reconcile paper records and check the roster") +
        '<div class="sd-gap">' +
        button("Enter paper attendance", "paper") +
        button("Report an incident", "incident") +
        button("Flag glue for restocking", "restock") +
        "</div>",
    ) +
    panel(
      "<h3>Capture today's work</h3><p>Add fictional artwork to the private sample library. The manager controls public approval.</p>" +
        button("Add sample artwork", "upload") +
        '<p class="sd-small sd-muted">' +
        state.photos.filter((p) => p.sessionId === session().id).length +
        " sample(s) recorded.</p>",
    ) +
    panel(
      "<h3>Manager requests</h3>" +
        button(
          "View requests (" + pending(state).length + " pending)",
          "reviews",
        ),
    ) +
    button(
      session().phase === "Submitted"
        ? "View submitted class"
        : session().phase === "Closed"
          ? "View completed class"
          : "Submit class for manager review",
      "finish",
      "",
      true,
    )
  );
}
function studentDetails(id: string) {
  const child = student(state, id),
    r = rowFor(state, id)!;
  return (
    heading(child.name, r.status + " · " + session().name) +
    panel(
      "<h3>Parent on file</h3><p>" +
        h(child.parent) +
        " · " +
        h(child.phone) +
        "</p>" +
        (child.safety
          ? notice(child.safety)
          : '<p class="sd-small sd-muted">No special safety note in this fictional record.</p>') +
        "<h3>Currently approved pickup adults</h3>" +
        approvedAdults(state, id)
          .map(
            (a) =>
              '<div class="sd-line-item"><div>' +
              h(a.name) +
              '<p class="sd-small sd-muted">' +
              h(a.relationship) +
              (a.sessionId ? " · this dated session" : "") +
              "</p></div>" +
              (role === "manager" ? button("Revoke", "revoke", a.id) : "") +
              "</div>",
          )
          .join("") +
        '<div class="sd-gap">' +
        button("Request another pickup adult", "request-pickup", id) +
        button("Request attendance correction", "correction", id) +
        "</div>",
    ) +
    panel(
      "<h3>Session record</h3><p>Arrival: " +
        timeLabel(r.arrival) +
        " · " +
        h(r.arrivalActor || "Not recorded") +
        "</p><p>Release: " +
        timeLabel(r.departure) +
        " · " +
        h(r.releaseActor || "Not recorded") +
        "</p><p>Adult: " +
        h(r.adult || "Not released") +
        "</p><p>Verification: " +
        h(r.verification || "—") +
        "</p>" +
        button("View payment details", "payment", id) +
        button("Open audit history", "history-student", id),
    )
  );
}
function familiesHtml() {
  return (
    heading(
      "Families & students.",
      "Each child keeps their own attendance and permissions.",
    ) +
    panel(
      currentRows()
        .map(
          (r) =>
            '<button class="sd-action" type="button" data-action="student" data-id="' +
            r.studentId +
            '"><span>' +
            h(rowName(r)) +
            '<span class="sd-small sd-muted">' +
            h(student(state, r.studentId).parent) +
            " · " +
            r.status +
            '</span></span><span class="sd-arrow">→</span></button>',
        )
        .join(""),
    )
  );
}
function scheduleHtml() {
  return (
    heading(
      "Dated class sessions.",
      "Creating the next class copies the roster, with fresh attendance and payment confirmation.",
    ) +
    state.sessions
      .map((s) =>
        panel(
          '<div class="sd-between"><h2>' +
            h(s.name) +
            "</h2>" +
            pill(s.phase) +
            "</div><p>" +
            h(safeDate(s.date)) +
            " · " +
            s.roster.length +
            " students</p>" +
            button(
              s.id === session().id ? "Selected class" : "Select class",
              "select-session",
              s.id,
              s.id !== session().id,
            ),
        ),
      )
      .join("") +
    (role === "manager" ? button("Create next session", "copy", "", true) : "")
  );
}
function moneyHtml() {
  const rows = currentRows(),
    paid = rows.filter((r) => r.payment.confirmed),
    amount = paid.reduce((sum, r) => sum + (r.payment.amount || 0), 0);
  const expenses = state.expenses.filter((e) => e.sessionId === session().id);
  return (
    heading(
      "Payment confirmation & expenses.",
      "Not confirmed is not a debt. Payment never blocks a handoff.",
    ) +
    panel(
      '<div class="sd-kpis"><div><span class="sd-number">' +
        paid.length +
        '</span>Confirmed</div><div><span class="sd-number">' +
        (rows.length - paid.length) +
        '</span>Not confirmed</div><div><span class="sd-number">' +
        money(amount) +
        '</span>Amounts recorded</div></div><p class="sd-small sd-muted">Fictional amounts only. Confirmations without an amount are not included in the total.</p>' +
        '<div class="sd-gap">' +
        button("Simulate a Square payment", "processor") +
        button("Add sample expense", "expense") +
        button("Download payment CSV", "export-payments") +
        "</div>",
    ) +
    panel(
      rows
        .map(
          (r) =>
            '<div class="sd-line-item"><div>' +
            h(rowName(r)) +
            '<p class="sd-small sd-muted">' +
            (r.payment.confirmed
              ? h(r.payment.method || "Manual") +
                " · " +
                (r.payment.amount === null
                  ? "No amount entered"
                  : money(r.payment.amount))
              : "Not confirmed") +
            "</p></div>" +
            button("Details", "payment", r.studentId) +
            "</div>",
        )
        .join(""),
    ) +
    panel(
      "<h3>Sample expenses</h3>" +
        (expenses
          .map(
            (e) =>
              '<div class="sd-line-item"><span>' +
              h(e.supplier) +
              " · " +
              h(e.category) +
              "</span><span>" +
              money(e.amount) +
              "</span></div>",
          )
          .join("") ||
          '<p class="sd-muted">No expenses recorded for this session.</p>'),
    )
  );
}
function messagesHtml() {
  const items = state.messages.filter((m) => m.sessionId === session().id);
  return (
    heading(
      "Class messages.",
      "Messages stay in this practice outbox. No email or text is sent.",
    ) +
    panel(
      "<h3>Alex Thompson asks: “Should Noah bring an apron?”</h3>" +
        button("Reply using the class-prep template", "reply", "", true),
    ) +
    panel(
      "<h3>Simulation outbox</h3>" +
        (items
          .map(
            (m) =>
              '<article class="sd-message"><div class="sd-between"><h3>' +
              h(m.subject) +
              "</h3>" +
              pill("Simulated") +
              '</div><p class="sd-small sd-muted">' +
              h(m.recipient) +
              " · " +
              h(m.channel) +
              " · " +
              timeLabel(m.at) +
              '</p><p class="sd-prewrap">' +
              h(m.body) +
              '</p><p class="sd-small sd-muted">' +
              h(m.actor) +
              "</p></article>",
          )
          .join("") ||
          '<p class="sd-muted">Your sample replies and class updates will appear here.</p>'),
    )
  );
}
function growthHtml() {
  const photos = state.photos.filter((p) => p.sessionId === session().id);
  return (
    heading(
      "From class to family update.",
      "Private samples stay private until the manager approves an eligible use.",
    ) +
    '<div class="sd-gap sd-tools">' +
    button("Add sample artwork", "upload") +
    button("Prepare family recap", "recap", "", true) +
    button("Prepare public post", "public-post") +
    button("View simulation outbox", "messages") +
    "</div>" +
    (photos
      .map((p) =>
        panel(
          '<div class="sd-art" role="img" aria-label="Fictional artwork illustration"></div><h3>' +
            h(p.title) +
            "</h3>" +
            pill(
              p.publicApproved
                ? "Approved for public simulation"
                : "Private sample",
              !p.publicApproved,
            ) +
            '<p class="sd-small sd-muted">' +
            (p.studentIds.length
              ? "Represented students: " +
                p.studentIds.map((id) => h(student(state, id).name)).join(", ")
              : "Artwork only · no child represented") +
            "</p>" +
            (!p.publicApproved && role === "manager"
              ? button("Review public permission", "photo-review", p.id)
              : ""),
        ),
      )
      .join("") ||
      panel(
        "<p>No sample artwork yet. Staff can add it during class, then the manager can review it here.</p>",
      ))
  );
}
function historyHtml(studentId = "") {
  const items = state.audit.filter(
    (e) =>
      e.sessionId === session().id && (!studentId || e.studentId === studentId),
  );
  return (
    heading(
      studentId
        ? "History: " + student(state, studentId).name
        : "Class history.",
      "Original events stay visible alongside later corrections.",
    ) +
    '<div class="sd-gap sd-tools">' +
    button("Download attendance CSV", "export-attendance") +
    button("Download audit CSV", "export-audit") +
    "</div>" +
    panel(
      items
        .slice()
        .reverse()
        .map(
          (e) =>
            '<article class="sd-message"><h3>' +
            h(e.kind) +
            (e.studentId ? " · " + h(student(state, e.studentId).name) : "") +
            '</h3><p class="sd-small sd-muted">Actual: ' +
            timeLabel(e.actualAt) +
            " · Recorded: " +
            timeLabel(e.recordedAt) +
            " · " +
            h(e.actor) +
            "</p>" +
            (e.reason ? '<p class="sd-prewrap">' + h(e.reason) + "</p>" : "") +
            "<details><summary>Previous and new values</summary><pre>" +
            h(JSON.stringify({ previous: e.before, next: e.after }, null, 2)) +
            "</pre></details></article>",
        )
        .join("") ||
        "<p>No activity yet. Start the class to build its history.</p>",
    )
  );
}
function summaryHtml() {
  const s = session(),
    paid = currentRows().filter((r) => r.payment.confirmed).length;
  return (
    heading(
      s.phase === "Closed" ? "Class complete." : "Class handoff summary.",
      s.name + " · " + safeDate(s.date),
    ) +
    panel(
      '<div class="sd-between">' +
        pill(s.phase) +
        '<span class="sd-small sd-muted">' +
        (s.closedAt ? "Closed " + timeLabel(s.closedAt) : "") +
        "</span></div>" +
        countStrip() +
        "<p>" +
        paid +
        " payment confirmations · " +
        pending(state).length +
        " pending manager reviews</p>" +
        '<p class="sd-prewrap">' +
        h(s.closeNote || "No handoff note.") +
        '</p><div class="sd-gap">' +
        button("View history", "history") +
        button("Attendance CSV", "export-attendance") +
        button("Payment CSV", "export-payments") +
        "</div>",
    ) +
    (role === "manager"
      ? panel(
          '<h3>After class</h3><div class="sd-gap">' +
            button("Prepare family recap", "recap") +
            button("Review sample photos", "growth") +
            button("Create next session", "copy") +
            (["Closed", "Submitted"].includes(s.phase)
              ? button("Reopen with a reason", "reopen")
              : "") +
            "</div>",
        )
      : "")
  );
}
function printHtml() {
  const s = session();
  const pages: Row[][] = [];
  for (let offset = 0; offset < currentRows().length; offset += 8) {
    pages.push(currentRows().slice(offset, offset + 8));
  }
  const rosterPages = pages
    .map(
      (rows, index) =>
        '<section class="sd-paper-page"><h1>Art Class Check-In</h1><h2>' +
        h(s.name) +
        "</h2><p>" +
        h(safeDate(s.date)) +
        " · Instructor: " +
        h(s.instructor) +
        "</p><p>Printed at simulation time: " +
        timeLabel(stamp(s)) +
        " · Staff use only · Fictional practice · Roster " +
        (index + 1) +
        " of " +
        pages.length +
        '</p><table class="sd-paper-roster"><thead><tr><th>Student</th><th>Paid at print</th><th>Arrival / initials</th><th>Departure / pickup adult / initials</th><th>Payment notes / initials</th></tr></thead><tbody>' +
        rows
          .map(
            (r) =>
              "<tr><td>" +
              h(rowName(r)) +
              "</td><td>" +
              (r.payment.confirmed ? "Paid" : "Not confirmed") +
              "</td><td></td><td></td><td></td></tr>",
          )
          .join("") +
        "</tbody></table></section>",
    )
    .join("");
  return (
    '<div class="sd-print-controls sd-gap">' +
    button("Print / Save PDF", "print-now", "", true) +
    button("Back to class", "back") +
    "</div>" +
    '<div class="sd-paper">' +
    rosterPages +
    '<section class="sd-paper-reference"><h2>Staff reference · keep under staff control</h2><p>' +
    h(s.name + " · " + s.date) +
    "</p><p>Fictional contacts · these are not real phone numbers.</p><table><thead><tr><th>Student</th><th>Parent on file</th><th>Approved pickup adults</th><th>Safety note</th></tr></thead><tbody>" +
    currentRows()
      .map((r) => {
        const child = student(state, r.studentId);
        return (
          "<tr><td>" +
          h(child.name) +
          "</td><td>" +
          h(child.parent) +
          "<br>" +
          h(child.phone) +
          "</td><td>" +
          approvedAdults(state, child.id)
            .map((a) => h(a.name + " · " + a.relationship))
            .join("<br>") +
          "</td><td>" +
          h(child.safety) +
          "</td></tr>"
        );
      })
      .join("") +
    "</tbody></table></section></div>"
  );
}

function finishHtml() {
  const s = session();
  if (s.phase === "Closed") return summaryHtml();
  if (s.phase === "Submitted" && role === "staff")
    return (
      summaryHtml() +
      notice(
        "Submitted to Morgan. Switch to Manage studio to review and close the class.",
      )
    );
  const issues = closingIssues(state, s.phase === "Submitted");
  return (
    heading(
      s.phase === "Submitted"
        ? "Review & close class."
        : "Hand the class to your manager.",
      "Attendance, payment history and staff notes stay together.",
    ) +
    panel(
      countStrip() +
        (issues.length
          ? '<h3>Before this class can finish</h3><ul class="sd-steps">' +
            issues.map((i) => "<li>" + h(i) + "</li>").join("") +
            '</ul><div class="sd-gap">' +
            button("Return to roster", "roster") +
            button("Open closing tasks", "tasks") +
            button("View manager requests", "reviews") +
            "</div>"
          : notice(
              "Every child is accounted for. Closing tasks and manager requests are complete.",
            )) +
        (s.closeNote ? "<p>Staff handoff: " + h(s.closeNote) + "</p>" : "") +
        form(
          s.phase === "Submitted" ? "close" : "finish",
          area(
            s.phase === "Submitted" ? "Manager sign-off note" : "Handoff note",
            "note",
            "",
            false,
          ) +
            '<button type="submit" class="sd-btn sd-primary"' +
            (issues.length ? " disabled" : "") +
            ">" +
            (s.phase === "Submitted"
              ? "Close class"
              : "Submit class for manager review") +
            "</button>",
        ),
    )
  );
}
function reviewForm(id: string) {
  const request = state.reviews.find((r) => r.id === id);
  if (!request || role !== "manager") return reviewsHtml();
  if (request.status !== "Pending")
    return (
      heading(request.summary) +
      panel(pill(request.status) + "<p>" + h(request.resolution) + "</p>")
    );
  let details = "";
  if (request.kind === "pickup")
    details =
      "<h3>Verify through the parent on file</h3>" +
      request.studentIds
        .map(
          (id) =>
            "<p>" +
            h(
              student(state, id).name +
                " · " +
                student(state, id).parent +
                " · " +
                student(state, id).phone,
            ) +
            "</p>",
        )
        .join("") +
      notice(
        "Practice the verification; do not call these fictional numbers. Approval applies only to this dated session. Confirm release separately for each sibling.",
      );
  if (request.paper)
    details =
      "<p>Paper: arrival " +
      h(request.paper.arrival) +
      " · departure " +
      h(request.paper.departure) +
      " · " +
      h(request.paper.adult) +
      "</p>" +
      "<p>Current digital status: " +
      h(rowFor(state, request.studentIds[0])!.status) +
      "</p>" +
      notice(
        "Approval appends an audited correction. Original digital events remain in history. A blank paper Paid box never clears a digital confirmation.",
      );
  if (request.kind === "correction")
    details =
      "<p>Requested attendance: " +
      h(request.desired) +
      "</p>" +
      notice(
        "Approval changes the current roster and keeps original handoff events in history.",
      );
  return (
    heading(
      request.summary,
      "Requested by " +
        request.createdBy +
        " at " +
        timeLabel(request.createdAt),
    ) +
    panel(
      '<p class="sd-prewrap">' +
        h(request.note) +
        "</p>" +
        details +
        form(
          "review",
          area("Decision and reason", "reason") +
            (request.kind === "pickup"
              ? check(
                  "I verified this fictional authorization through the parent's stored contact.",
                  "parentVerified",
                )
              : "") +
            '<div class="sd-gap"><button type="submit" class="sd-btn sd-primary" name="decision" value="approve">Approve request</button><button type="submit" class="sd-btn sd-quiet" name="decision" value="decline">Decline request</button></div>',
          id,
        ),
    )
  );
}
function detailHtml(kind: string, id: string): string {
  const r = id ? rowFor(state, id) : undefined;
  if (kind === "student") return studentDetails(id);
  if (kind === "history-student") return historyHtml(id);
  if (kind === "print") return printHtml();
  if (kind === "finish") return finishHtml();
  if (kind === "review") return reviewForm(id);
  if (kind === "lesson")
    return (
      heading("Color & collage.", "A simple 60-minute class plan.") +
      panel(
        "<ol class='sd-steps'><li>3:30 · Welcome artists and show the sample collage.</li><li>3:40 · Demonstrate safe scissors and layering.</li><li>3:50 · Make art; support students one table at a time.</li><li>4:15 · Share artwork and clean up.</li><li>4:25 · Open individual pickup confirmations.</li></ol>" +
          "<h3>Safety notes for this class</h3>" +
          state.students
            .filter((s) => s.safety)
            .map((s) => notice(s.name + ": " + s.safety))
            .join("") +
          "<p>Brooks siblings do not have permission for public student photos. Artwork-only samples are available in Tasks.</p>" +
          button("Open roster", "roster", "", true),
      )
    );
  if (kind === "pickup" && r) {
    const adults = approvedAdults(state, id);
    return (
      heading(
        "Release " + student(state, id).name + ".",
        "Confirm only at the physical handoff.",
      ) +
      panel(
        form(
          "pickup",
          select("Approved pickup adult", "adultId", [
            ["", "Choose an approved adult"],
            ...adults.map(
              (a) =>
                [a.id, a.name + " · " + a.relationship] as [string, string],
            ),
          ]) +
            select("How did you verify this adult?", "verification", [
              ["", "Choose verification"],
              ["Known to staff", "Known to staff"],
              ["Photo ID checked", "Photo ID checked"],
            ]) +
            notice(
              "No photo ID image is collected. The child stays Present until you confirm.",
            ) +
            submit("Confirm release"),
          id,
          'data-version="' + r.version + '"',
        ) +
          button("Adult is not on the approved list", "request-pickup", id) +
          '<p class="sd-small">Parent on file: ' +
          h(student(state, id).parent + " · " + student(state, id).phone) +
          "</p>",
      )
    );
  }
  if (kind === "payment" && r) {
    const p = r.payment;
    return (
      heading(
        "Payment: " + student(state, id).name + ".",
        "For " +
          safeDate(session().date) +
          " only. Clearing Paid does not issue a refund.",
      ) +
      panel(
        "<p>" +
          (p.confirmed
            ? "Confirmed by " +
              h(p.actor) +
              " · actual " +
              timeLabel(p.actualAt) +
              " · recorded " +
              timeLabel(p.recordedAt) +
              " · " +
              h(p.source)
            : "Not confirmed · this is not proof of an outstanding debt.") +
          "</p>" +
          form(
            "payment",
            check("Paid · independently confirmed", "confirmed", p.confirmed) +
              select(
                "Method (optional)",
                "method",
                [
                  ["", "Not specified"],
                  ["Square", "Square"],
                  ["Venmo", "Venmo"],
                  ["Cash", "Cash"],
                  ["Other", "Other"],
                ],
                p.method,
              ) +
              field(
                "Amount (optional)",
                "amount",
                p.amount === null ? "" : String(p.amount),
                "number",
                false,
              ) +
              area("Reference or note (optional)", "note", p.note, false) +
              area(
                "Reason for clearing or correcting a confirmation",
                "reason",
                "",
                p.confirmed,
              ) +
              submit("Save payment confirmation"),
            id,
            'data-version="' + p.version + '"',
          ),
      )
    );
  }
  if (kind === "request-pickup") {
    const child = student(state, id || state.students[0].id),
      siblings = state.students.filter((s) => s.family === child.family);
    return (
      heading(
        "Request pickup authorization.",
        "The manager must verify the parent on file before this adult can be selected.",
      ) +
      panel(
        "<p>Parent: " +
          h(child.parent + " · " + child.phone) +
          "</p>" +
          form(
            "request-pickup",
            "<fieldset><legend>Children included in this request</legend>" +
              siblings
                .map(
                  (s) =>
                    '<label class="sd-check"><input type="checkbox" name="studentIds" value="' +
                    s.id +
                    '"' +
                    (s.id === child.id ? " checked" : "") +
                    "><span>" +
                    h(s.name) +
                    "</span></label>",
                )
                .join("") +
              "</fieldset>" +
              field("Proposed adult's name", "adultName") +
              field("Relationship", "relationship") +
              area("Request details", "note") +
              submit("Send to manager for review"),
          ),
      )
    );
  }
  if (kind === "correction" && r)
    return (
      heading(
        "Request an attendance correction.",
        student(state, id).name + " is currently " + r.status,
      ) +
      panel(
        form(
          "correction",
          select(
            "Correct status",
            "desired",
            [
              ["Expected", "Expected"],
              ["Absent", "Absent"],
              ["Present", "Present"],
            ],
            "Present",
          ) +
            area("What happened and what should change?", "note") +
            notice(
              "To enter past arrival and release times, use Enter paper attendance. Corrections require manager review.",
            ) +
            submit("Request correction"),
          id,
        ),
      )
    );
  if (kind === "paper")
    return (
      heading(
        "Reconcile a paper handoff.",
        "Actual times are separate from the later recorded time shown in history.",
      ) +
      panel(
        form(
          "paper",
          select(
            "Student",
            "studentId",
            currentRows().map((r) => [r.studentId, rowName(r)]),
            id,
          ) +
            field("Actual arrival (Chicago time)", "arrival", "15:32", "time") +
            field(
              "Actual departure (Chicago time)",
              "departure",
              "16:15",
              "time",
            ) +
            field("Pickup adult exactly as recorded", "adult") +
            select("Verification recorded on paper", "verification", [
              ["Known to staff", "Known to staff"],
              ["Photo ID checked", "Photo ID checked"],
            ]) +
            check("Paper has a payment confirmation", "paid") +
            field(
              "Original payment confirmation time (if known)",
              "paymentTime",
              "",
              "time",
              false,
            ) +
            area("Paper authorization / staff note", "note") +
            notice(
              "A conflicting digital record goes to the manager. This past entry never grants permission for a new pickup.",
            ) +
            submit("Reconcile paper record"),
        ),
      )
    );
  if (kind === "incident")
    return (
      heading(
        "Record a class incident.",
        "Add a fictional practice report for manager review.",
      ) +
      panel(
        form(
          "incident",
          select(
            "Student",
            "studentId",
            currentRows().map((r) => [r.studentId, rowName(r)]),
          ) +
            area("What happened?", "note") +
            area("Immediate action taken", "actionTaken") +
            submit("Send incident to manager"),
        ),
      )
    );
  if (kind === "revoke") {
    const adult = state.adults.find((a) => a.id === id)!;
    return (
      heading("Revoke pickup permission.", adult.name) +
      panel(
        form(
          "revoke",
          notice(
            "This removes permission for future releases. Past release details remain in history.",
          ) +
            area("Reason", "reason") +
            submit("Revoke permission"),
          id,
        ),
      )
    );
  }
  if (kind === "upload")
    return (
      heading(
        "Add sample artwork.",
        "This uses a built-in fictional illustration; do not upload real children's photos.",
      ) +
      panel(
        form(
          "upload",
          field("Sample title", "title", "Color & collage: our class artwork") +
            "<fieldset><legend>Students represented (leave blank for artwork only)</legend>" +
            currentRows()
              .map(
                (r) =>
                  '<label class="sd-check"><input type="checkbox" name="studentIds" value="' +
                  r.studentId +
                  '"><span>' +
                  h(rowName(r)) +
                  "</span></label>",
              )
              .join("") +
            "</fieldset>" +
            submit("Add private sample"),
        ),
      )
    );
  if (kind === "photo-review") {
    const p = state.photos.find((p) => p.id === id)!;
    const restricted = p.studentIds.filter(
      (id) => !student(state, id).publicPhoto,
    );
    return (
      heading("Review public permission.", p.title) +
      panel(
        '<div class="sd-art" role="img" aria-label="Fictional artwork illustration"></div>' +
          (restricted.length
            ? notice(
                "Keep private: no public photo permission for " +
                  restricted.map((id) => student(state, id).name).join(", ") +
                  ".",
              )
            : notice(
                "This fictional sample has the required public permission, or represents artwork only.",
              )) +
          form(
            "photo-review",
            '<button type="submit" class="sd-btn sd-primary"' +
              (restricted.length ? " disabled" : "") +
              ">Approve for public simulation</button>",
            id,
          ) +
          button("Keep private and return", "growth"),
      )
    );
  }
  if (["reply", "recap", "public-post"].includes(kind)) {
    const c = counts(session()),
      isReply = kind === "reply",
      publicPost = kind === "public-post";
    const body = isReply
      ? "Hi Alex! We provide aprons for Noah. Please send a water bottle. See you at 3:30!"
      : publicPost
        ? "Color, texture and lots of imagination! Our artists explored paper collage this week. Ask us about the next session."
        : "Today our artists explored color and collage. " +
          c.Released +
          " students completed pickup and " +
          c.Absent +
          " were marked absent. Thank you for a creative afternoon! We look forward to seeing you next class.";
    return (
      heading(
        isReply
          ? "Reply to Alex."
          : publicPost
            ? "Prepare a public post."
            : "Prepare the family recap.",
        "Review the message, then record a simulated send. No external service is contacted.",
      ) +
      panel(
        form(
          "message",
          field(
            "Subject",
            "subject",
            isReply
              ? "Re: Apron for Noah"
              : publicPost
                ? "This week at art class"
                : "Today's color & collage class",
          ) +
            field(
              "Recipient",
              "recipient",
              isReply
                ? "Alex Thompson · fictional parent"
                : publicPost
                  ? "Studio social feed · simulation"
                  : "This class's fictional families",
            ) +
            area("Message", "body", body) +
            (publicPost
              ? notice(
                  "Only manager-approved artwork samples are eligible. No real public post will be created.",
                )
              : "") +
            submit("Record simulated send"),
          kind,
        ),
      )
    );
  }
  if (kind === "processor") {
    const rows = currentRows().filter((r) => !r.payment.confirmed);
    return (
      heading(
        "Simulate a Square payment.",
        "Practice matching a fictional payment to one student and dated session.",
      ) +
      panel(
        rows.length
          ? form(
              "processor",
              select(
                "Student / session",
                "studentId",
                rows.map((r) => [
                  r.studentId,
                  rowName(r) + " · " + session().date,
                ]),
              ) +
                field("Fictional amount", "amount", "30", "number") +
                notice(
                  "No Square connection, charge or payment request is created.",
                ) +
                submit("Record simulated payment"),
            )
          : "<p>Every student already has a confirmation. View Money to review details.</p>",
      )
    );
  }
  if (kind === "expense")
    return (
      heading(
        "Add a sample expense.",
        "A practice record for the manager's books; no purchase occurs.",
      ) +
      panel(
        form(
          "expense",
          field("Fictional supplier", "supplier", "Neighborhood Art Supply") +
            field("Amount", "amount", "18.50", "number") +
            select("Category", "category", [
              ["Class materials", "Class materials"],
              ["Supplies", "Supplies"],
              ["Owner review", "Owner review"],
            ]) +
            submit("Record expense"),
        ),
      )
    );
  if (kind === "copy") {
    const next = new Date(session().date + "T12:00:00Z");
    next.setUTCDate(next.getUTCDate() + 7);
    return (
      heading(
        "Create the next class.",
        "Copy enrollment only. Attendance starts Expected and every Paid box starts unchecked.",
      ) +
      panel(
        form(
          "copy",
          field("Class name", "name", session().name) +
            field(
              "New session date",
              "date",
              next.toISOString().slice(0, 10),
              "date",
            ) +
            submit("Create next session"),
        ),
      )
    );
  }
  if (kind === "reopen")
    return (
      heading(
        "Reopen this class.",
        "History stays intact. Reconciliation and sign-off must be completed again.",
      ) +
      panel(
        form(
          "reopen",
          area("Reason to reopen", "reason") + submit("Reopen class"),
        ),
      )
    );
  if (kind === "reset")
    return (
      heading(
        "Start a fresh practice run?",
        "This clears only this tab's fictional simulation, including all practice classes.",
      ) +
      panel(
        button("Reset fictional practice", "reset-confirm", "", true) +
          button("Keep this practice run", "back"),
      )
    );
  return (
    heading("This practice page is unavailable.") +
    button("Return to today", "today")
  );
}
function studioHtml() {
  return (
    heading(
      "Studio settings & connections.",
      "Training mode keeps every integration fictional.",
    ) +
    panel(
      "<h3>This simulation</h3><p>Business: Art Class Check-In<br>Timezone: America/Chicago<br>Staff: Riley Park<br>Manager: Morgan Ellis</p><p>Switch roles to practice approvals. The switch is a training tool, not live authentication. Reloading keeps this tab's practice; other tabs and devices have separate runs.</p>" +
        '<div class="sd-gap">' +
        button("View history", "history") +
        button("Download audit CSV", "export-audit") +
        button("Reset practice", "reset") +
        "</div>",
    ) +
    panel(
      "<h3>Integration practice</h3><p>Square: fictional matched payment<br>Email: sample outbox<br>Social: sample public-post approval<br>Storage: built-in artwork illustration<br>Bookkeeping: sample expenses and CSV reports</p><p>No accounts are connected here. Real integrations, registration, reminders, blogging and tax preparation remain future work.</p>",
    ) +
    panel(
      "<h3>Separate check-in proof of concept</h3><p>The check-in PWA has its own demo sign-in and cloud records. This studio simulation does not change them.</p><a class='sd-btn sd-quiet' href='/'>Open check-in POC</a>",
    )
  );
}
function render() {
  $("#sd-error").hidden = true;
  $("#sd-manager-nav").hidden = role !== "manager";
  $("#sd-manager-extra").hidden = role !== "manager";
  $("#sd-staff-nav").hidden = role !== "staff";
  root
    .querySelectorAll<HTMLButtonElement>("[data-role]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.role === role)),
    );
  root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => {
    b.classList.toggle("sd-active", b.dataset.view === view && !detail);
    if (b.dataset.view === view && !detail)
      b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#sd-actor").textContent = role === "staff" ? "Riley Park" : "Morgan Ellis";
  $("#sd-role-label").textContent =
    role === "staff" ? "Class staff" : "Studio manager";
  $("#sd-review-count").textContent = String(pending(state).length);
  $("#sd-clock").textContent =
    safeDate(session().date) +
    " · " +
    timeLabel(stamp(session())) +
    " Chicago · practice clock";
  const pages: Record<string, () => string> = {
    today,
    roster: rosterHtml,
    schedule: scheduleHtml,
    families: familiesHtml,
    money: moneyHtml,
    growth: growthHtml,
    reviews: reviewsHtml,
    messages: messagesHtml,
    tasks: tasksHtml,
    history: () => historyHtml(),
    summary: summaryHtml,
    studio: studioHtml,
  };
  $("#sd-content").innerHTML = detail
    ? (detail.kind !== "print"
        ? '<div class="sd-tools">' + button("Back", "back") + "</div>"
        : "") + detailHtml(detail.kind, detail.id)
    : (pages[view] || today)();
  root
    .querySelectorAll<HTMLInputElement>('input[type="number"]')
    .forEach((input) => {
      input.step = "0.01";
      input.min = "0";
    });
  root.classList.toggle("sd-printing", detail?.kind === "print");
}
export function csvCell(value: unknown) {
  let text =
    typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value ?? "");
  if (/^[=+\-@\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function download(kind: string) {
  const s = session();
  let headers: string[], rows: unknown[][];
  if (kind === "audit") {
    headers = [
      "Session ID",
      "Class",
      "Date",
      "Timezone",
      "Event",
      "Student",
      "Actual time UTC",
      "Recorded time UTC",
      "Actor",
      "Reason",
      "Previous",
      "New",
    ];
    rows = state.audit
      .filter((e) => e.sessionId === s.id)
      .map((e) => [
        s.id,
        s.name,
        s.date,
        "America/Chicago",
        e.kind,
        e.studentId ? student(state, e.studentId).name : "",
        e.actualAt,
        e.recordedAt,
        e.actor,
        e.reason,
        e.before,
        e.after,
      ]);
  } else {
    headers = [
      "Session ID",
      "Class",
      "Date",
      "Timezone",
      "Student ID",
      "Student",
      "Attendance",
      "Arrival UTC",
      "Departure UTC",
      "Pickup adult",
      "Verification",
      "Arrival staff",
      "Release staff",
      "Attendance source",
      "Paid",
      "Method",
      "Amount USD",
      "Payment actual UTC",
      "Payment recorded UTC",
      "Payment staff",
      "Payment source",
      "Payment note",
    ];
    rows = s.roster.map((r) => [
      s.id,
      s.name,
      s.date,
      "America/Chicago",
      r.studentId,
      rowName(r),
      r.status,
      r.arrival,
      r.departure,
      r.adult,
      r.verification,
      r.arrivalActor,
      r.releaseActor,
      r.source,
      r.payment.confirmed ? "Paid" : "Not confirmed",
      r.payment.method,
      r.payment.amount,
      r.payment.actualAt,
      r.payment.recordedAt,
      r.payment.actor,
      r.payment.source,
      r.payment.note,
    ]);
  }
  const data =
    [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n";
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + data], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "fictional-" + kind + "-" + s.date + ".csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  announce("Fictional " + kind + " CSV prepared for download.");
}
function navigate(destination: string) {
  if (role === "staff" && ["money", "growth", "studio"].includes(destination))
    return fail(new Error("Switch to Manage studio for this page."));
  view = destination;
  detail = null;
  render();
  window.scrollTo({ top: 0 });
}
root.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button",
  );
  if (!target || target.disabled) return;
  if (target.dataset.role) {
    changeRole(target.dataset.role as Role);
    return;
  }
  if (target.dataset.view) {
    navigate(target.dataset.view);
    return;
  }
  const action = target.dataset.action,
    id = target.dataset.id || "";
  if (!action) return;
  if (action === "back") {
    detail = null;
    view = returnView;
    render();
    return;
  }
  if (action === "staff") {
    changeRole("staff");
    return;
  }
  if (action === "checkin" || action === "absent") {
    perform(
      { type: action === "checkin" ? "CHECK_IN" : "ABSENT", studentId: id },
      "roster",
      student(state, id).name +
        (action === "checkin" ? " is Present." : " is marked Absent."),
    );
    return;
  }
  if (action === "phase") {
    perform(
      { type: "PHASE", phase: id as "Arrivals" | "Teaching" | "Pickup" },
      "roster",
      "Class moved to " + id + ".",
    );
    return;
  }
  if (action === "restock" || action === "restocked") {
    perform(
      { type: "TASK", key: "restock", done: action === "restock" },
      view,
      action === "restock"
        ? "Manager can see the glue-stick restock request."
        : "Supply request marked restocked.",
    );
    return;
  }
  if (action === "select-session") {
    filter = "All";
    search = "";
    perform(
      { type: "SELECT_SESSION", sessionId: id },
      "today",
      "Selected dated class.",
    );
    return;
  }
  if (action === "print-now") {
    window.print();
    return;
  }
  if (action.startsWith("export-")) {
    download(action.slice(7));
    return;
  }
  if (action === "reset-confirm") {
    state = createState();
    filter = "All";
    search = "";
    save();
    navigate("today");
    announce(
      "Started a new fictional practice. The check-in POC was not changed.",
    );
    return;
  }
  if (
    [
      "today",
      "roster",
      "tasks",
      "reviews",
      "history",
      "summary",
      "growth",
      "messages",
    ].includes(action)
  ) {
    navigate(action);
    return;
  }
  open(action, id);
});
root.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.dataset.task) {
    perform({ type: "TASK", key: input.dataset.task, done: input.checked });
    return;
  }
  if (input.dataset.paid) {
    const id = input.dataset.paid,
      p = rowFor(state, id)!.payment;
    if (!input.checked) {
      open("payment", id);
      (
        $(
          'form[data-form="payment"] input[name="confirmed"]',
        ) as HTMLInputElement
      ).checked = false;
      return;
    }
    perform(
      {
        type: "PAYMENT",
        studentId: id,
        confirmed: true,
        method: "",
        amount: null,
        note: "",
        reason: "",
        expectedVersion: Number(input.dataset.version),
      },
      "roster",
      "Payment confirmed for " + student(state, id).name + ".",
    );
    return;
  }
  if (input.name === "filter") {
    filter = input.value;
    render();
  }
});
root.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === "search") {
    search = input.value;
    const position = input.selectionStart;
    render();
    const next = $<HTMLInputElement>('input[name="search"]');
    next.focus();
    next.setSelectionRange(position, position);
  }
});
root.addEventListener("submit", (event) => {
  event.preventDefault();
  const element = event.target as HTMLFormElement,
    data = new FormData(element),
    id = element.dataset.id || "";
  const value = (key: string) => String(data.get(key) || "");
  const checked = (key: string) => data.has(key);
  const ids = () => data.getAll("studentIds").map(String);
  const kind = element.dataset.form;
  if (kind === "pickup")
    perform(
      {
        type: "RELEASE",
        studentId: id,
        adultId: value("adultId"),
        verification: value("verification"),
        expectedVersion: Number(element.dataset.version),
      },
      "roster",
      student(state, id).name +
        " released. A sibling requires a separate confirmation.",
    );
  else if (kind === "payment")
    perform(
      {
        type: "PAYMENT",
        studentId: id,
        confirmed: checked("confirmed"),
        method: value("method"),
        amount: value("amount") === "" ? null : Number(value("amount")),
        note: value("note"),
        reason: value("reason"),
        expectedVersion: Number(element.dataset.version),
      },
      returnView,
      "Payment record saved with audit history.",
    );
  else if (kind === "request-pickup")
    perform(
      {
        type: "REQUEST_PICKUP",
        studentIds: ids(),
        adultName: value("adultName"),
        relationship: value("relationship"),
        note: value("note"),
      },
      "reviews",
      "Pickup request sent to the manager. Permission has not changed yet.",
    );
  else if (kind === "correction")
    perform(
      {
        type: "REQUEST_CORRECTION",
        studentId: id,
        desired: value("desired") as "Expected" | "Absent" | "Present",
        note: value("note"),
      },
      "reviews",
      "Correction requested. Original attendance stays in place until review.",
    );
  else if (kind === "paper")
    perform(
      {
        type: "PAPER",
        paper: {
          studentId: value("studentId"),
          arrival: value("arrival"),
          departure: value("departure"),
          adult: value("adult"),
          verification: value("verification"),
          paid: checked("paid"),
          paymentTime: value("paymentTime"),
          note: value("note"),
        },
      },
      "history",
      "Paper reconciled or flagged for manager review. Check the history and review queue.",
    );
  else if (kind === "incident")
    perform(
      {
        type: "INCIDENT",
        studentId: value("studentId"),
        note: value("note"),
        actionTaken: value("actionTaken"),
      },
      "reviews",
      "Incident recorded for manager review.",
    );
  else if (kind === "review")
    perform(
      {
        type: "RESOLVE",
        reviewId: id,
        approve:
          (event as SubmitEvent).submitter?.getAttribute("value") === "approve",
        reason: value("reason"),
        parentVerified: checked("parentVerified"),
      },
      "reviews",
      "Manager decision saved. The roster and approved adults are current.",
    );
  else if (kind === "revoke")
    perform(
      { type: "REVOKE", adultId: id, reason: value("reason") },
      "families",
      "Pickup permission revoked. Past releases remain in history.",
    );
  else if (kind === "upload")
    perform(
      { type: "PHOTO", title: value("title"), studentIds: ids() },
      role === "manager" ? "growth" : "tasks",
      "Fictional artwork added privately.",
    );
  else if (kind === "photo-review")
    perform(
      { type: "APPROVE_PHOTO", photoId: id },
      "growth",
      "Sample approved for public-post simulation.",
    );
  else if (kind === "message")
    perform(
      {
        type: "MESSAGE",
        subject: value("subject"),
        body: value("body"),
        recipient: value("recipient"),
        channel:
          id === "reply"
            ? "Email reply"
            : id === "recap"
              ? "Family recap"
              : "Public post",
        key: id,
      },
      "messages",
      "Simulated send recorded in the outbox. No message was sent.",
    );
  else if (kind === "processor") {
    const r = rowFor(state, value("studentId"))!;
    perform(
      {
        type: "PAYMENT",
        studentId: r.studentId,
        confirmed: true,
        method: "Square",
        amount: Number(value("amount")),
        note: "Fictional processor-match exercise",
        reason: "",
        expectedVersion: r.payment.version,
        source: "Processor simulation",
      },
      "money",
      "Fictional payment matched to this dated session.",
    );
  } else if (kind === "expense")
    perform(
      {
        type: "EXPENSE",
        supplier: value("supplier"),
        amount: Number(value("amount")),
        category: value("category"),
      },
      "money",
      "Sample expense recorded.",
    );
  else if (kind === "finish")
    perform(
      { type: "SUBMIT", note: value("note") },
      "summary",
      "Class submitted. Switch to Manage studio for sign-off.",
    );
  else if (kind === "close")
    perform(
      { type: "CLOSE", note: value("note") },
      "summary",
      "Class closed. Its history and exports remain available.",
    );
  else if (kind === "reopen")
    perform(
      { type: "REOPEN", reason: value("reason") },
      "roster",
      "Class reopened with an audit record.",
    );
  else if (kind === "copy") {
    filter = "All";
    search = "";
    perform(
      { type: "COPY_SESSION", name: value("name"), date: value("date") },
      "today",
      "Next session created. Every Paid box starts unchecked.",
    );
  }
});
save();
render();
announce("Choose Run class to start, or continue this tab's practice.");
