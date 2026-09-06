import { describe, expect, it } from "vitest";
import {
  active,
  approvedAdults,
  closingIssues,
  counts,
  createState,
  rowFor,
  stamp,
  transition,
  type Action,
  type Paper,
  type Role,
  type State,
} from "../design/simulation/state";

const next = (s: State, a: Action, role: Role = "staff", op?: string) =>
  transition(s, a, role, op);
function opened() {
  let s = createState();
  for (const key of ["kits", "safety", "backup"])
    s = next(s, { type: "TASK", key, done: true });
  return next(s, { type: "PHASE", phase: "Arrivals" });
}
function release(
  s: State,
  id: string,
  adultId = approvedAdults(s, id)[0].id,
  operation?: string,
) {
  return next(
    s,
    {
      type: "RELEASE",
      studentId: id,
      adultId,
      verification: "Known to staff",
      expectedVersion: rowFor(s, id)!.version,
    },
    "staff",
    operation,
  );
}
function payment(
  s: State,
  studentId: string,
  confirmed = true,
  reason = "",
  version = rowFor(s, studentId)!.payment.version,
) {
  return next(s, {
    type: "PAYMENT",
    studentId,
    confirmed,
    method: "Square",
    amount: 30,
    note: "",
    reason,
    expectedVersion: version,
  });
}
const paper: Paper = {
  studentId: "student-15",
  arrival: "15:32",
  departure: "16:15",
  adult: "Casey Adams",
  verification: "Photo ID checked",
  paid: true,
  paymentTime: "15:20",
  note: "Fictional signed staff paper, adult verified at the time.",
};

describe("class-day simulation", () => {
  it("runs preparation, every individual handoff, staff submission, manager close and a fresh next class", () => {
    expect(() =>
      next(createState(), { type: "PHASE", phase: "Arrivals" }),
    ).toThrow(/preparation/);
    let s = opened();
    s = next(s, { type: "ABSENT", studentId: "student-5" });
    for (const r of active(s).roster.filter((r) => r.status === "Expected"))
      s = next(s, { type: "CHECK_IN", studentId: r.studentId });
    expect(() => next(s, { type: "SUBMIT", note: "" })).toThrow(/Present/);
    s = next(s, { type: "PHASE", phase: "Teaching" });
    s = next(s, { type: "PHASE", phase: "Pickup" });
    expect(counts(active(s)).Present).toBe(15);
    for (const r of active(s).roster.filter((r) => r.status === "Present"))
      s = release(s, r.studentId);
    for (const key of ["clean", "supplies", "reconcile"])
      s = next(s, { type: "TASK", key, done: true });
    expect(closingIssues(s)).toEqual([]);
    s = next(s, { type: "SUBMIT", note: "All handed to approved adults." });
    expect(() => next(s, { type: "CLOSE", note: "" })).toThrow(/manager/);
    s = next(s, { type: "CLOSE", note: "Reviewed records." }, "manager");
    expect(active(s).phase).toBe("Closed");
    expect(counts(active(s))).toEqual({
      Expected: 0,
      Present: 0,
      Released: 15,
      Absent: 1,
    });
    const events = structuredClone(s.audit);
    expect(() => next(s, { type: "CHECK_IN", studentId: "student-5" })).toThrow(
      /reopen/,
    );
    s = next(
      s,
      { type: "COPY_SESSION", date: "2026-09-15", name: "Next art class" },
      "manager",
    );
    expect(
      active(s).roster.every(
        (r) => r.status === "Expected" && !r.payment.confirmed,
      ),
    ).toBe(true);
    expect(s.sessions[0].phase).toBe("Closed");
    expect(s.audit.slice(0, events.length)).toEqual(events);
  });

  it("requires manager verification, grants siblings one dated permission and records each release separately", () => {
    let s = opened();
    for (const studentId of ["student-0", "student-3"])
      s = next(s, { type: "CHECK_IN", studentId });
    s = next(s, {
      type: "REQUEST_PICKUP",
      studentIds: ["student-0", "student-3"],
      adultName: "Avery Brooks",
      relationship: "Aunt",
      note: "Parent requested pickup today.",
    });
    const decision: Action = {
      type: "RESOLVE",
      reviewId: s.reviews[0].id,
      approve: true,
      reason: "Confirmed with Jordan at stored phone.",
      parentVerified: true,
    };
    expect(
      approvedAdults(s, "student-0").some((a) => a.name === "Avery Brooks"),
    ).toBe(false);
    expect(() => next(s, decision)).toThrow(/manager/);
    expect(() =>
      next(s, { ...decision, parentVerified: false }, "manager"),
    ).toThrow(/stored contact/);
    s = next(s, decision, "manager");
    const adult = approvedAdults(s, "student-0").find(
      (a) => a.name === "Avery Brooks",
    )!;
    s = release(s, "student-0", adult.id);
    expect(rowFor(s, "student-3")!.status).toBe("Present");
    s = next(
      s,
      { type: "REVOKE", adultId: adult.id, reason: "Parent changed plan." },
      "manager",
    );
    expect(() => release(s, "student-3", adult.id)).toThrow(/permission/);
    expect(rowFor(s, "student-0")!.adult).toContain("Avery Brooks");
    s = next(
      s,
      { type: "COPY_SESSION", date: "2026-09-15", name: "Next" },
      "manager",
    );
    expect(
      approvedAdults(s, "student-0").some((a) => a.name === "Avery Brooks"),
    ).toBe(false);
  });

  it("rejects non-present, stale and duplicate releases; repeating an operation returns its original result", () => {
    let s = opened();
    expect(() => release(s, "student-1")).toThrow(/not Present/);
    s = next(s, { type: "CHECK_IN", studentId: "student-1" });
    const action: Action = {
      type: "RELEASE",
      studentId: "student-1",
      adultId: approvedAdults(s, "student-1")[0].id,
      verification: "Known to staff",
      expectedVersion: rowFor(s, "student-1")!.version,
    };
    expect(() => next(s, { ...action, expectedVersion: 0 })).toThrow(/changed/);
    const result = next(s, action, "staff", "same-release");
    expect(next(result, action, "staff", "same-release")).toBe(result);
    expect(() => next(result, action, "staff", "second-tap")).toThrow(
      /second release/,
    );
    expect(result.audit.filter((e) => e.kind === "Release")).toHaveLength(1);
  });

  it("keeps payment independent, scoped, versioned and auditable, including an absent student", () => {
    let s = opened();
    s = next(s, { type: "ABSENT", studentId: "student-5" });
    s = payment(s, "student-5");
    expect(rowFor(s, "student-5")!.status).toBe("Absent");
    expect(rowFor(s, "student-1")!.payment.confirmed).toBe(false);
    expect(() => payment(s, "student-5", false)).toThrow(/reason/);
    expect(() => payment(s, "student-5", true, "Change details", 0)).toThrow(
      /Payment changed/,
    );
    s = payment(s, "student-5", false, "Entered for wrong session.");
    expect(
      s.audit.filter((e) => e.kind === "Payment confirmation"),
    ).toHaveLength(2);
    s = next(s, { type: "CHECK_IN", studentId: "student-1" });
    s = release(s, "student-1");
    expect(rowFor(s, "student-1")!.payment.confirmed).toBe(false);
    expect(rowFor(s, "student-1")!.status).toBe("Released");
  });

  it("reconciles paper with actual/recorded times and no duplicate or silent clearing", () => {
    let s = next(opened(), { type: "PHASE", phase: "Pickup" });
    s = next(s, { type: "PAPER", paper });
    const r = rowFor(s, paper.studentId)!;
    expect(r.source).toBe("Paper");
    expect(r.payment.actualAt).not.toBe(r.payment.recordedAt);
    const originalEvents = s.audit.length;
    expect(next(s, { type: "PAPER", paper })).toBe(s);
    s = next(s, { type: "PAPER", paper: { ...paper, paid: false } });
    expect(s.audit).toHaveLength(originalEvents);
    expect(rowFor(s, paper.studentId)!.payment.confirmed).toBe(true);
    expect(s.adults.some((a) => a.name === paper.adult && a.sessionId)).toBe(
      false,
    );
  });

  it("adds later paper payment without duplicating attendance and resolves conflicts with original events preserved", () => {
    let s = next(opened(), { type: "PHASE", phase: "Pickup" });
    s = next(s, { type: "PAPER", paper: { ...paper, paid: false } });
    s = next(s, { type: "PAPER", paper });
    expect(s.audit.filter((e) => e.kind === "Paper attendance")).toHaveLength(
      1,
    );
    expect(
      s.audit.filter((e) => e.kind === "Paper payment confirmation"),
    ).toHaveLength(1);
    s = next(s, {
      type: "PAPER",
      paper: { ...paper, departure: "16:12", paid: false },
    });
    expect(s.reviews).toHaveLength(1);
    const old = structuredClone(s.audit);
    s = next(
      s,
      {
        type: "RESOLVE",
        reviewId: s.reviews[0].id,
        approve: true,
        reason: "Checked signed paper original.",
      },
      "manager",
    );
    expect(s.audit.slice(0, old.length)).toEqual(old);
    expect(rowFor(s, paper.studentId)!.payment.confirmed).toBe(true);
    expect(rowFor(s, paper.studentId)!.departure).toBe(
      stamp(active(s), 16 * 60 + 12),
    );
    expect(s.reviews[0].status).toBe("Approved");
  });

  it("rejects stale manager corrections and audits reopen without deleting original handoffs", () => {
    let s = opened();
    s = next(s, { type: "CHECK_IN", studentId: "student-1" });
    s = next(s, {
      type: "REQUEST_CORRECTION",
      studentId: "student-1",
      desired: "Expected",
      note: "Wrong row tapped.",
    });
    s = release(s, "student-1");
    expect(() =>
      next(
        s,
        {
          type: "RESOLVE",
          reviewId: s.reviews[0].id,
          approve: true,
          reason: "Corrected",
        },
        "manager",
      ),
    ).toThrow(/changed/);
    expect(s.audit.some((e) => e.kind === "Check-in")).toBe(true);
    expect(s.audit.some((e) => e.kind === "Release")).toBe(true);
    active(s).phase = "Closed";
    expect(() => next(s, { type: "REOPEN", reason: "" }, "manager")).toThrow(
      /reason/,
    );
    s = next(
      s,
      { type: "REOPEN", reason: "Paper review required." },
      "manager",
    );
    expect(active(s).phase).toBe("Pickup");
    expect(active(s).tasks.reconcile).toBe(false);
    expect(s.audit.at(-1)?.kind).toBe("Class reopened");
  });

  it("gates public samples and simulated outbox by manager review, with no duplicate messages", () => {
    let s = opened();
    s = next(s, {
      type: "PHOTO",
      title: "Brooks siblings",
      studentIds: ["student-0", "student-3"],
    });
    expect(() =>
      next(s, { type: "APPROVE_PHOTO", photoId: s.photos[0].id }, "manager"),
    ).toThrow(/permission/);
    s = next(s, { type: "PHOTO", title: "Artwork only", studentIds: [] });
    expect(() =>
      next(s, { type: "APPROVE_PHOTO", photoId: s.photos[1].id }),
    ).toThrow(/manager/);
    s = next(s, { type: "APPROVE_PHOTO", photoId: s.photos[1].id }, "manager");
    const action: Action = {
      type: "MESSAGE",
      subject: "Color class",
      body: "A fictional recap.",
      recipient: "Studio feed",
      channel: "Public post",
      key: "public-post",
    };
    expect(() => next(s, action)).toThrow(/manager/);
    s = next(s, action, "manager");
    expect(() => next(s, action, "manager")).toThrow(/already recorded/);
    expect(s.messages).toHaveLength(1);
  });

  it("uses Chicago daylight saving rules and rejects invalid or future paper times", () => {
    const s = createState(),
      session = active(s);
    expect(stamp(session, 15 * 60)).toBe("2026-09-08T20:00:00.000Z");
    session.date = "2026-12-08";
    expect(stamp(session, 15 * 60)).toBe("2026-12-08T21:00:00.000Z");
    expect(() => next(opened(), { type: "PAPER", paper })).toThrow(/no later/);
    expect(() =>
      next(
        s,
        { type: "COPY_SESSION", name: "Invalid", date: "2027-02-30" },
        "manager",
      ),
    ).toThrow();
  });
});
