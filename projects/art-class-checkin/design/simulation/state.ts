import { resolveLocal } from "../../src/time";

export type Role = "staff" | "manager";
export type Attendance = "Expected" | "Present" | "Released" | "Absent";
export type Phase =
  "Preparing" | "Arrivals" | "Teaching" | "Pickup" | "Submitted" | "Closed";
export type Payment = {
  confirmed: boolean;
  method: string;
  amount: number | null;
  note: string;
  actualAt: string | null;
  recordedAt: string | null;
  actor: string;
  source: string;
  version: number;
};
export type Row = {
  studentId: string;
  status: Attendance;
  arrival: string | null;
  departure: string | null;
  adult: string;
  verification: string;
  source: string;
  arrivalActor: string;
  releaseActor: string;
  version: number;
  payment: Payment;
};
export type Student = {
  id: string;
  name: string;
  parent: string;
  phone: string;
  family: string;
  safety: string;
  publicPhoto: boolean;
};
export type Adult = {
  id: string;
  name: string;
  relationship: string;
  studentIds: string[];
  sessionId?: string;
  revoked: boolean;
};
export type Audit = {
  id: string;
  sessionId: string;
  kind: string;
  studentId?: string;
  actor: string;
  recordedAt: string;
  actualAt: string;
  reason: string;
  before: unknown;
  after: unknown;
};
export type Paper = {
  studentId: string;
  arrival: string;
  departure: string;
  adult: string;
  verification: string;
  paid: boolean;
  paymentTime: string;
  note: string;
};
export type Review = {
  id: string;
  sessionId: string;
  kind: "pickup" | "paper" | "correction" | "incident";
  status: "Pending" | "Approved" | "Declined";
  summary: string;
  createdBy: string;
  createdAt: string;
  note: string;
  studentIds: string[];
  adultName?: string;
  relationship?: string;
  paper?: Paper;
  desired?: "Expected" | "Absent" | "Present";
  expectedVersion?: number;
  resolution?: string;
};
export type Session = {
  id: string;
  name: string;
  date: string;
  room: string;
  instructor: string;
  phase: Phase;
  clock: number;
  roster: Row[];
  tasks: Record<string, boolean>;
  closeNote: string;
  closedAt: string | null;
};
export type Photo = {
  id: string;
  sessionId: string;
  title: string;
  studentIds: string[];
  publicApproved: boolean;
  reviewed: boolean;
  actor: string;
};
export type Message = {
  id: string;
  sessionId: string;
  subject: string;
  body: string;
  recipient: string;
  actor: string;
  at: string;
  channel: string;
};
export type State = {
  schema: 3;
  revision: number;
  sequence: number;
  activeSessionId: string;
  students: Student[];
  adults: Adult[];
  sessions: Session[];
  reviews: Review[];
  audit: Audit[];
  photos: Photo[];
  messages: Message[];
  expenses: {
    id: string;
    sessionId: string;
    supplier: string;
    amount: number;
    category: string;
  }[];
  sentKeys: string[];
  operations: string[];
};
export type Action =
  | { type: "TASK"; key: string; done: boolean }
  | { type: "PHASE"; phase: "Arrivals" | "Teaching" | "Pickup" }
  | { type: "CHECK_IN" | "ABSENT"; studentId: string; reason?: string }
  | {
      type: "RELEASE";
      studentId: string;
      adultId: string;
      verification: string;
      expectedVersion: number;
    }
  | {
      type: "PAYMENT";
      studentId: string;
      confirmed: boolean;
      method: string;
      amount: number | null;
      note: string;
      reason: string;
      expectedVersion: number;
      source?: string;
    }
  | {
      type: "REQUEST_PICKUP";
      studentIds: string[];
      adultName: string;
      relationship: string;
      note: string;
    }
  | {
      type: "REQUEST_CORRECTION";
      studentId: string;
      desired: "Expected" | "Absent" | "Present";
      note: string;
    }
  | { type: "PAPER"; paper: Paper }
  | { type: "INCIDENT"; studentId: string; note: string; actionTaken: string }
  | {
      type: "RESOLVE";
      reviewId: string;
      approve: boolean;
      reason: string;
      parentVerified?: boolean;
    }
  | { type: "REVOKE"; adultId: string; reason: string }
  | { type: "PHOTO"; studentIds: string[]; title: string }
  | { type: "APPROVE_PHOTO"; photoId: string }
  | {
      type: "MESSAGE";
      subject: string;
      body: string;
      recipient: string;
      channel: string;
      key: string;
    }
  | { type: "EXPENSE"; supplier: string; amount: number; category: string }
  | { type: "SUBMIT"; note: string }
  | { type: "CLOSE"; note: string }
  | { type: "REOPEN"; reason: string }
  | { type: "COPY_SESSION"; date: string; name: string }
  | { type: "SELECT_SESSION"; sessionId: string };

export const actorName = (role: Role) =>
  role === "manager" ? "Morgan Ellis (manager)" : "Riley Park (staff)";
export const active = (state: State) =>
  state.sessions.find((s) => s.id === state.activeSessionId)!;
export const student = (state: State, id: string) =>
  state.students.find((s) => s.id === id)!;
export const rowFor = (state: State, id: string) =>
  active(state).roster.find((r) => r.studentId === id);
const stamps = new Map<string, string>();
export const stamp = (session: Session, minutes = session.clock) => {
  const local =
    session.date +
    "T" +
    String(Math.floor(minutes / 60)).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0");
  if (!stamps.has(local))
    stamps.set(local, resolveLocal(local, "America/Chicago")!);
  return stamps.get(local)!;
};
export const timeLabel = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";
export const isoTime = (session: Session, value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value))
    throw new Error("Enter an actual time in hours and minutes.");
  const [hour, minute] = value.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new Error("Enter a valid time.");
  return stamp(session, hour * 60 + minute);
};
export const approvedAdults = (state: State, studentId: string) =>
  state.adults.filter(
    (a) =>
      !a.revoked &&
      a.studentIds.includes(studentId) &&
      (!a.sessionId || a.sessionId === active(state).id),
  );
export const pending = (state: State) =>
  state.reviews.filter(
    (r) => r.sessionId === active(state).id && r.status === "Pending",
  );
export const counts = (session: Session) =>
  Object.fromEntries(
    ["Expected", "Present", "Released", "Absent"].map((status) => [
      status,
      session.roster.filter((r) => r.status === status).length,
    ]),
  ) as Record<Attendance, number>;
const emptyPayment = (): Payment => ({
  confirmed: false,
  method: "",
  amount: null,
  note: "",
  actualAt: null,
  recordedAt: null,
  actor: "",
  source: "",
  version: 0,
});
const blankRow = (studentId: string): Row => ({
  studentId,
  status: "Expected",
  arrival: null,
  departure: null,
  adult: "",
  verification: "",
  source: "",
  arrivalActor: "",
  releaseActor: "",
  version: 0,
  payment: emptyPayment(),
});

export function createState(): State {
  const names = [
    "Amelia Brooks",
    "Noah Thompson",
    "Aria Martinez",
    "Ezra Brooks",
    "Lily Chen",
    "Owen Patel",
    "Sofia Rivera",
    "Liam Garcia",
    "Isabella-Rose Montgomery-Wellington",
    "Mason Lee",
    "Charlotte Davis",
    "Elijah Wilson",
    "Harper Nguyen",
    "Henry Robinson",
    "Evelyn Scott",
    "Lucas Adams",
  ];
  const students = names.map((name, i) => ({
    id: "student-" + i,
    name,
    family: name.split(" ").slice(1).join(" "),
    parent:
      (i === 0 || i === 3 ? "Jordan" : i === 1 ? "Alex" : "Casey") +
      " " +
      name.split(" ").slice(1).join(" "),
    phone: "(312) 555-" + String(100 + (i === 3 ? 0 : i)).padStart(4, "0"),
    safety: i === 6 ? "Fictional note: use latex-free gloves." : "",
    publicPhoto: i !== 0 && i !== 3,
  }));
  const adults: Adult[] = [];
  for (const child of students) {
    if (adults.some((a) => a.studentIds.includes(child.id))) continue;
    const ids = students
      .filter((s) => s.family === child.family)
      .map((s) => s.id);
    adults.push({
      id: "adult-" + adults.length,
      name: child.parent,
      relationship: "Parent",
      studentIds: ids,
      revoked: false,
    });
    adults.push({
      id: "adult-" + adults.length,
      name: "Taylor " + child.family,
      relationship: "Grandparent",
      studentIds: ids,
      revoked: false,
    });
  }
  const session: Session = {
    id: "session-1",
    name: "After-School Art Studio",
    date: "2026-09-08",
    room: "Room 1",
    instructor: "Morgan + Riley",
    phase: "Preparing",
    clock: 15 * 60 + 15,
    roster: students.map((s) => blankRow(s.id)),
    tasks: {},
    closeNote: "",
    closedAt: null,
  };
  session.roster.forEach((r, i) => {
    if (i % 2 === 0 || i === 3)
      r.payment = {
        confirmed: true,
        method: "Square",
        amount: 30,
        note: "Seeded fictional confirmation",
        actualAt: stamp(session, 14 * 60),
        recordedAt: stamp(session, 14 * 60),
        actor: "Morgan Ellis (manager)",
        source: "Manual",
        version: 1,
      };
  });
  return {
    schema: 3,
    revision: 0,
    sequence: 0,
    activeSessionId: session.id,
    students,
    adults,
    sessions: [session],
    reviews: [],
    audit: [],
    photos: [],
    messages: [],
    expenses: [],
    sentKeys: [],
    operations: [],
  };
}

export function closingIssues(state: State, manager = false) {
  const s = active(state),
    c = counts(s),
    issues: string[] = [];
  if (c.Present)
    issues.push(
      c.Present + " children are still Present. Record each physical release.",
    );
  if (c.Expected)
    issues.push(
      c.Expected +
        " students are still Expected. Check their records or mark them Absent.",
    );
  if (!s.tasks.clean) issues.push("Confirm the room has been cleaned.");
  if (!s.tasks.reconcile)
    issues.push("Confirm paper attendance has been reconciled.");
  if (!s.tasks.supplies)
    issues.push("Check supplies and record any restock needs.");
  const unresolved = pending(state);
  if (unresolved.length)
    issues.push(unresolved.length + " manager review item(s) are unresolved.");
  if (manager && s.phase !== "Submitted")
    issues.push("Staff must submit the class for review first.");
  return issues;
}

export function transition(
  original: State,
  action: Action,
  role: Role,
  operationId?: string,
): State {
  if (!["staff", "manager"].includes(role))
    throw new Error("Choose a simulation role.");
  const managerActions = [
    "RESOLVE",
    "REVOKE",
    "APPROVE_PHOTO",
    "CLOSE",
    "REOPEN",
    "COPY_SESSION",
  ];
  if (managerActions.includes(action.type) && role !== "manager")
    throw new Error("Switch to the manager to make this decision.");
  if (
    action.type === "PAYMENT" &&
    action.source &&
    action.source !== "Manual" &&
    role !== "manager"
  )
    throw new Error("Only the manager can simulate a processor event.");
  if (action.type === "EXPENSE" && role !== "manager")
    throw new Error("Switch to the manager to record an expense.");
  if (
    action.type === "MESSAGE" &&
    action.channel !== "Email reply" &&
    role !== "manager"
  )
    throw new Error("The manager approves class updates and marketing.");
  if (operationId && original.operations.includes(operationId)) return original;
  const state = structuredClone(original),
    s = active(state),
    actor = actorName(role),
    now = stamp(s);
  const requireText = (value: string, message: string) => {
    if (!value.trim()) throw new Error(message);
  };
  const row = (id: string) => {
    const found = s.roster.find((r) => r.studentId === id);
    if (!found)
      throw new Error("This student is not enrolled in the selected session.");
    return found;
  };
  const editable = () => {
    if (s.phase === "Submitted" || s.phase === "Closed")
      throw new Error(
        "The class is submitted or closed. The manager must reopen it before changing attendance.",
      );
  };
  const id = (prefix: string) => "sim-" + prefix + "-" + ++state.sequence;
  const audit = (
    kind: string,
    before: unknown,
    after: unknown,
    reason = "",
    studentId?: string,
    actualAt = now,
  ) => {
    state.audit.push({
      id: id("event"),
      sessionId: s.id,
      kind,
      studentId,
      actor,
      recordedAt: now,
      actualAt,
      reason,
      before: structuredClone(before),
      after: structuredClone(after),
    });
  };
  const review = (
    item: Omit<
      Review,
      "id" | "sessionId" | "status" | "createdBy" | "createdAt"
    >,
  ) => {
    state.reviews.push({
      ...item,
      id: id("review"),
      sessionId: s.id,
      status: "Pending",
      createdBy: actor,
      createdAt: now,
    });
    audit("Staff " + item.kind + " request", null, state.reviews.at(-1));
  };
  const applyPaper = (
    r: Row,
    paper: Paper,
    reason: string,
    enteringActor: string,
    attendance = true,
  ) => {
    if (attendance) {
      const before = structuredClone(r);
      r.arrival = isoTime(s, paper.arrival);
      r.departure = isoTime(s, paper.departure);
      r.status = "Released";
      r.adult = paper.adult.trim();
      r.verification = paper.verification;
      r.source = "Paper";
      r.arrivalActor = enteringActor;
      r.releaseActor = enteringActor;
      r.version++;
      audit("Paper attendance", before, r, reason, r.studentId, r.departure);
    }
    if (paper.paid && !r.payment.confirmed) {
      const old = structuredClone(r.payment);
      r.payment = {
        confirmed: true,
        method: "Other",
        amount: null,
        note: paper.note,
        actualAt: paper.paymentTime ? isoTime(s, paper.paymentTime) : null,
        recordedAt: now,
        actor: enteringActor,
        source: "Paper",
        version: old.version + 1,
      };
      audit(
        "Paper payment confirmation",
        old,
        r.payment,
        reason,
        r.studentId,
        r.payment.actualAt || now,
      );
    }
  };

  switch (action.type) {
    case "SELECT_SESSION":
      if (!state.sessions.some((x) => x.id === action.sessionId))
        throw new Error("Session not found.");
      state.activeSessionId = action.sessionId;
      break;
    case "TASK": {
      editable();
      if (
        ![
          "kits",
          "safety",
          "backup",
          "clean",
          "reconcile",
          "supplies",
          "restock",
        ].includes(action.key)
      )
        throw new Error("Unknown class task.");
      const old = Boolean(s.tasks[action.key]);
      s.tasks[action.key] = action.done;
      audit("Task " + action.key, old, action.done);
      break;
    }
    case "PHASE": {
      editable();
      const previous = s.phase;
      if (action.phase === "Arrivals") {
        if (s.phase !== "Preparing")
          throw new Error("Arrivals have already started.");
        if (!s.tasks.kits || !s.tasks.safety || !s.tasks.backup)
          throw new Error(
            "Complete the three preparation checks before opening arrivals.",
          );
        s.clock = Math.max(s.clock, 15 * 60 + 25);
      } else if (action.phase === "Teaching") {
        if (s.phase !== "Arrivals")
          throw new Error("Open arrivals before beginning the lesson.");
        s.clock = Math.max(s.clock, 15 * 60 + 35);
      } else {
        if (!["Arrivals", "Teaching"].includes(s.phase))
          throw new Error("Open the class before starting pickup.");
        s.clock = Math.max(s.clock, 16 * 60 + 25);
      }
      s.phase = action.phase;
      audit("Class phase", previous, s.phase);
      break;
    }
    case "CHECK_IN": {
      editable();
      if (s.phase === "Preparing")
        throw new Error("Complete preparation and open arrivals first.");
      const r = row(action.studentId);
      if (r.status !== "Expected")
        throw new Error(
          "Only an Expected child can be checked in. Ask the manager to correct a mistake.",
        );
      const old = structuredClone(r);
      r.status = "Present";
      r.arrival = now;
      r.arrivalActor = actor;
      r.source = "Digital";
      r.version++;
      audit("Check-in", old, r, "", r.studentId);
      break;
    }
    case "ABSENT": {
      editable();
      const r = row(action.studentId);
      if (r.status !== "Expected")
        throw new Error("Only an Expected student can be marked Absent.");
      const old = structuredClone(r);
      r.status = "Absent";
      r.version++;
      audit(
        "Marked absent",
        old,
        r,
        action.reason || "Did not attend this session",
        r.studentId,
      );
      break;
    }
    case "RELEASE": {
      editable();
      const r = row(action.studentId);
      if (r.status !== "Present")
        throw new Error(
          "This child is not Present. A second release is not allowed.",
        );
      if (r.version !== action.expectedVersion)
        throw new Error(
          "Attendance changed. Reopen pickup and review the current record.",
        );
      const adult = approvedAdults(state, r.studentId).find(
        (a) => a.id === action.adultId,
      );
      if (!adult)
        throw new Error(
          "Pickup permission is no longer approved. Keep the child Present and ask the manager.",
        );
      if (!["Known to staff", "Photo ID checked"].includes(action.verification))
        throw new Error("Choose a verification method.");
      const old = structuredClone(r);
      r.status = "Released";
      r.departure = now;
      r.adult = adult.name + " · " + adult.relationship;
      r.verification = action.verification;
      r.releaseActor = actor;
      r.version++;
      audit("Release", old, r, "", r.studentId);
      break;
    }
    case "PAYMENT": {
      const r = row(action.studentId),
        old = structuredClone(r.payment);
      if (old.version !== action.expectedVersion)
        throw new Error(
          "Payment changed since this form opened. Reopen its details before editing.",
        );
      if (old.confirmed)
        requireText(
          action.reason,
          "Give a reason to clear or correct a payment confirmation.",
        );
      if (
        action.amount !== null &&
        (!Number.isFinite(action.amount) || action.amount < 0)
      )
        throw new Error("Enter a nonnegative amount.");
      r.payment = {
        confirmed: action.confirmed,
        method: action.method,
        amount: action.amount,
        note: action.note,
        actualAt: action.confirmed ? now : null,
        recordedAt: now,
        actor,
        source: action.source || "Manual",
        version: old.version + 1,
      };
      audit("Payment confirmation", old, r.payment, action.reason, r.studentId);
      break;
    }
    case "REQUEST_PICKUP":
      editable();
      requireText(action.adultName, "Enter the proposed adult's name.");
      requireText(action.note, "Describe the request.");
      if (!action.studentIds.length)
        throw new Error("Select at least one child.");
      action.studentIds.forEach(row);
      review({
        kind: "pickup",
        studentIds: [...new Set(action.studentIds)],
        adultName: action.adultName.trim(),
        relationship: action.relationship.trim() || "Pickup adult",
        summary: "Verify pickup: " + action.adultName.trim(),
        note: action.note,
      });
      break;
    case "REQUEST_CORRECTION": {
      editable();
      requireText(action.note, "Describe the mistake for the manager.");
      const r = row(action.studentId);
      review({
        kind: "correction",
        studentIds: [r.studentId],
        desired: action.desired,
        expectedVersion: r.version,
        summary: "Attendance correction: " + student(state, r.studentId).name,
        note: action.note,
      });
      break;
    }
    case "INCIDENT":
      editable();
      row(action.studentId);
      requireText(action.note, "Describe the fictional incident.");
      requireText(action.actionTaken, "Record the immediate action.");
      review({
        kind: "incident",
        studentIds: [action.studentId],
        summary: "Incident: " + student(state, action.studentId).name,
        note: action.note + "\nImmediate action: " + action.actionTaken,
      });
      break;
    case "PAPER": {
      editable();
      const p = action.paper,
        r = row(p.studentId),
        arrival = isoTime(s, p.arrival),
        departure = isoTime(s, p.departure);
      requireText(p.adult, "Enter the pickup adult recorded on paper.");
      requireText(p.note, "Record the paper verification/authorization note.");
      if (!["Known to staff", "Photo ID checked"].includes(p.verification))
        throw new Error("Choose the verification recorded on paper.");
      if (arrival > departure || departure > now)
        throw new Error(
          "Paper times must be in order and no later than the simulation clock.",
        );
      if (p.paymentTime && isoTime(s, p.paymentTime) > now)
        throw new Error("The original payment time cannot be in the future.");
      const paperKey = s.id + ":paper:" + JSON.stringify(p);
      if (state.sentKeys.includes(paperKey)) return original;
      state.sentKeys.push(paperKey);
      if (r.status === "Expected") applyPaper(r, p, p.note, actor);
      else if (
        r.status === "Released" &&
        r.arrival === arrival &&
        r.departure === departure &&
        r.adult === p.adult.trim()
      ) {
        if (p.paid && !r.payment.confirmed)
          applyPaper(r, p, p.note, actor, false);
      } else
        review({
          kind: "paper",
          studentIds: [r.studentId],
          paper: p,
          expectedVersion: r.version,
          summary: "Paper conflict: " + student(state, r.studentId).name,
          note: p.note,
        });
      break;
    }
    case "RESOLVE": {
      const request = state.reviews.find(
        (r) => r.id === action.reviewId && r.sessionId === s.id,
      );
      if (!request || request.status !== "Pending")
        throw new Error("This review has already been resolved.");
      requireText(action.reason, "Record the manager's decision and reason.");
      const before = structuredClone(request);
      if (action.approve) {
        if (request.kind === "pickup") {
          if (!action.parentVerified)
            throw new Error(
              "Confirm verification using the parent's stored contact.",
            );
          state.adults.push({
            id: id("adult"),
            name: request.adultName!,
            relationship: request.relationship!,
            studentIds: [...request.studentIds],
            sessionId: s.id,
            revoked: false,
          });
        } else if (request.kind === "paper") {
          const r = row(request.studentIds[0]);
          if (r.version !== request.expectedVersion)
            throw new Error(
              "Attendance changed after this request. Decline it and submit the current paper comparison.",
            );
          applyPaper(r, request.paper!, action.reason, request.createdBy);
        } else if (request.kind === "correction") {
          const r = row(request.studentIds[0]);
          if (r.version !== request.expectedVersion)
            throw new Error(
              "Attendance changed after this request. Decline it and request a fresh correction.",
            );
          const old = structuredClone(r);
          r.status = request.desired!;
          if (r.status === "Present") {
            r.arrival ||= now;
            r.arrivalActor ||= actor;
          } else {
            r.arrival = null;
            r.arrivalActor = "";
          }
          r.departure = null;
          r.adult = "";
          r.verification = "";
          r.releaseActor = "";
          r.version++;
          audit("Attendance correction", old, r, action.reason, r.studentId);
        }
      }
      request.status = action.approve ? "Approved" : "Declined";
      request.resolution = action.reason;
      if (!action.approve && request.paper)
        state.sentKeys = state.sentKeys.filter(
          (k) => k !== s.id + ":paper:" + JSON.stringify(request.paper),
        );
      audit(
        "Manager " + request.kind + " review",
        before,
        request,
        action.reason,
      );
      break;
    }
    case "REVOKE": {
      requireText(action.reason, "Give a reason for revoking permission.");
      const adult = state.adults.find((a) => a.id === action.adultId);
      if (!adult || adult.revoked)
        throw new Error("This adult is already unavailable.");
      const old = structuredClone(adult);
      adult.revoked = true;
      audit("Pickup permission revoked", old, adult, action.reason);
      break;
    }
    case "PHOTO":
      // Artwork can be added after class; this never changes a handoff.
      action.studentIds.forEach(row);
      state.photos.push({
        id: id("photo"),
        sessionId: s.id,
        title: action.title.trim() || "Class artwork",
        studentIds: [...action.studentIds],
        publicApproved: false,
        reviewed: false,
        actor,
      });
      audit("Sample photo added privately", null, state.photos.at(-1));
      break;
    case "APPROVE_PHOTO": {
      const photo = state.photos.find(
        (p) => p.id === action.photoId && p.sessionId === s.id,
      );
      if (!photo) throw new Error("Sample photo not found.");
      if (photo.studentIds.some((id) => !student(state, id).publicPhoto))
        throw new Error(
          "Public photo permission is missing. Keep this sample private.",
        );
      const old = structuredClone(photo);
      photo.publicApproved = true;
      photo.reviewed = true;
      audit("Public sample approved", old, photo);
      break;
    }
    case "MESSAGE": {
      requireText(action.body, "Write the sample message.");
      requireText(action.recipient, "Choose the recipient.");
      if (
        action.channel === "Public post" &&
        !state.photos.some((p) => p.sessionId === s.id && p.publicApproved)
      )
        throw new Error(
          "Approve an eligible artwork sample before simulating a public post.",
        );
      const key = s.id + ":message:" + action.key;
      if (state.sentKeys.includes(key))
        throw new Error(
          "This simulation message was already recorded. It will not be duplicated.",
        );
      state.sentKeys.push(key);
      const message = {
        id: id("message"),
        sessionId: s.id,
        subject: action.subject,
        body: action.body,
        recipient: action.recipient,
        actor,
        at: now,
        channel: action.channel,
      };
      state.messages.push(message);
      audit("Simulated " + action.channel, null, message);
      break;
    }
    case "EXPENSE":
      requireText(action.supplier, "Enter a fictional supplier.");
      if (!Number.isFinite(action.amount) || action.amount <= 0)
        throw new Error("Enter an expense greater than zero.");
      state.expenses.push({
        id: id("expense"),
        sessionId: s.id,
        supplier: action.supplier,
        amount: action.amount,
        category: action.category,
      });
      audit("Sample expense recorded", null, state.expenses.at(-1));
      break;
    case "SUBMIT": {
      if (!["Arrivals", "Teaching", "Pickup"].includes(s.phase))
        throw new Error("This class cannot be submitted again.");
      const issues = closingIssues(state);
      if (issues.length) throw new Error(issues.join(" "));
      s.phase = "Submitted";
      s.closeNote = action.note;
      audit("Staff submitted class", null, {
        note: action.note,
        counts: counts(s),
      });
      break;
    }
    case "CLOSE": {
      const issues = closingIssues(state, true);
      if (issues.length) throw new Error(issues.join(" "));
      s.phase = "Closed";
      s.closedAt = now;
      s.closeNote += (s.closeNote ? "\n" : "") + action.note;
      audit("Manager closed class", "Submitted", {
        counts: counts(s),
        note: action.note,
      });
      break;
    }
    case "REOPEN":
      if (!["Submitted", "Closed"].includes(s.phase))
        throw new Error("The class is already open.");
      requireText(action.reason, "Give a reason for reopening the class.");
      audit("Class reopened", s.phase, "Pickup", action.reason);
      s.phase = "Pickup";
      s.closedAt = null;
      s.tasks.reconcile = false;
      break;
    case "COPY_SESSION": {
      requireText(action.name, "Enter a class name.");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(action.date) ||
        !Number.isFinite(Date.parse(action.date + "T12:00:00Z")) ||
        action.date <= s.date
      )
        throw new Error("Choose a valid later session date.");
      const next: Session = {
        ...structuredClone(s),
        id: id("session"),
        name: action.name.trim(),
        date: action.date,
        phase: "Preparing",
        clock: 15 * 60 + 15,
        roster: s.roster.map((r) => blankRow(r.studentId)),
        tasks: {},
        closeNote: "",
        closedAt: null,
      };
      stamp(next);
      state.sessions.push(next);
      audit("Next session created", null, { id: next.id, date: next.date });
      state.activeSessionId = next.id;
      break;
    }
  }
  if (operationId) state.operations.push(operationId);
  state.revision++;
  s.clock = Math.min(s.clock + 1, 23 * 60 + 59);
  return state;
}
