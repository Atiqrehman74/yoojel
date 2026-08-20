// Models have no inherent way to know "today's" date -- without this
// injected into the system prompt, they guess from training data (which is
// exactly what caused Yoojel to answer "17 July 2025" for a mid-2026 date).
export function currentDateLine(): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return `Today's date is ${dateStr} (UTC).`;
}
