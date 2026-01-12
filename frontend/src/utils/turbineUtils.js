// Helper functions for TurbineDetails

export function getLocalDateString(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Finds closest index in an array of Date objects for a given totalMinutes
 * @param {Date[]} labels - array of Date objects
 * @param {number} totalMinutes - minutes since midnight
 * @param {function} getMinutesFn - optional function to get minutes from label
 */
export function findClosestIndex(labels, totalMinutes, getMinutesFn) {
  let closestIndex = 0;
  let minDiff = Infinity;

  labels.forEach((label, index) => {
    const minutes = getMinutesFn
      ? getMinutesFn(label)
      : label.getHours() * 60 + label.getMinutes();
    const diff = Math.abs(minutes - totalMinutes);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = index;
    }
  });

  return closestIndex;
}
