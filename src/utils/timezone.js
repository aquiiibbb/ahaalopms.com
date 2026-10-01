// System Date & Time Helper (Always Detects Local Machine Date & Time)

export function getUSATimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "System Local";
  } catch {
    return "System Local";
  }
}

export function setUSATimeZone() {}

// Returns today's date formatted as YYYY-MM-DD using native local machine date
export function getUSATodayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Returns current timestamp using native local machine time
export function getUSANowISO() {
  const now = new Date();
  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// Formats date or timestamp string using native local machine time
export function formatUSADateTime(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatUSADate(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}
