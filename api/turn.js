// Returns short-lived TURN relay details so calls work across strict networks (e.g. school Wi-Fi).
// Set ONE of these in Vercel → Settings → Environment Variables:
//   Metered Open Relay (free, 20 GB/month): METERED_APP (e.g. "cipher") and METERED_API_KEY
//   Cloudflare (free, 1,000 GB/month):      CF_TURN_KEY_ID and CF_TURN_API_TOKEN
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
    if (e.CF_TURN_KEY_ID && e.CF_TURN_API_TOKEN) {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${e.CF_TURN_KEY_ID}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${e.CF_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 43200 })
      });
      if (r.ok) { const j = await r.json(); return res.status(200).json({ iceServers: Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers] }); }
    }
  } catch (err) {}
  res.status(200).json({ iceServers: null });
};
