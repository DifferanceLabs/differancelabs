import { randomUUID } from "node:crypto";
export async function seedDemo(db) {
  const {
    rows: [env],
  } = await db.query("select * from art_checkin.environment");
  if (env.kind !== "demo")
    throw new Error("Demo reset refuses a database not marked demo.");
  await db.query("begin");
  try {
    // Schema-scoped reset, never a project reset or production cleanup.
    await db.query(
      "truncate art_checkin.events,art_checkin.operations,art_checkin.backups,art_checkin.roster,art_checkin.class_sessions,art_checkin.permissions,art_checkin.classes,art_checkin.students,art_checkin.adults restart identity cascade",
    );
    const names = [
      "Amelia Brooks",
      "Oliver Brooks",
      "Maya Chen",
      "Ethan Chen",
      "Sofia Rivera",
      "Luca Patel",
      "Harper Williams",
      "Noah Thompson",
      "Isabella-Rose Montgomery-Wellington",
      "Elijah Kim",
      "Avery Johnson",
      "Mateo Garcia",
      "Charlotte Davis",
      "Leo Wilson",
      "Aria Martinez",
      "Finn Anderson",
    ];
    const ids = names.map(() => randomUUID());
    const families = names.map((_, i) => (i === 1 ? 0 : i === 3 ? 2 : i));
    const adults = new Map();
    for (let i = 0; i < names.length; i++) {
      const family = families[i];
      const guardian = "Jamie " + names[family].split(" ").slice(1).join(" ");
      const data = {
        name: names[i],
        guardianName: guardian,
        guardianPhone: "(615) 555-" + String(100 + family).padStart(4, "0"),
        emergencyName: "Taylor Family Friend",
        emergencyPhone: "(615) 555-0199",
        safetyNote: i === 5 ? "Fictional example: avoid latex supplies." : "",
        archived: false,
      };
      await db.query(
        "insert into art_checkin.students(id,data) values($1,$2)",
        [ids[i], data],
      );
      if (!adults.has(family)) {
        const list = [
          {
            id: randomUUID(),
            name: guardian,
            phone: data.guardianPhone,
            relationship: "Parent",
          },
          {
            id: randomUUID(),
            name: "Alex " + names[family].split(" ").slice(1).join(" "),
            phone: "(615) 555-0188",
            relationship: "Grandparent",
          },
        ];
        adults.set(family, list);
        for (const adult of list)
          await db.query(
            "insert into art_checkin.adults(id,data) values($1,$2)",
            [adult.id, { name: adult.name, phone: adult.phone }],
          );
      }
      for (const adult of adults.get(family)) {
        const pid = randomUUID();
        const permission = {
          id: pid,
          student_id: ids[i],
          adult_id: adult.id,
          approved: true,
          relationship: adult.relationship,
          note: "Fictional authorization verified with the parent contact on file.",
          version: 1,
        };
        await db.query(
          "insert into art_checkin.permissions(id,student_id,adult_id,approved,relationship,note,changed_at) values($1,$2,$3,true,$4,$5,now()-interval '30 days')",
          [pid, ids[i], adult.id, adult.relationship, permission.note],
        );
        await db.query(
          "insert into art_checkin.events(operation_id,actor,subject_id,kind,after_value,actual_at,source,reason) values($1,'admin@art-demo.invalid',$2,'permission.set',$3,now()-interval '30 days','Demo seed',$4)",
          [randomUUID(), pid, permission, permission.note],
        );
      }
    }
    const classId = randomUUID();
    await db.query("insert into art_checkin.classes(id,data) values($1,$2)", [
      classId,
      {
        name: "After-School Art Studio",
        instructor: "Morgan Ellis",
        studentIds: ids,
        archived: false,
      },
    ]);
    const sid = randomUUID();
    await db.query(
      "insert into art_checkin.class_sessions(id,class_id,date,snapshot,created_by) values($1,$2,(now() at time zone 'America/Chicago')::date,$3,'admin@art-demo.invalid')",
      [
        sid,
        classId,
        {
          name: "After-School Art Studio",
          instructor: "Morgan Ellis",
          timezone: "America/Chicago",
        },
      ],
    );
    for (let i = 0; i < ids.length; i++) {
      const rid = randomUUID(),
        paid = i % 3 === 0;
      const {
        rows: [student],
      } = await db.query("select data from art_checkin.students where id=$1", [
        ids[i],
      ]);
      const payment = paid
        ? {
            confirmed: true,
            confirmedBy: "staff@art-demo.invalid",
            confirmedAt: new Date().toISOString(),
            recordedAt: new Date().toISOString(),
            method: i % 2 ? "Venmo" : "Square",
            source: "Demo seed",
          }
        : { confirmed: false };
      await db.query(
        "insert into art_checkin.roster(id,session_id,student_id,student_snapshot,status,payment,payment_version) values($1,$2,$3,$4,$5,$6,$7)",
        [
          rid,
          sid,
          ids[i],
          student.data,
          i === 15 ? "Absent" : "Expected",
          payment,
          paid ? 1 : 0,
        ],
      );
      if (paid)
        await db.query(
          "insert into art_checkin.events(operation_id,actor,subject_id,roster_id,kind,after_value,actual_at,source) values($1,'staff@art-demo.invalid',$2,$2,'payment.set',$3,now(),'Demo seed')",
          [randomUUID(), rid, { payment }],
        );
    }
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}
