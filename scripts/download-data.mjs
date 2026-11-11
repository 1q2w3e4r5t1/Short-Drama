// ============================================================
// Download all study data from Vercel Blob and build CSV files.
// Usage (in the project folder):
//   1) vercel env pull .env.local     (gets BLOB_READ_WRITE_TOKEN)
//   2) npm run download
// Output (in ./data):
//   raw/<session_id>.json     furthest saved stage for each session
//   participants.csv          one row per participant (answers + scores)
//   screenshots/<session_id>/ uploaded screen-time screenshots
// ============================================================
import { list, get } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";

// ---------- Read the token from .env.local if needed ----------
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN not found. Run `vercel env pull .env.local` first.");
  process.exit(1);
}
const access = process.env.BLOB_ACCESS || "private";

const OUT = "data";
fs.mkdirSync(path.join(OUT, "raw"), { recursive: true });
fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const res = await list({ prefix, cursor, limit: 1000, token });
    blobs.push(...res.blobs);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function download(pathname) {
  const res = await get(pathname, { access, token });
  if (!res || res.statusCode !== 200) throw new Error("Could not read " + pathname);
  return Buffer.from(await new Response(res.stream).arrayBuffer());
}

// ---------- Helpers ----------
const num = (x) => (x === undefined || x === null || x === "" || isNaN(Number(x)) ? null : Number(x));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const round = (x, d = 2) => (x === null || x === undefined ? null : Math.round(x * 10 ** d) / 10 ** d);

// Sum only when every item is answered (otherwise blank).
function total(r, names) {
  const v = names.map((n) => num(r[n]));
  return v.some((x) => x === null) ? null : v.reduce((s, x) => s + x, 0);
}
// Mean of answered items when at least half are answered.
function meanScore(r, names, reverse = [], max = 5) {
  const v = names
    .map((n) => {
      const x = num(r[n]);
      if (x === null) return null;
      return reverse.includes(n) ? max + 1 - x : x;
    })
    .filter((x) => x !== null);
  return v.length >= Math.ceil(names.length / 2) ? round(mean(v)) : null;
}
const seq = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`);

function toCSV(rows) {
  const cols = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => cols.includes(k) || cols.push(k)));
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

// ---------- Build one participant row ----------
function buildRow(file) {
  const trials = file.data || [];
  const meta = file.meta || {};
  const first = trials[0] || {};
  const row = {
    session_id: file.session_id,
    furthest_stage: file.stage,
    saved_at: file.saved_at,
    condition: first.condition ?? null,
    condition_forced: first.condition_forced ?? null,
    device_type: meta.device_type,
    touch: meta.touch,
    screen_w: meta.screen_w,
    screen_h: meta.screen_h,
    prolific_pid: meta.prolific_pid,
    wave: meta.wave,
    debug: meta.debug,
    minutes_total: trials.length ? round(trials[trials.length - 1].time_elapsed / 60000, 1) : null,
  };

  // All survey answers (variable names are unique across pages).
  const r = {};
  trials.forEach((t) => {
    if (t.trial_type === "survey-html-form" && t.response && typeof t.response === "object") {
      Object.assign(r, t.response);
      row[`rt_page_${t.page}`] = round(t.rt / 1000, 1);
    }
  });

  // Video trial
  const v = trials.find((t) => t.page === "video");
  if (v) {
    Object.assign(row, {
      video_completed: v.video_completed,
      video_seconds_watched: v.seconds_watched,
      video_failed: v.video_failed,
      video_error: v.video_error,
      video_placeholder: v.placeholder,
    });
  }

  row.crisis_page_shown = trials.some((t) => t.page === "crisis_info");

  // Raw answers
  Object.assign(row, r);

  // Scores
  const phq = total(r, seq("phq", 9));
  const gad = total(r, seq("gad", 7));
  Object.assign(row, {
    score_phq9: phq,
    score_gad7: gad,
    score_ucla3: total(r, seq("ucla", 3)),
    score_bsmas: total(r, seq("bsmas", 6)),
    score_escapism: meanScore(r, seq("esc", 3)),
    score_emo_comp: meanScore(r, seq("ec", 3)),
    score_connect: meanScore(r, seq("conn", 3), ["conn_3"]),
    score_belong: meanScore(r, seq("bel", 3), ["bel_3"]),
    score_boredom: meanScore(r, ["bore_1", "bore_2"]),
    score_emptiness: meanScore(r, ["empty_1", "empty_2"]),
    stressor_count: (() => {
      const ls = ["ls_job", "ls_money", "ls_illness", "ls_loss", "ls_breakup", "ls_move", "ls_conflict", "ls_pressure"];
      const vals = ls.map((n) => r[n]).filter((x) => x === "0" || x === "1");
      return vals.length ? vals.filter((x) => x === "1").length : null;
    })(),
    attn_1_pass: r.attn_1 === undefined ? null : r.attn_1 === "2",
    attn_2_pass: r.attn_2 === undefined ? null : r.attn_2 === "2",
  });
  ["stressed", "sad", "lonely", "relaxed"].forEach((k) => {
    const pre = num(r[`pre_${k}`]);
    const post = num(r[`post_${k}`]);
    row[`mood_change_${k}`] = pre !== null && post !== null ? post - pre : null;
  });
  // Short drama days: nonviewers get 0 minutes per viewing day
  const days = num(r.sd_days30);
  row.sd_viewer = days === null ? null : days > 0;
  return row;
}

// ---------- Main ----------
const sessionBlobs = await listAll("sessions/");
const furthest = new Map(); // session -> blob with highest stage number
for (const b of sessionBlobs) {
  const m = b.pathname.match(/^sessions\/([^/]+)\/(\d+)_([a-z_]+)\.json$/);
  if (!m) continue;
  const [, sid, order] = m;
  const prev = furthest.get(sid);
  if (!prev || Number(order) > prev.order) furthest.set(sid, { order: Number(order), pathname: b.pathname });
}
console.log(`Found ${furthest.size} sessions.`);

const rows = [];
for (const [sid, { pathname }] of furthest) {
  try {
    const buf = await download(pathname);
    fs.writeFileSync(path.join(OUT, "raw", `${sid}.json`), buf);
    const file = JSON.parse(buf.toString("utf8"));
    rows.push(buildRow(file));
  } catch (err) {
    console.warn("Skipped", pathname, err.message);
  }
}

rows.sort((a, b) => String(a.saved_at).localeCompare(String(b.saved_at)));
fs.writeFileSync(path.join(OUT, "participants.csv"), "﻿" + toCSV(rows));
console.log(`Wrote data/participants.csv (${rows.length} rows).`);

// Screenshots
const shots = await listAll("screenshots/");
for (const b of shots) {
  const target = path.join(OUT, b.pathname);
  if (fs.existsSync(target)) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    fs.writeFileSync(target, await download(b.pathname));
  } catch (err) {
    console.warn("Skipped", b.pathname, err.message);
  }
}
console.log(`Screenshots: ${shots.length} file(s) in data/screenshots/.`);
