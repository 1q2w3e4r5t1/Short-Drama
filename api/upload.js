// Vercel serverless function: stores an optional screen-time screenshot.
// The browser compresses the image to JPEG before sending it as a data URL.
import { put } from "@vercel/blob";

const MAX_IMAGE_BYTES = 3_000_000;

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

  const { session_id, image } = body || {};

  if (typeof session_id !== "string" || !/^[A-Za-z0-9_-]{6,64}$/.test(session_id)) {
    return res.status(400).json({ ok: false, error: "Invalid session_id" });
  }

  const match = typeof image === "string" && image.match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ ok: false, error: "Image must be a JPEG or PNG data URL" });
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_IMAGE_BYTES) {
    return res.status(413).json({ ok: false, error: "Image too large" });
  }

  try {
    const ext = match[1] === "png" ? "png" : "jpg";
    const pathname = `screenshots/${session_id}/${Date.now()}.${ext}`;
    const result = await put(pathname, buffer, {
      access: process.env.BLOB_ACCESS || "private",
      contentType: `image/${match[1]}`,
      addRandomSuffix: false,
    });
    return res.status(200).json({ ok: true, pathname: result.pathname });
  } catch (err) {
    console.error("upload failed", err);
    return res.status(500).json({ ok: false, error: "Storage error" });
  }
}
