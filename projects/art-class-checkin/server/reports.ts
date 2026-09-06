import PDFDocument from "pdfkit";
import type { Snapshot, HistoryRow } from "../src/types.js";
export function formatTime(value: string | null | undefined, zone: string) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: zone,
      }).format(new Date(value))
    : "";
}
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function historyCsv(rows: HistoryRow[]) {
  const header = [
    "Student ID",
    "Student",
    "Class",
    "Session date",
    "Timezone",
    "Status",
    "Arrival UTC",
    "Arrival local",
    "Departure UTC",
    "Departure local",
    "Pickup adult",
    "Verification",
    "Release staff / entering staff",
    "Paid",
    "Method",
    "Amount USD",
    "Payment date",
    "Confirmed UTC",
    "Recorded UTC",
    "Confirmed / entering staff",
    "Payment source",
    "Payment note",
    "Audit events",
  ];
  return (
    [
      header,
      ...rows.map((r) => [
        r.student_id,
        r.student_snapshot.name,
        r.session.snapshot.name,
        r.session.date,
        r.session.snapshot.timezone,
        r.status,
        r.arrival_at,
        formatTime(r.arrival_at, r.session.snapshot.timezone),
        r.departure_at,
        formatTime(r.departure_at, r.session.snapshot.timezone),
        r.release?.name,
        r.release?.verification,
        r.release?.staff || r.release?.recordedBy,
        r.payment.confirmed ? "Paid" : "Not confirmed",
        r.payment.method,
        r.payment.amountCents == null
          ? ""
          : (r.payment.amountCents / 100).toFixed(2),
        r.payment.paymentDate,
        r.payment.confirmedAt,
        r.payment.recordedAt,
        r.payment.confirmedBy,
        r.payment.source,
        r.payment.note,
        JSON.stringify(r.events),
      ]),
    ]
      .map((line) => line.map(csvCell).join(","))
      .join("\r\n") + "\r\n"
  );
}
export async function backupPdf(
  snapshot: Snapshot,
  reference = false,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 36,
    autoFirstPage: false,
    bufferPages: true,
    info: {
      Title: reference ? "Staff pickup reference" : "Art class paper backup",
      Author: snapshot.business,
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const page = () => {
    doc.addPage();
    doc
      .fillColor("#172d28")
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(snapshot.business, 36, 34, { width: 540 });
    doc
      .moveDown(0.4)
      .fontSize(11)
      .text(
        (snapshot.demo ? "FICTIONAL DEMO | " : "") +
          (reference
            ? "STAFF USE ONLY - PICKUP / CONTACT REFERENCE"
            : "STAFF USE ONLY - PAPER ATTENDANCE BACKUP"),
        { width: 540 },
      );
    doc
      .moveDown(0.6)
      .font("Helvetica")
      .fontSize(10)
      .text(snapshot.session.snapshot.name + " | " + snapshot.session.date, {
        width: 540,
      });
    doc
      .moveDown(0.4)
      .text("Instructor: " + snapshot.session.snapshot.instructor, {
        width: 540,
      });
    doc
      .moveDown(0.4)
      .fontSize(8)
      .text(
        "Printed: " +
          formatTime(snapshot.printedAt, snapshot.session.snapshot.timezone) +
          " (" +
          snapshot.session.snapshot.timezone +
          ")",
        { width: 540 },
      );
    doc
      .moveDown(0.4)
      .text(
        "Record actual handoff times. Keep this sheet under staff control.",
        { width: 540 },
      );
    doc.y += 20;
    if (!reference) {
      const headers = [
        "Student / saved Paid",
        "Arrival",
        "Departure",
        "Pickup adult",
        "Initials",
      ];
      const xs = [36, 218, 287, 356, 494],
        ws = [174, 61, 61, 130, 46];
      const y = doc.y;
      headers.forEach((h, i) =>
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(h, xs[i], y, { width: ws[i] }),
      );
      doc
        .moveTo(36, y + 18)
        .lineTo(576, y + 18)
        .strokeColor("#52665d")
        .stroke();
      doc.y = y + 27;
    }
  };
  page();
  for (const r of snapshot.roster) {
    if (!reference) {
      doc.font("Helvetica-Bold").fontSize(12);
      const nameHeight = doc.heightOfString(r.student_snapshot.name, {
        width: 170,
      });
      const height = Math.max(78, nameHeight + 46);
      if (doc.y + height > 730) page();
      const top = doc.y;
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(r.student_snapshot.name, 36, top, { width: 170 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(
          r.payment.confirmed ? "Paid (saved)" : "Not confirmed (saved)",
          36,
          top + nameHeight + 6,
          { width: 170 },
        );
      for (const [x, w] of [
        [218, 61],
        [287, 61],
        [356, 130],
        [494, 46],
      ])
        doc
          .moveTo(x, top + 28)
          .lineTo(x + w, top + 28)
          .strokeColor("#a7b0aa")
          .stroke();
      doc
        .fontSize(8)
        .text(
          "Payment confirmation initials / notes: __________________________________________________",
          218,
          top + 44,
          { width: 356 },
        );
      doc
        .moveTo(36, top + height - 10)
        .lineTo(576, top + height - 10)
        .strokeColor("#d2d8d4")
        .stroke();
      doc.y = top + height;
    } else {
      const student =
        snapshot.students.find((s) => s.id === r.student_id)?.data ||
        r.student_snapshot;
      const lines = [
        "Parent / guardian: " +
          student.guardianName +
          " | " +
          student.guardianPhone,
        "Emergency contact (not pickup authorization): " +
          (student.emergencyName || "None recorded") +
          " | " +
          student.emergencyPhone,
        ...(student.safetyNote ? ["Safety note: " + student.safetyNote] : []),
        ...snapshot.permissions
          .filter((p) => p.student_id === r.student_id && p.approved)
          .map((p) => {
            const a = snapshot.adults.find((a) => a.id === p.adult_id)?.data;
            return (
              "Approved: " +
              (a?.name || "Unknown") +
              " | " +
              p.relationship +
              " | " +
              (a?.phone || "No phone recorded")
            );
          }),
      ];
      if (!lines.some((l) => l.startsWith("Approved:")))
        lines.push("No approved pickup adults recorded.");
      const title = () => {
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(r.student_snapshot.name, 36, doc.y, { width: 530 });
        doc.y += 5;
      };
      doc.fontSize(10).font("Helvetica");
      const height =
        doc.heightOfString(lines.join("\n"), { width: 530, lineGap: 3 }) +
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .heightOfString(r.student_snapshot.name, { width: 530 }) +
        26;
      if (doc.y + Math.min(height, 550) > 730) page();
      title();
      for (const line of lines) {
        doc.font("Helvetica").fontSize(10);
        if (
          doc.y + doc.heightOfString(line, { width: 530, lineGap: 3 }) >
          730
        ) {
          page();
          title();
          doc.font("Helvetica").fontSize(10);
        }
        doc.text(line, 36, doc.y, { width: 530, lineGap: 3 });
      }
      doc.moveDown(0.8);
      doc.moveTo(36, doc.y).lineTo(576, doc.y).strokeColor("#c2cec7").stroke();
      doc.y += 12;
    }
  }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#52665d")
      .text(
        "Staff use only | " +
          (i + 1) +
          " / " +
          range.count +
          " | Backup " +
          (snapshot.backupId || "").slice(0, 8),
        36,
        742,
        { width: 540, lineBreak: false },
      );
  }
  doc.end();
  return completed;
}
