// First-touch lead attribution (browser only). The campaign tags are on the URL the
// visitor LANDED on, not the form page, so they are captured on the first page view
// and read back at submit. sessionStorage can be unavailable (private mode, blocked
// storage) — every access is guarded and attribution is simply omitted then.

const KEY = "sgs_attribution";

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

function fromLocation(): Attribution {
  const p = new URLSearchParams(window.location.search);
  const a: Attribution = {};
  const s = p.get("utm_source");
  const m = p.get("utm_medium");
  const c = p.get("utm_campaign");
  if (s) a.utmSource = s.slice(0, 120);
  if (m) a.utmMedium = m.slice(0, 120);
  if (c) a.utmCampaign = c.slice(0, 200);
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.host !== window.location.host) a.referrer = ref.host;
  } catch {
    /* unparseable referrer — skip it */
  }
  return a;
}

/** Call on every page view; keeps the FIRST touch of the session. */
export function captureAttribution(): void {
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, JSON.stringify(fromLocation()));
  } catch {
    /* storage blocked */
  }
}

export function getAttribution(): Attribution {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) return JSON.parse(stored) as Attribution;
  } catch {
    /* storage blocked or corrupt */
  }
  return typeof window === "undefined" ? {} : fromLocation();
}
