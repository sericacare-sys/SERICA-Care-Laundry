/**
 * SERICA Care — Vercel Serverless Function
 * POST /api/early-access
 *
 * Validates incoming early-access registrations and forwards them
 * to Google Apps Script, which writes the row to Google Sheets.
 *
 * Environment variables required (set in Vercel dashboard, never committed):
 *   GOOGLE_APPS_SCRIPT_URL   — the /exec endpoint of the deployed GAS Web App
 *   LEAD_SHARED_SECRET       — the shared secret GAS checks to authenticate requests
 */

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_BODY_BYTES    = 4096;        // ~4 KB body size limit
const UPSTREAM_TIMEOUT  = 15_000;     // 15 s before we give up on GAS

// ── Validation helpers ───────────────────────────────────────────────────────

/**
 * Sanitise and validate the Full Name field.
 * Returns { value, error } where error is null on success.
 */
function validateFullName(raw) {
  if (typeof raw !== 'string') {
    return { value: '', error: 'Full name is required.' };
  }

  // Trim edges, collapse internal whitespace to a single space
  const value = raw.trim().replace(/\s+/g, ' ');

  if (!value) {
    return { value, error: 'Full name is required.' };
  }
  if (value.length < 2) {
    return { value, error: 'Full name must be at least 2 characters.' };
  }
  if (value.length > 100) {
    return { value, error: 'Full name must not exceed 100 characters.' };
  }

  // Reject spreadsheet formula injection (=, +, -, @ at start)
  if (/^[=+\-@]/.test(value)) {
    return { value, error: 'Full name contains invalid characters.' };
  }

  return { value, error: null };
}

/**
 * Sanitise and validate the Instagram Username field.
 * Returns { value, error } where value is the normalised handle (no @, lowercase).
 */
function validateInstagram(raw) {
  if (typeof raw !== 'string') {
    return { value: '', error: 'Instagram username is required.' };
  }

  // Strip leading @ if present, then lowercase
  let handle = raw.trim();
  if (handle.startsWith('@')) handle = handle.slice(1);
  handle = handle.toLowerCase();

  if (!handle) {
    return { value: '', error: 'Instagram username is required.' };
  }
  if (handle.length > 30) {
    return { value: handle, error: 'Instagram username must not exceed 30 characters.' };
  }

  // Only letters, numbers, underscores, and periods
  if (!/^[a-z0-9._]+$/.test(handle)) {
    return {
      value: handle,
      error: 'Instagram username may only contain letters, numbers, periods, and underscores.',
    };
  }

  // Must not start or end with a period
  if (handle.startsWith('.') || handle.endsWith('.')) {
    return { value: handle, error: 'Instagram username cannot start or end with a period.' };
  }

  // Must not contain consecutive periods
  if (handle.includes('..')) {
    return { value: handle, error: 'Instagram username cannot contain consecutive periods.' };
  }

  return { value: handle, error: null };
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // ── CORS headers (Vercel static-site self-origin) ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle pre-flight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── Method guard ──
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  }

  // ── Environment variable guard ──
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  const SECRET  = process.env.LEAD_SHARED_SECRET;

  if (!GAS_URL || !SECRET) {
    // Log once server-side; never expose details to the browser
    console.error('[early-access] Missing environment variables: GOOGLE_APPS_SCRIPT_URL or LEAD_SHARED_SECRET');
    return res.status(503).json({
      ok: false,
      message: 'Service is temporarily unavailable. Please try again later.',
    });
  }

  // ── Body size guard ──
  // Vercel automatically parses JSON for Node.js functions via the runtime.
  // We still check the raw content-length header as a lightweight guard.
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ ok: false, message: 'Request body too large.' });
  }

  // ── Parse body ──
  // Vercel's Node.js runtime already parses JSON into req.body when
  // the Content-Type is application/json.
  const body = req.body || {};

  // ── Validate inputs ──
  const nameResult = validateFullName(body.fullName);
  const igResult   = validateInstagram(body.instagramUsername);

  if (nameResult.error || igResult.error) {
    return res.status(422).json({
      ok: false,
      message: nameResult.error || igResult.error,
      fieldErrors: {
        fullName:         nameResult.error  || null,
        instagramUsername: igResult.error   || null,
      },
    });
  }

  const cleanName = nameResult.value;
  const cleanIG   = igResult.value;    // normalised: no @, lowercase

  // ── Forward to Google Apps Script ──
  let gasResponse;
  let gasData;

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

    gasResponse = await fetch(GAS_URL, {
      method:   'POST',
      redirect: 'follow',              // GAS ContentService issues a redirect
      signal:   controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify({
        secret:          SECRET,       // attached server-side only
        fullName:        cleanName,
        instagramUsername: cleanIG,
      }),
    });

    clearTimeout(timeoutId);
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      console.error('[early-access] Upstream request timed out');
      return res.status(504).json({
        ok: false,
        message: 'We couldn\'t complete your registration. Please try again.',
      });
    }
    console.error('[early-access] Upstream fetch error:', fetchErr.message);
    return res.status(502).json({
      ok: false,
      message: 'We couldn\'t complete your registration. Please try again.',
    });
  }

  // ── Parse GAS response body ──
  try {
    const text = await gasResponse.text();

    // Guard against empty or non-JSON responses (HTML error pages, etc.)
    if (!text || text.trim().startsWith('<')) {
      console.error('[early-access] GAS returned non-JSON response (possibly an HTML error page)');
      return res.status(502).json({
        ok: false,
        message: 'We couldn\'t complete your registration. Please try again.',
      });
    }

    gasData = JSON.parse(text);
  } catch (parseErr) {
    console.error('[early-access] Failed to parse GAS response:', parseErr.message);
    return res.status(502).json({
      ok: false,
      message: 'We couldn\'t complete your registration. Please try again.',
    });
  }

  // ── Evaluate GAS result ──
  if (!gasData || gasData.ok !== true) {
    // GAS explicitly signalled failure
    console.error('[early-access] GAS returned ok !== true:', JSON.stringify(gasData));
    return res.status(500).json({
      ok: false,
      message: 'We couldn\'t complete your registration. Please try again.',
    });
  }

  // ── Success: new registration or duplicate ──
  if (gasData.alreadyRegistered === true) {
    return res.status(200).json({
      ok: true,
      alreadyRegistered: true,
    });
  }

  return res.status(200).json({
    ok: true,
    alreadyRegistered: false,
  });
}
