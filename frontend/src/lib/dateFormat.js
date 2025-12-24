export const dateFormat = (date) => {
  if (!date) return "";
  // iu chnh thi gian sang GMT+7 (cng 7 gi) ri format vi UTC
  const original = new Date(date);
  const adjusted = new Date(original.getTime() + 7 * 60 * 60 * 1000);

  return adjusted.toLocaleString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
};
