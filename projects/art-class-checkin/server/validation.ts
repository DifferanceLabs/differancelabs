import { z } from "zod";
const id = z.uuid(),
  text = z.string().trim().max(500),
  name = z.string().trim().min(1).max(160);
const version = z.number().int().nonnegative();
const date = z.iso.date();
const instant = z.iso.datetime({ offset: true }).nullable().optional();
const base = { id: id.optional(), version: version.optional() };
const payment = z
  .object({
    confirmed: z.boolean(),
    method: z.enum(["", "Square", "Venmo", "Cash", "Other"]).optional(),
    amountCents: z.number().int().min(0).max(100000000).nullable().optional(),
    paymentDate: date.nullable().optional(),
    note: text.optional(),
  })
  .strict();
const paper = {
  id,
  version,
  arrivalAt: instant,
  departureAt: instant,
  adultId: id.optional(),
  verification: z.enum(["Known to staff", "Photo ID checked"]).optional(),
  staffInitials: z.string().max(80).optional(),
  paid: z.boolean().optional(),
  paymentVersion: version.optional(),
  confirmedAt: instant,
  payment: payment.partial().optional(),
  reason: text.optional(),
  status: z.enum(["Expected", "Absent", "Present", "Released"]).optional(),
};
export const changes: Record<string, z.ZodType> = {
  "student.save": z
    .object({
      ...base,
      data: z
        .object({
          name,
          guardianName: name,
          guardianPhone: z.string().trim().min(3).max(60),
          emergencyName: text,
          emergencyPhone: z.string().max(60),
          safetyNote: z.string().max(300),
          archived: z.boolean(),
        })
        .strict(),
    })
    .strict(),
  "adult.save": z
    .object({
      ...base,
      data: z.object({ name, phone: z.string().max(60) }).strict(),
    })
    .strict(),
  "class.save": z
    .object({
      ...base,
      data: z
        .object({
          name,
          instructor: name,
          studentIds: z.array(id).max(300),
          archived: z.boolean(),
        })
        .strict(),
    })
    .strict(),
  "permission.set": z
    .object({
      ...base,
      studentId: id,
      adultId: id,
      approved: z.boolean(),
      relationship: z.string().max(80),
      note: z.string().trim().min(3).max(500),
    })
    .strict(),
  "session.create": z.object({ classId: id, date }).strict(),
  "settings.save": z
    .object({ businessName: name, timezone: z.string().max(80) })
    .strict(),
  "staff.role": z
    .object({
      email: z.email(),
      role: z.enum(["staff", "admin"]),
      reason: z.string().trim().min(3).max(500),
    })
    .strict(),
  "attendance.checkin": z.object({ id, version }).strict(),
  "attendance.absent": z.object({ id, version }).strict(),
  "attendance.release": z
    .object({
      id,
      version,
      permissionId: id,
      verification: z.enum(["Known to staff", "Photo ID checked"]),
    })
    .strict(),
  "attendance.correct": z
    .object({
      ...paper,
      reason: z.string().trim().min(3).max(500),
      status: z.enum(["Expected", "Absent", "Present", "Released"]),
    })
    .strict(),
  "payment.set": z
    .object({ id, version, payment, reason: text.optional() })
    .strict(),
  "paper.reconcile": z.object(paper).strict(),
  "backup.create": z.object({ sessionId: id }).strict(),
};
export const changeEnvelope = z
  .object({
    operationId: id,
    action: z.string(),
    input: z.record(z.string(), z.unknown()),
  })
  .strict();
export const historyQuery = z
  .object({
    student: id.optional(),
    class: id.optional(),
    session: id.optional(),
    from: date.optional(),
    to: date.optional(),
    paid: z.enum(["true", "false"]).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
  })
  .strict();
