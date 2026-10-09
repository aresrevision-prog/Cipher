// Returns TURN relay details so calls work across strict networks (e.g. school Wi-Fi).
// Needs Vercel env vars: METERED_APP and METERED_API_KEY
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !origin.includes(req.headers.host)) return res.status(403).json({ iceServers: null });
  const e = process.env;
  try {
    if (e.METERED_APP && e.METERED_API_KEY) {
      const app = String(e.METERED_APP).replace(/\.metered\.live$/, '').replace(/^https?:\/\//, '');
      const r = await fetch(`https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(e.METERED_API_KEY)}`);
      if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length) return res.status(200).json({ iceServers: j }); }
    }
  } catch (err) {}
  res.status(200).json({ iceServers: null });
};
