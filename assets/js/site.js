// Shared scripts for every page: the footer clock and the custom cursor

// East coast clock in the footer, e.g. "3:42:07 pm"
const clock = document.getElementById('clock');
const clockFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' });
function tick() {
  clock.textContent = clockFormat.format(new Date()).toLowerCase();
  setTimeout(tick, 1000 - Date.now() % 1000);  // update right on the second
}
tick();

// Custom cursor (mouse/trackpad only; touch devices keep their normal behavior).
// Over a button or link (or the burrito blanket, which shows a photo) it morphs into a rounded
// highlight around it, and over text into a slim vertical bar the height of the line, like
// the iPad pointer.
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot = document.createElement('div');
  dot.className = 'cursor';
  document.body.appendChild(dot);
  document.body.classList.add('has-cursor');

  const DOT = 12;         // dot size
  const PAD = 8;          // space around a snapped element
  const PULL = 0.12;      // how much the highlight leans toward the pointer
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // how much of the remaining distance to cover per 60fps frame (1 = instant): the free dot
  // keeps up with the pointer almost exactly, snapping on/off a button glides a little
  const FOLLOW = reduceMotion ? 1 : 0.75;  // position while free
  const SNAP = reduceMotion ? 1 : 0.3;     // position while snapped, and all shape changes

  let mouseX = 0, mouseY = 0, target = null, pressed = false;
  let text = null;  // { cy, h } of the line of text under the pointer, if any

  // the line of text right under the pointer: only over actual letters, not the empty space
  // around them (so the bar shows exactly where you can start a selection)
  function textLineAt(x, y) {
    let node;
    if (document.caretPositionFromPoint) node = document.caretPositionFromPoint(x, y)?.offsetNode;
    else if (document.caretRangeFromPoint) node = document.caretRangeFromPoint(x, y)?.startContainer;
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return null;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const line of range.getClientRects()) {
      if (x >= line.left - 1 && x <= line.right + 1 && y >= line.top && y <= line.bottom) {
        const size = parseFloat(getComputedStyle(node.parentElement).fontSize);
        return { cy: line.top + line.height / 2, h: Math.round(size * 1.15) };
      }
    }
    return null;
  }
  const cur = { cx: 0, cy: 0, w: DOT, h: DOT, r: DOT / 2 };  // tracked by center, so it morphs around the pointer
  let last = performance.now();

  addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    target = e.target.closest('a, button, .burrito');
    if (!dot.classList.contains('visible')) {
      cur.cx = mouseX; cur.cy = mouseY;
      dot.classList.add('visible');
    }
  });
  document.addEventListener('mouseleave', () => dot.classList.remove('visible'));
  addEventListener('mousedown', () => { pressed = true; });
  addEventListener('mouseup', () => { pressed = false; });

  (function frame(now = performance.now()) {
    // per-frame easing scaled by elapsed time, so it feels the same at 60Hz and 120Hz
    const dt = Math.min(now - last, 100) / (1000 / 60);
    last = now;
    const step = base => 1 - Math.pow(1 - base, dt);
    let goal;
    text = null;
    if (target) {
      // the Spotify vinyl snaps as a circle; everything else gets a rounded box
      const vinyl = target.classList.contains('vinyl');
      let b = target.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (vinyl) {  // the disc spins, which inflates its bounding box; use its real size around the same center
        const size = target.offsetWidth;
        b = { left: cx - size / 2, top: cy - size / 2, width: size, height: size };
      }
      goal = {
        cx: cx + (mouseX - cx) * PULL,
        cy: cy + (mouseY - cy) * PULL,
        w: b.width + PAD * 2,
        h: b.height + PAD * 2,
        r: vinyl ? (b.height + PAD * 2) / 2 : Math.min(14, (b.height + PAD * 2) / 2),
      };
    } else if ((text = textLineAt(mouseX, mouseY))) {
      // text: a slim bar that follows the pointer sideways but sits centered on the line
      goal = { cx: mouseX, cy: text.cy, w: 2.5, h: text.h, r: 1.25 };
    } else {
      goal = { cx: mouseX, cy: mouseY, w: DOT, h: DOT, r: DOT / 2 };
    }
    if (pressed && !text) {  // squeeze slightly on click (not the text bar, which you hold while selecting)
      const k = 0.92;
      goal.w *= k; goal.h *= k;
    }
    const move = step(target ? SNAP : FOLLOW), morph = step(SNAP);
    cur.cx += (goal.cx - cur.cx) * move;
    cur.cy += (goal.cy - cur.cy) * move;
    for (const key of ['w', 'h', 'r']) cur[key] += (goal[key] - cur[key]) * morph;
    dot.style.transform = `translate(${cur.cx - cur.w / 2}px, ${cur.cy - cur.h / 2}px)`;
    dot.style.width = cur.w + 'px';
    dot.style.height = cur.h + 'px';
    dot.style.borderRadius = cur.r + 'px';
    dot.classList.toggle('snapped', !!target);
    dot.classList.toggle('text', !target && !!text);
    requestAnimationFrame(frame);
  })();
}
