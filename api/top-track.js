// Vercel serverless function: GET /api/top-track
// Returns the song played most today (from the last 50 Spotify plays),
// or the last-played song if nothing has been played yet today.
//
// Needs these environment variables in Vercel (Settings → Environment Variables):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
//   TIMEZONE (optional, defaults to America/New_York) — decides when "today" starts

const TIMEZONE = process.env.TIMEZONE || 'America/New_York';

async function getAccessToken() {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status}`);
  return (await res.json()).access_token;
}

// "2026-10-22" for a date, in the configured time zone
const dayKey = date =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);

function toSong(track, extra) {
  return {
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    art: (track.album.images[1] || track.album.images[0] || {}).url || null,
    url: track.external_urls.spotify,
    ...extra,
  };
}

module.exports = async (req, res) => {
  try {
    const token = await getAccessToken();
    const r = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=50',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!r.ok) throw new Error(`recently-played failed: ${r.status}`);
    const { items = [] } = await r.json();
    if (!items.length) return res.status(204).end();

    const today = dayKey(new Date());
    const todays = items.filter(i => dayKey(new Date(i.played_at)) === today);

    let song;
    if (todays.length) {
      // count plays per track; ties go to the more recently played one
      // (items are newest first, so the first one seen wins a tie)
      const counts = new Map();
      for (const { track } of todays) {
        const c = counts.get(track.id);
        counts.set(track.id, c ? { ...c, plays: c.plays + 1 } : { track, plays: 1 });
      }
      let best = null;
      for (const c of counts.values()) if (!best || c.plays > best.plays) best = c;
      song = toSong(best.track, { plays: best.plays, label: 'on repeat' });
    } else {
      song = toSong(items[0].track, { plays: 0, label: 'last played' });
    }

    // let Vercel's CDN cache it for 5 minutes so Spotify isn't hit on every visit
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(song);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'spotify unavailable' });
  }
};
