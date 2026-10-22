// Fills the footer's bottom-left slot with a spinning vinyl of today's most-played song.
// Data comes from /api/top-track (see api/top-track.js). If anything fails, the slot stays empty.

(async function showTopTrack() {
  const slot = document.querySelector('.now-playing');
  if (!slot) return;

  let song;
  try {
    const res = await fetch('/api/top-track');
    if (!res.ok) return;
    song = await res.json();
  } catch {
    return;  // e.g. opened as a local file, or Spotify is down
  }
  if (!song || !song.title) return;

  const record = document.createElement('a');
  record.className = 'record';
  record.href = song.url;
  record.target = '_blank';
  record.rel = 'noopener';
  record.setAttribute('aria-label', `${song.label}: ${song.title} by ${song.artist}, on Spotify`);

  const vinyl = document.createElement('div');
  vinyl.className = 'vinyl';
  if (song.art) {
    const art = document.createElement('img');
    art.src = song.art;
    art.alt = '';
    vinyl.appendChild(art);
  }

  const track = document.createElement('div');
  track.className = 'track';
  for (const [cls, text] of [
    ['track-label', song.label],
    ['track-title', song.title],
    ['track-artist', song.artist],
  ]) {
    const line = document.createElement('span');
    line.className = cls;
    line.textContent = text;
    track.appendChild(line);
  }

  record.append(vinyl, track);
  slot.appendChild(record);
  requestAnimationFrame(() => record.classList.add('loaded'));  // fade in
})();
