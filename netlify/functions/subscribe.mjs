/**
 * Netlify Function: subscribe
 * Endpoint: /.netlify/functions/subscribe  (POST)
 *
 * Accepts { email: string } and adds the subscriber to a Brevo list.
 * Uses Double Opt-in (DOI) when BREVO_DOI_TEMPLATE_ID > 0.
 * All Brevo credentials live in environment variables — never in the client bundle.
 *
 * Set these in the Netlify dashboard → Site Settings → Environment Variables:
 *   BREVO_API_KEY          — your Brevo API key (v3)
 *   BREVO_LIST_ID          — numeric ID of your Newsletter list (default: 3)
 *   BREVO_DOI_TEMPLATE_ID  — DOI email template ID, or 0 for single opt-in
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  // --- Parse & validate ---
  let email;
  try {
    const body = JSON.parse(event.body ?? '{}');
    email = (body.email ?? '').toString().trim().toLowerCase();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  // --- Config from Netlify environment ---
  const API_KEY = process.env.BREVO_API_KEY;
  const LIST_ID = Number(process.env.BREVO_LIST_ID ?? 3);
  const DOI_TEMPLATE_ID = Number(process.env.BREVO_DOI_TEMPLATE_ID ?? 0);

  if (!API_KEY || API_KEY === 'YOUR_BREVO_API_KEY_HERE') {
    // Local dev: no key configured — return a simulated success so the UI works
    console.warn('[subscribe] BREVO_API_KEY not set — simulating success for local dev.');
    return json({ success: true, dev: true });
  }

  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': API_KEY,
  };

  try {
    let res;

    if (DOI_TEMPLATE_ID > 0) {
      // ── Double Opt-in flow (GDPR-recommended) ──────────────────────────────
      res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          includeListIds: [LIST_ID],
          templateId: DOI_TEMPLATE_ID,
          redirectionUrl: 'https://spiritualshieldsystem.com/thank-you',
        }),
      });
    } else {
      // ── Single opt-in fallback ─────────────────────────────────────────────
      res = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          listIds: [LIST_ID],
          updateEnabled: true, // silently re-subscribes existing contacts
        }),
      });
    }

    // 204 No Content = DOI email queued successfully
    if (res.status === 204 || res.ok) {
      return json({ success: true });
    }

    const data = await res.json().catch(() => ({}));

    // Already subscribed — treat as success to avoid email enumeration
    if (data?.code === 'duplicate_parameter') {
      return json({ success: true });
    }

    console.error('[subscribe] Brevo error:', res.status, data);
    return json({ error: 'Subscription failed. Please try again later.' }, 500);
  } catch (err) {
    console.error('[subscribe] Network error:', err);
    return json({ error: 'Network error. Please check your connection and try again.' }, 503);
  }
};

