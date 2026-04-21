declare const __APP_BUILD__: string;

const MAX_ERRORS = 50;
const STORAGE_KEY = "diagravinci-errors";

function saveError(entry: Record<string, unknown>) {
  try {
    const existing: unknown[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    existing.push({
      ...entry,
      ts: new Date().toISOString(),
      build: typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "dev",
      ua: navigator.userAgent,
    });
    if (existing.length > MAX_ERRORS) existing.splice(0, existing.length - MAX_ERRORS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // storage may be full or unavailable — silently ignore
  }
}

export function installErrorTracking() {
  window.onerror = (_message, source, lineno, colno, error) => {
    saveError({
      type: "uncaught",
      message: String(_message),
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    saveError({
      type: "unhandled-rejection",
      reason: String(event.reason),
      stack: (event.reason as Error)?.stack,
    });
  };
}
