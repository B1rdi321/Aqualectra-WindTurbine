export function ymdFromDate(date) {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Parse a "yyyy-mm-dd" string into a Date at local 00:00:00
export function parseYMDToLocalStart(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  // new Date(year, monthIndex, day) uses local timezone and sets time to 00:00 local
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Parse a "yyyy-mm-dd" string into a Date at local 23:59:59.999
export function parseYMDToLocalEnd(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function isSameLocalDay(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
