// Fills the footer's middle line with when the site was last changed, e.g.
// "last updated oct 23, 4:23 am" (east coast time, like the clock), linking to the commit history.
// Data comes from /api/last-updated (see api/last-updated.js). If anything fails, the line stays empty.

(async function showLastUpdated() {
  const slot = document.querySelector('.updated');
  if (!slot) return;

  let info;
  try {
    const res = await fetch('/api/last-updated');
    if (!res.ok) return;
    info = await res.json();
  } catch {
    return;  // e.g. opened as a local file, or GitHub is down
  }
  if (!info || !info.date) return;

  const when = new Date(info.date);
  const zone = { timeZone: 'America/New_York' };
  const day = new Intl.DateTimeFormat('en-US', { ...zone, month: 'short', day: 'numeric' }).format(when);
  const time = new Intl.DateTimeFormat('en-US', { ...zone, hour: 'numeric', minute: '2-digit' }).format(when);

  const link = document.createElement('a');
  link.href = info.url;
  link.target = '_blank';
  link.rel = 'noopener';
  const label = document.createElement('em');  // italic label, like "interested in:"
  label.textContent = 'last updated';
  link.append(label, ` ${day}, ${time}`.toLowerCase());
  slot.appendChild(link);
  requestAnimationFrame(() => slot.classList.add('loaded'));  // fade in
})();
