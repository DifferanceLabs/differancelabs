import { test, expect, Page } from "@playwright/test";
import { localInput } from "../../src/time";
async function login(page: Page, role = "staff") {
  await page.goto("/");
  await page
    .getByRole("button", {
      name:
        role === "staff"
          ? "Enter demo as staff"
          : "Enter demo as app administrator",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Today at the studio" }),
  ).toBeVisible();
}
async function newRoster(page: Page) {
  await page.getByRole("button", { name: "New session", exact: true }).click();
  const date = new Date(Date.now() + Math.random() * 300000000000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Session date", { exact: true }).fill(date);
  await page
    .getByRole("button", { name: "Create session", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".class-strip")).toContainText(date);
  return {
    date,
    id: await page
      .getByLabel("Dated class session", { exact: true })
      .inputValue(),
  };
}
test("phone/tablet handoff, payment, second device, reload and paper print", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const { id: sessionValue } = await newRoster(page);
  const first = page.locator(".student-row").filter({
    has: page.getByRole("heading", { name: "Amelia Brooks", exact: true }),
  });
  await first.getByRole("checkbox", { name: "Paid for Amelia Brooks" }).click();
  await expect(first.getByText("Confirmed", { exact: true })).toBeVisible();
  await first.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(first.getByText("Present", { exact: true })).toBeVisible();
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  const other = await context.newPage();
  await login(other);
  await other
    .getByLabel("Dated class session", { exact: true })
    .selectOption(sessionValue!);
  await expect(
    other
      .locator(".student-row")
      .filter({ hasText: "Amelia Brooks" })
      .getByText("Present", { exact: true }),
  ).toBeVisible();
  await first.getByRole("button", { name: "Pick up", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.getByLabel("Known to staff", { exact: true }).check();
  await page
    .getByRole("button", { name: "Confirm release", exact: true })
    .click();
  await expect(first.getByText("Released", { exact: true })).toBeVisible();
  await expect(
    other
      .locator(".student-row")
      .filter({ hasText: "Amelia Brooks" })
      .getByText("Released", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page.reload();
  await page
    .getByLabel("Dated class session", { exact: true })
    .selectOption(sessionValue!);
  await expect(first.getByText("Released", { exact: true })).toBeVisible();
  await expect(first.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "Print backup", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open PDF" })).toHaveCount(2);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("heading", { name: /history/i })).toBeVisible();
  await page.getByLabel("Session", { exact: true }).selectOption(sessionValue!);
  await expect(
    page.getByText("Loading saved history…", { exact: true }),
  ).not.toBeVisible();
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("main *")]
      .filter((n) => n.getBoundingClientRect().right > window.innerWidth + 1)
      .map((n) => ({
        tag: n.tagName,
        cls: n.className,
        right: n.getBoundingClientRect().right,
      }))
      .slice(0, 8),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.width,
  );
  const short = await page
    .locator(
      "button,summary,select,input:not([type=checkbox]):not([type=radio])",
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const r = n.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.height < 44;
        })
        .map((n) => n.textContent?.slice(0, 40)),
    );
  expect(short).toEqual([]);
  await page.screenshot({
    path: "output/" + info.project.name + ".png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await context.close();
});
test("network loss and lost response never create false success or duplicate handoffs", async ({
  page,
}) => {
  await login(page);
  await newRoster(page);
  const row = page.locator(".student-row").filter({ hasText: "Aria Martinez" });
  let lose = true;
  await page.route("**/api/changes", async (route) => {
    if (!lose) return route.continue();
    lose = false;
    await route.fetch();
    await route.abort("failed");
  });
  await row.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(
    page.getByText("Check unconfirmed saves", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved on the server.", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Check save status", exact: true })
    .click();
  await expect(
    page.getByText("The server confirms that change was saved.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(row.getByText("Present", { exact: true })).toBeVisible();
  await page.context().setOffline(true);
  await row.getByRole("button", { name: "Pick up", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.getByLabel("Known to staff", { exact: true }).check();
  await page
    .getByRole("button", { name: "Confirm release", exact: true })
    .click();
  await expect(
    page.getByText(/server has not confirmed this change/).first(),
  ).toBeVisible();
  await expect(row.getByText("Released", { exact: true })).not.toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check connection", exact: true }),
  ).not.toBeVisible({ timeout: 10000 });
  await expect(row.getByText("Present", { exact: true })).toBeVisible();
});

test("paper form preserves actual times and supports audited history", async ({
  page,
}) => {
  await login(page);
  const { id } = await newRoster(page);
  const row = page.locator(".student-row").filter({ hasText: "Noah Thompson" });
  await row.locator("summary").click();
  await row
    .getByRole("button", { name: "Enter paper attendance", exact: true })
    .click();
  await page
    .getByLabel("Actual arrival", { exact: true })
    .fill(
      localInput(
        new Date(Date.now() - 7200000).toISOString(),
        "America/Chicago",
      ),
    );
  await page
    .getByLabel("Actual departure (leave blank if still present)", {
      exact: true,
    })
    .fill(
      localInput(
        new Date(Date.now() - 3600000).toISOString(),
        "America/Chicago",
      ),
    );
  await page
    .getByLabel("Pickup adult recorded on paper", { exact: true })
    .selectOption({ index: 1 });
  await page
    .getByLabel("Verification recorded on paper", { exact: true })
    .selectOption("Known to staff");
  await page
    .getByLabel("Handwritten staff initials (if available)", { exact: true })
    .fill("ME");
  await page
    .getByLabel("Paper records a payment confirmation", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Reconcile paper record", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(row.getByText("Released", { exact: true })).toBeVisible();
  await expect(row.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByLabel("Session", { exact: true }).selectOption(id);
  const record = page
    .locator(".history-card")
    .filter({ hasText: "Noah Thompson" });
  await expect(
    page.getByText("Loading saved history…", { exact: true }),
  ).not.toBeVisible();
  await expect(record).toHaveCount(1);
  await expect(record.locator(".audit-event summary")).toHaveCount(1);
  await record.locator(".audit-event summary").click();
  await expect(
    record.getByText("Actual event time", { exact: true }),
  ).toBeVisible();
  await expect(
    record.getByText("Recorded by / recorded time", { exact: true }),
  ).toBeVisible();
});

test("production shell caches no student APIs and reopens after logout", async ({
  page,
}) => {
  test.skip(!process.env.ART_BROWSER_BUILT, "Requires the built PWA server.");
  await login(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const keys = await Promise.all(
      names.map(async (n) =>
        (await (await caches.open(n)).keys()).map(
          (r) => new URL(r.url).pathname,
        ),
      ),
    );
    return keys.flat();
  });
  expect(cached.some((p) => p.startsWith("/api/"))).toBe(false);
  expect(cached).toContain("/index.html");
  await page.getByLabel("Account and app settings", { exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to the studio." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Enter demo as staff", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Amelia Brooks", exact: true }),
  ).not.toBeVisible();
});
