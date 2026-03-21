/**
 * test-supabase.mjs
 * Test anonymous lead inserts Without RETURNING
 */

import { readFileSync } from 'fs';

try {
  const raw = readFileSync('.env', 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.replace(/\r/g, '').trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
} catch { /* fall through to process.env */ }

async function main() {
  const URL = process.env.PUBLIC_SUPABASE_URL;
  const KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

  console.log('🔗 URL :', URL ?? '(not set)');
  console.log('🔑 KEY :', KEY ? KEY.slice(0, 20) + '…' : '(not set)');

  if (!URL || !KEY) {
    console.error('\n❌ Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  const BASE = `${URL}/rest/v1`;
  const AUTH = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  const JSON_HEADERS = { ...AUTH, 'Content-Type': 'application/json' }; // NO return=representation

  console.log('\n[1/1] Inserting test lead…');
  const testEmail = `test-${Date.now()}@supabase-check.local`;

  const r1 = await fetch(`${BASE}/leads`, {
    method: 'POST', headers: JSON_HEADERS,
    body: JSON.stringify({ email: testEmail, name: 'Test Script', source: 'test_script' })
  });

  if (!r1.ok) {
    const b1 = await r1.json().catch(() => ({}));
    console.error(`  ❌ Insert failed (HTTP ${r1.status})`, b1);
    process.exit(1);
  } else {
    console.log(`  ✅ Inserted successfully (HTTP ${r1.status}) — email: ${testEmail}`);
    console.log(`\n🎉 TEST PASSED — Supabase is connected and RLS allows anonymous inserts!`);
    console.log(`Note: We do not read-back or delete the row because anon users shouldn't have SELECT/DELETE permissions.`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
