# One-time helper: builds the phone version of the lettering, with "under" stacked on
# top of "construction" so each word can be drawn bigger on a narrow screen.
#
# Usage (from the portfolio folder, needs Pillow):
#   python3 scripts/stack-lettering.py
#
# Every frame of assets/under-construction.png is cut through the stroke that joins the
# two words, and the halves are stacked, so the timing is unchanged: "under" still draws
# first, then "construction". The cut ends fade out so the stroke doesn't stop abruptly.

from PIL import Image, ImageSequence

SRC = "assets/under-construction.png"
OUT = "assets/under-construction-stacked.png"
CUT = 950    # x where the joining stroke is cut (between the end of "under" and the "c")
FADE = 60    # px over which each cut end fades out
GAP = -30    # vertical space between the rows (negative tucks them closer together)


def fade(img, side):
    """Fade the image's alpha to 0 toward its left or right edge."""
    w, h = img.size
    mask = Image.new("L", (w, h), 255)
    for i in range(FADE):
        x = w - 1 - i if side == "right" else i
        mask.paste(round(255 * i / FADE), (x, 0, x + 1, h))
    alpha = Image.composite(img.getchannel("A"), Image.new("L", (w, h), 0), mask)
    img.putalpha(alpha)
    return img


src = Image.open(SRC)
w, h = src.size
top_w, bottom_w = CUT, w - CUT
out_w, out_h = max(top_w, bottom_w), h * 2 + GAP

frames, durations = [], []
for frame in ImageSequence.Iterator(src):
    durations.append(frame.info["duration"])
    frame = frame.convert("RGBA")
    under = fade(frame.crop((0, 0, CUT, h)), "right")
    construction = fade(frame.crop((CUT, 0, w, h)), "left")
    stacked = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    stacked.alpha_composite(under, ((out_w - top_w) // 2, 0))
    stacked.alpha_composite(construction, ((out_w - bottom_w) // 2, h + GAP))
    frames.append(stacked)

frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=durations,
               loop=src.info.get("loop", 0), disposal=0, blend=0)
print(f"wrote {OUT} ({out_w}x{out_h}, {len(frames)} frames)")
