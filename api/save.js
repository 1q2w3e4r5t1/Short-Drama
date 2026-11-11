// Vercel serverless function: saves one participant's data to Vercel Blob.
// Each session has one file per stage, e.g. sessions/<session_id>/5_final.json.
// A later stage contains all data from earlier stages, so the download script
// only needs the furthest stage for each session.
import { put } from "@vercel/blob";

const STAGES = {
  consent_declined: 0,
  ineligible: 1,
  opening: 2,
  video: 3,
  survey: 4,
  final: 5,
};

const MAX_BYTES = 3_500_000; // stay below Vercel's 4.5 MB request limit

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body = req.body;
  try {
    if (typeof body === "string") body = JSON.parse(body);
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid JSON" });
  }

  const { session_id, stage, data, meta } = body || {};

  if (typeof session_id !== "string" || !/^[A-Za-z0-9_-]{6,64}$/.test(session_id)) {
    return res.status(400).json({ ok: false, error: "Invalid session_id" });
  }
  if (!(stage in STAGES)) {
    return res.status(400).json({ ok: false, error: "Invalid stage" });
  }
  if (!Array.isArray(data)) {
    return res.status(400).json({ ok: false, error: "Data must be an array of trials" });
  }

  const payload = JSON.stringify({
    session_id,
    stage,
    stage_order: STAGES[stage],
    saved_at: new Date().toISOString(),
    meta: meta || {},
    data,
  });

  if (Buffer.byteLength(payload) > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: "Payload too large" });
  }

  try {
    const pathname = `sessions/${session_id}/${STAGES[stage]}_${stage}.json`;
    await put(pathname, payload, {
      access: process.env.BLOB_ACCESS || "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save failed", err);
    return res.status(500).json({ ok: false, error: "Storage error" });
  }
}
