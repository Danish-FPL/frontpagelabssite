// settings.mjs — the daily caps and the few knobs the UI can turn.
//
// Env vars are the defaults; data/settings.json (gitignored) holds whatever
// was last saved from the settings popover and wins over env. Caps count NEW
// first touches per Chicago day; due follow-ups never consume them.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, '..', 'data', 'settings.json');

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : d;
};

export function defaultCaps() {
  return {
    total: num(process.env.FPL_CAP_TOTAL, 15),
    email: num(process.env.FPL_CAP_EMAIL, 7),
    linkedin: num(process.env.FPL_CAP_LINKEDIN, 4),
    instagram: num(process.env.FPL_CAP_INSTAGRAM, 3),
    call: num(process.env.FPL_CAP_CALL, 1),
  };
}

let cache = null;

export async function getSettings() {
  if (cache) return cache;
  let saved = {};
  try { saved = JSON.parse(await readFile(FILE, 'utf8')); } catch { /* first run */ }
  cache = { caps: { ...defaultCaps(), ...(saved.caps || {}) } };
  return cache;
}

export async function saveSettings(patch = {}) {
  const cur = await getSettings();
  const caps = { ...cur.caps };
  for (const k of Object.keys(caps)) {
    if (patch.caps && patch.caps[k] !== undefined) caps[k] = Math.min(500, num(patch.caps[k], caps[k]));
  }
  cache = { caps };
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(cache, null, 2) + '\n');
  return cache;
}
