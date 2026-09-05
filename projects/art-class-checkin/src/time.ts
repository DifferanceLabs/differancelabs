export function businessDate(zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function displayTime(value: string | null | undefined, zone: string) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not recorded";
}
export function clockTime(value: string | null | undefined, zone: string) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "";
}
export function localInput(value: string | null | undefined, zone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute;
}
// Enumerate UTC offsets instead of trusting the device's timezone. Reject DST gaps
// and require an explicit occurrence for repeated local times.
export function resolveLocal(
  value: string,
  zone: string,
  occurrence = "",
): string | null {
  if (!value) return null;
  const approximate = Date.parse(value + "Z"),
    matches: string[] = [];
  if (!Number.isFinite(approximate))
    throw new Error("Enter a valid date and time.");
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const instant = new Date(approximate - offset * 60000).toISOString();
    if (localInput(instant, zone) === value) matches.push(instant);
  }
  matches.sort();
  if (!matches.length)
    throw new Error(
      "That local time does not exist because of daylight saving time.",
    );
  if (matches.length > 1 && !occurrence)
    throw new Error(
      "That time occurs twice because of daylight saving time. Choose the first or second occurrence.",
    );
  return occurrence === "second" ? matches.at(-1)! : matches[0];
}
