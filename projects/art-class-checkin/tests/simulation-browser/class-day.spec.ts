import { test, expect, type Page } from "@playwright/test";
import type { State } from "../../design/simulation/state";

const action = (page: Page, name: string, id?: string) =>
  page
    .locator(
      'button[data-action="' +
        name +
        '"]' +
        (id ? '[data-id="' + id + '"]' : ""),
    )
    .first();
const row = (page: Page, id: number) =>
  page.locator('[data-student="student-' + id + '"]');
const practice = (page: Page): Promise<State> =>
  page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("art-school-class-simulation-v3")!),
  );
const role = (page: Page, name: "staff" | "manager") =>
  page.locator('[data-role="' + name + '"]').click();
async function prepare(page: Page) {
  await role(page, "staff");
  for (const key of ["kits", "safety", "backup"])
    await page.locator('[data-task="' + key + '"]').check();
  await action(page, "phase", "Arrivals").click();
}
async function approveReview(page: Page, text: string, parent = false) {
  await role(page, "manager");
  await action(page, "reviews").click();
  await page
    .locator(".sd-panel")
    .filter({ hasText: text })
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await page
    .getByLabel("Decision and reason", { exact: true })
    .fill("Verified the fictional record and stored parent contact.");
  if (parent)
    await page
      .getByLabel("I verified this fictional authorization", { exact: false })
      .check();
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(page.locator("#sd-error")).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).appCsp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as any).appCsp.push(e.violatedDirective),
    );
    window.print = () => {
      (window as any).printed = true;
    };
  });
});

test("staff and manager complete the same class, paper review, closing, recap and next session", async ({
  page,
}, info) => {
  const errors: string[] = [],
    forbidden: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/api/") || r.method() !== "GET")
      forbidden.push(r.method() + " " + r.url());
  });
  await page.goto("/studio-design");
  await expect(
    page.getByRole("heading", { name: "Your class, from start to finish." }),
  ).toBeVisible();
  await role(page, "staff");
  await action(page, "phase", "Arrivals").click();
  await expect(page.getByRole("alert")).toContainText(
    "three preparation checks",
  );
  await action(page, "print").click();
  await expect(page.locator(".sd-paper tbody tr")).toHaveCount(32);
  await expect(page.locator(".sd-paper")).toContainText(
    "Isabella-Rose Montgomery-Wellington",
  );
  await action(page, "print-now").click();
  expect(await page.evaluate(() => (window as any).printed)).toBe(true);
  await action(page, "back").click();
  await prepare(page);
  await row(page, 5)
    .getByRole("button", { name: "Absent", exact: true })
    .click();
  for (let i = 0; i < 15; i++) {
    if (i !== 5)
      await row(page, i)
        .getByRole("button", { name: "Check in", exact: true })
        .click();
  }
  await row(page, 1).getByRole("checkbox", { name: /Paid/ }).check();
  await expect(row(page, 1)).toContainText("Confirmed");

  // Ask for one session-scoped adult for two siblings, then approve as manager.
  await row(page, 0)
    .getByRole("button", { name: "Pick up", exact: true })
    .click();
  await action(page, "request-pickup").click();
  await page.getByLabel("Ezra Brooks", { exact: true }).check();
  await page.getByLabel("Proposed adult's name").fill("Avery Brooks");
  await page.getByLabel("Relationship", { exact: true }).fill("Aunt");
  await page
    .getByLabel("Request details", { exact: true })
    .fill("Jordan asked for Avery to collect both siblings today.");
  await page
    .getByRole("button", { name: "Send to manager for review" })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve request", exact: true }),
  ).toHaveCount(0);
  await approveReview(page, "Verify pickup: Avery Brooks", true);
  await role(page, "staff");
  await action(page, "roster").click();
  await row(page, 0)
    .getByRole("button", { name: "Pick up", exact: true })
    .click();
  await page
    .getByLabel("Approved pickup adult", { exact: true })
    .selectOption({ label: "Avery Brooks · Aunt" });
  await page
    .getByLabel("How did you verify this adult?")
    .selectOption("Known to staff");
  await page
    .getByRole("button", { name: "Confirm release", exact: true })
    .click();
  await expect(row(page, 0)).toContainText("Released");
  await expect(row(page, 3).locator(".sd-attendance")).toHaveText(/Present/);

  await action(page, "phase", "Teaching").click();
  await action(page, "phase", "Pickup").click();
  // A real paper entry completes a student whose digital row is still Expected.
  await action(page, "paper").click();
  await page.getByLabel("Student", { exact: true }).selectOption("student-15");
  await page.getByLabel("Pickup adult exactly as recorded").fill("Casey Adams");
  await page.getByLabel("Paper has a payment confirmation").check();
  await page
    .getByLabel("Original payment confirmation time", { exact: false })
    .fill("15:20");
  await page
    .getByLabel("Paper authorization / staff note")
    .fill("Signed fictional sheet. Adult was known at the handoff.");
  await page.getByRole("button", { name: "Reconcile paper record" }).click();
  await expect(
    page.getByRole("heading", { name: "Paper attendance · Lucas Adams" }),
  ).toBeVisible();
  // A different paper departure is queued for manager review, not overwritten.
  await page.locator('#sd-staff-nav [data-view="roster"]').click();
  await action(page, "paper").click();
  await page.getByLabel("Student", { exact: true }).selectOption("student-15");
  await page.getByLabel("Actual departure (Chicago time)").fill("16:12");
  await page.getByLabel("Pickup adult exactly as recorded").fill("Casey Adams");
  await page
    .getByLabel("Paper authorization / staff note")
    .fill("Review a corrected paper time; leave digital Paid confirmed.");
  await page.getByRole("button", { name: "Reconcile paper record" }).click();
  await approveReview(page, "Paper conflict: Lucas Adams");
  await role(page, "staff");
  await action(page, "roster").click();
  await expect(row(page, 15)).toContainText("4:12 PM");
  await expect(
    row(page, 15).getByRole("checkbox", { name: /Paid/ }),
  ).toBeChecked();

  // Finish remains blocked until every physically present child is released.
  await action(page, "finish").click();
  await expect(
    page.getByRole("button", {
      name: "Submit class for manager review",
      exact: true,
    }),
  ).toBeDisabled();
  await action(page, "roster").click();
  for (let i = 1; i < 15; i++) {
    if (i === 5) continue;
    await row(page, i)
      .getByRole("button", { name: "Pick up", exact: true })
      .click();
    const adult = page.getByLabel("Approved pickup adult", { exact: true });
    if (i === 3) await adult.selectOption({ label: "Avery Brooks · Aunt" });
    else await adult.selectOption({ index: 1 });
    await page
      .getByLabel("How did you verify this adult?")
      .selectOption("Photo ID checked");
    await page
      .getByRole("button", { name: "Confirm release", exact: true })
      .click();
    await expect(row(page, i).locator(".sd-attendance")).toHaveText(/Released/);
  }
  await page.locator('#sd-staff-nav [data-view="tasks"]').click();
  await action(page, "upload").click();
  await page.getByRole("button", { name: "Add private sample" }).click();
  await expect(page.locator("#sd-status")).toContainText("added privately");
  await action(page, "restock").click();
  for (const key of ["clean", "supplies", "reconcile"])
    await page.locator('[data-task="' + key + '"]').check();
  await action(page, "finish").click();
  await page
    .getByLabel("Handoff note", { exact: true })
    .fill("All 15 attending artists released; Owen absent. Paper reconciled.");
  await page
    .getByRole("button", {
      name: "Submit class for manager review",
      exact: true,
    })
    .click();
  await expect(page.locator("#sd-content")).toContainText("Submitted");
  await role(page, "manager");
  await action(page, "restocked").click();
  await action(page, "finish").click();
  await page
    .getByLabel("Manager sign-off note")
    .fill("Reviewed the pickup and paper records. Class complete.");
  await page.getByRole("button", { name: "Close class", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Class complete.", exact: true }),
  ).toBeVisible();

  const beforeReload = await practice(page);
  expect(
    beforeReload.sessions[0].roster.filter((r) => r.status === "Released"),
  ).toHaveLength(15);
  expect(
    beforeReload.sessions[0].roster.filter((r) => r.status === "Absent"),
  ).toHaveLength(1);
  expect(beforeReload.sessions[0].roster[0].adult).toContain("Avery Brooks");
  expect(beforeReload.sessions[0].roster[3].adult).toContain("Avery Brooks");
  expect(
    beforeReload.audit.filter((e) => e.kind === "Paper attendance"),
  ).toHaveLength(2);
  await page.reload();
  await action(page, "summary").click();
  await expect(
    page.getByRole("heading", { name: "Class complete.", exact: true }),
  ).toBeVisible();
  await action(page, "recap").click();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    /15 students completed pickup and 1 were marked absent/,
  );
  await page.getByRole("button", { name: "Record simulated send" }).click();
  await expect(page.locator(".sd-message")).toContainText(
    "15 students completed pickup",
  );
  expect((await practice(page)).messages[0].channel).toBe("Family recap");
  const download = page.waitForEvent("download");
  await page.locator('#sd-manager-nav [data-view="money"]').click();
  await action(page, "export-payments").click();
  const report = await download;
  expect(report.suggestedFilename()).toBe("fictional-payments-2026-09-08.csv");
  let csv = "";
  const stream = await report.createReadStream();
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('"Payment actual UTC","Payment recorded UTC"');
  expect(csv).toContain('"Amelia Brooks","Released"');
  expect(csv).toContain('"Avery Brooks · Aunt"');
  expect(csv).toContain('"Owen Patel","Absent"');
  expect(csv).toContain('"2026-09-08T21:12:00.000Z"');
  await page.locator('#sd-manager-nav [data-view="schedule"]').click();
  await action(page, "copy").click();
  await page
    .getByRole("button", { name: "Create next session", exact: true })
    .click();
  const copied = await practice(page);
  expect(copied.sessions).toHaveLength(2);
  expect(
    copied.sessions[1].roster.every(
      (r) => !r.payment.confirmed && r.status === "Expected",
    ),
  ).toBe(true);
  expect(copied.sessions[0].phase).toBe("Closed");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => (window as any).appCsp)).toEqual([]);
  expect(errors).toEqual([]);
  expect(forbidden).toEqual([]);
  // Screenshot only after CSP assertions: WebKit's screenshot helper injects its own style.
  await page.screenshot({
    path: info.outputPath("next-class.png"),
    fullPage: true,
  });
});

test("payment reasons, attendance correction, incident, photo consent, expenses and outbox work", async ({
  page,
}, info) => {
  await page.goto("/studio-design");
  await prepare(page);
  // Clicking opens the correction form; it does not immediately clear Paid.
  await row(page, 0).getByRole("checkbox", { name: /Paid/ }).click();
  await page.getByRole("button", { name: "Save payment confirmation" }).click();
  expect((await practice(page)).sessions[0].roster[0].payment.confirmed).toBe(
    true,
  );
  await page
    .getByLabel("Reason for clearing or correcting a confirmation")
    .fill("Wrong sample session selected.");
  await page.getByRole("button", { name: "Save payment confirmation" }).click();
  await expect(
    row(page, 0).getByRole("checkbox", { name: /Paid/ }),
  ).not.toBeChecked();
  await row(page, 1)
    .getByRole("button", { name: "Check in", exact: true })
    .click();
  await row(page, 1)
    .getByRole("button", { name: "Details", exact: true })
    .click();
  await action(page, "correction").click();
  await page
    .getByLabel("Correct status", { exact: true })
    .selectOption("Expected");
  await page
    .getByLabel("What happened and what should change?")
    .fill("Tapped Noah before he arrived.");
  await page
    .getByRole("button", { name: "Request correction", exact: true })
    .click();
  await approveReview(page, "Attendance correction: Noah Thompson");
  await role(page, "staff");
  await action(page, "roster").click();
  await expect(row(page, 1).locator(".sd-attendance")).toHaveText("Expected");
  await page.locator('#sd-staff-nav [data-view="tasks"]').click();
  await action(page, "incident").click();
  await page
    .getByLabel("What happened?", { exact: true })
    .fill("Fictional glue spill.");
  await page
    .getByLabel("Immediate action taken")
    .fill("Cleaned table; everyone safe.");
  await page.getByRole("button", { name: "Send incident to manager" }).click();
  await approveReview(page, "Incident: Amelia Brooks");
  await role(page, "staff");
  await page.locator('#sd-staff-nav [data-view="messages"]').click();
  await action(page, "reply").click();
  await page.getByRole("button", { name: "Record simulated send" }).click();
  await expect(page.locator(".sd-message")).toContainText("We provide aprons");
  await page.locator('#sd-staff-nav [data-view="tasks"]').click();
  await action(page, "upload").click();
  await page.getByLabel("Amelia Brooks", { exact: true }).check();
  await page.getByRole("button", { name: "Add private sample" }).click();
  await role(page, "manager");
  await page.locator('#sd-manager-nav [data-view="growth"]').click();
  await action(page, "photo-review").click();
  await expect(
    page.getByRole("button", { name: "Approve for public simulation" }),
  ).toBeDisabled();
  await action(page, "growth").click();
  await action(page, "upload").click();
  await page.getByRole("button", { name: "Add private sample" }).click();
  await page
    .locator(".sd-panel")
    .filter({ hasText: "Artwork only" })
    .getByRole("button", { name: "Review public permission" })
    .click();
  await page
    .getByRole("button", { name: "Approve for public simulation" })
    .click();
  await action(page, "public-post").click();
  await page.getByRole("button", { name: "Record simulated send" }).click();
  expect((await practice(page)).messages).toHaveLength(2);
  await page.locator('#sd-manager-nav [data-view="money"]').click();
  await action(page, "processor").click();
  await page.getByRole("button", { name: "Record simulated payment" }).click();
  await action(page, "expense").click();
  await page
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await expect(page.locator("#sd-content")).toContainText("$18.50");
  const state = await practice(page);
  expect(state.expenses[0].amount).toBe(18.5);
  expect(state.audit.some((e) => e.kind === "Attendance correction")).toBe(
    true,
  );
  expect(state.audit.some((e) => e.kind === "Check-in")).toBe(true);
  expect(state.sessions[0].roster[0].payment.source).toBe(
    "Processor simulation",
  );
  await action(page, "reset").click();
  await action(page, "reset-confirm").click();
  expect((await practice(page)).audit).toHaveLength(0);
  expect(await page.evaluate(() => (window as any).appCsp)).toEqual([]);
  await page.screenshot({
    path: info.outputPath("manager-today.png"),
    fullPage: true,
  });
});

test("phone search and print layout remain readable; separate browser pages have independent practice", async ({
  page,
  context,
}, info) => {
  await page.goto("/studio-design");
  await prepare(page);
  await page
    .getByLabel("Find a student", { exact: true })
    .pressSequentially("Montgomery");
  await expect(page.locator(".sd-student")).toHaveCount(1);
  await expect(page.locator(".sd-student")).toContainText(
    "Isabella-Rose Montgomery-Wellington",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const targets = await page
    .locator("button:visible, .sd-check:visible")
    .evaluateAll((elements) =>
      elements.map((e) => ({
        tag: e.tagName,
        height: e.getBoundingClientRect().height,
      })),
    );
  expect(targets.filter((t) => t.height < 44)).toEqual([]);
  await page.screenshot({
    path: info.outputPath("phone-roster.png"),
    fullPage: true,
  });
  const second = await context.newPage();
  await second.goto("/studio-design");
  expect((await practice(second)).sessions[0].phase).toBe("Preparing");
  await action(page, "print").click();
  await expect(page.locator(".sd-paper tbody tr")).toHaveCount(32);
  if (info.project.use.browserName === "chromium") {
    await page.pdf({
      path: info.outputPath("staff-backup.pdf"),
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    });
  }
  await second.close();
});
