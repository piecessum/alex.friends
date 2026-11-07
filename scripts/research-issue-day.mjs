export function issueDay(input = "", message = "", now = new Date()) {
  let day = input || message.match(/^research: prepare (\d{4}-\d{2}-\d{2})$/)?.[1];
  if (!day) {
    const msk = new Date(now.getTime() + 3 * 3600_000);
    if (msk.getUTCHours() >= 12) msk.setUTCDate(msk.getUTCDate() + 1);
    day = msk.toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day) throw new Error("Invalid issue day");
  return day;
}
