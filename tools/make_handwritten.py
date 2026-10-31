"""Render a synthetic handwritten contract as a phone photo of the page (use case UC7).

The case study says some old contracts exist only as JPEG files of handwritten pages. Such a
page has no text layer, and Tesseract reads handwriting badly. The pipeline must notice that
(mean OCR confidence below config.OCR_LOW_QUALITY_CONFIDENCE -> LOW_QUALITY, a human looks at
it, multimodal fallback, decision 10) instead of reporting "clause not found". This script
produces one such page, reproducibly: the same script always writes the same image (fixed seed).

What it simulates, in order:
1. Handwriting: a font repeats the same glyph, a hand never does. So three handwriting fonts
   are mixed per word and now and then per letter (Segoe Script is the main hand), every letter
   gets its own slant, height, size and baseline wobble, every word is bent by two smooth random
   warps (a fine one inside the letters, a slow one for the whole word), then a slight rotation,
   size change and baseline jump per word, uneven spacing, uneven ballpoint pressure and spots
   where the ball ran dry. Numbers (date, fee, days) are written carefully: main hand, no warp
   inside the letters, no dry spots - a reviewer must be able to read them.
2. Paper: off-white with a little texture, faint ruled lines, two scribbled signatures and the
   printed watermark footer that every synthetic page carries (project rule).
3. Photo: the page lies on a desk and is photographed slightly from above - perspective tilt,
   uneven light and vignette, a little blur, sensor noise, JPEG compression.

At the end it runs the pipeline's own OCR call (pipeline.ingest._ocr_image) on the result and
prints the mean confidence, so the claim is measured, not assumed. With Tesseract 5.4 (deu+eng)
this page scores 61 (seeds 1, 3, 7: 56-61), below the threshold of 70; the first version, one
script font with jitter per word only, scored 82 and read almost cleanly. A person can still
read every line.

The content is a short German merchant agreement from 2009 with the legacy provider name
"Arvato Financial Solutions GmbH", so it also belongs in the answer to "which contracts still
name a legacy company?".

Needs Windows: the handwriting fonts are the ones in C:/Windows/Fonts (Segoe Script, Segoe
Print, Ink Free). Byte-identical output also assumes the same Pillow, numpy and font versions
(built with Pillow 13.0.0, numpy 2.5.4); the script prints the sha256 to compare runs.

Usage: python tools/make_handwritten.py  (writes data/demo/H01.jpg -> document id H01 once it is
dropped into data/inbox; data/demo is not a source folder, so the gold set stays at 47 documents)
"""

from __future__ import annotations

import hashlib
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "demo" / "H01.jpg"   # not a source folder; copy it into data/inbox for the live demo
SEED = 42
WATERMARK = "SYNTHETIC TEST DOCUMENT – created for the Riverty case study – not a real contract"

FONTS = Path("C:/Windows/Fonts")
PRINT_FONT = FONTS / "arial.ttf"      # the watermark is printed, not handwritten
MAIN_HAND = FONTS / "segoesc.ttf"     # Segoe Script: cursive
HAND_FONTS = {      # font: (share of words, size factor and extra stroke width so the three hands match)
    MAIN_HAND: (0.70, 1.00, 0),
    FONTS / "segoepr.ttf": (0.20, 0.96, 0),   # Segoe Print: upright print letters
    FONTS / "Inkfree.ttf": (0.10, 0.92, 1),   # Ink Free: a quick hand with a thin line - thickened
}
CAREFUL = set("0123456789%_")         # numbers (date, fee, days) and signature lines: always the main hand
ON_LINE = set(".,:;_")                # punctuation stays on the baseline (a lifted dot reads as an i)

LINES = [
    "Händlervertrag über den Kauf auf Rechnung",
    "zwischen Arvato Financial Solutions GmbH (Anbieter)",
    "und Garnkiste Krüger e.K. (Händler)",
    "1. Der Anbieter bietet den Kunden des Händlers",
    "den Kauf auf Rechnung an und zieht die Beträge ein.",
    "2. Der Händler muss im Checkout seines Onlineshops",
    "die Verbraucherbedingungen des Anbieters anzeigen.",
    "3. Der Händler zahlt 3 % vom Bestellwert.",
    "Der Anbieter überweist die Beträge nach 14 Tagen.",
    "4. Der Vertrag läuft unbefristet und kann mit",
    "drei Monaten Frist gekündigt werden.",
    "5. Es gilt deutsches Recht.",
    "Datum: 17.03.2009",
    "für Arvato Financial Solutions GmbH: ______________",
    "für Garnkiste Krüger e.K.: ______________",
]
RULE_OF_LINE = [0, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 17, 19]   # empty rules = paragraph gaps
CONTINUATION = {4, 6, 8, 10}          # second line of a numbered clause: indented under the text
SIGNATURE_LINES = (13, 14)

PHOTO_SIZE = (1700, 2300)             # the JPEG
PAPER_SIZE = (1600, 2263)             # the flat page before the photo (A4 ratio)
PAPER_CORNERS = [(92, 58), (1628, 84), (1684, 2262), (22, 2236)]   # TL TR BR BL in the photo: top is farther away
PAPER_COLOR = (243, 240, 231)
RULE_COLOR = (150, 175, 205)
RULE_TOP, RULE_GAP, RULE_LAST_Y = 236, 96, 2100
MARGIN_LEFT, MARGIN_RIGHT, INDENT = 120, 60, 46

FONT_PX = 61                          # cap height ~50 px on the flat page, ~2.1 % of the photo height
TITLE_SCALE = 1.08
CONDENSE = (0.80, 0.86)               # people write narrower than the font; long lines get squeezed more
SUPERSAMPLE = 2                       # words are drawn at twice the size and shrunk: smooth warped edges
LETTER_SWAP = 0.15                    # chance that a letter is written in another hand than its word
SLANT = 0.05                          # the writer's slant (horizontal shear per unit of height) ...
SLANT_WORD, SLANT_LETTER = 0.06, 0.10   # ... varied per word and per letter (+/-)
LETTER_STRETCH = (0.92, 1.08)         # letter height factor
LETTER_SIZE = (0.94, 1.06)            # letter size factor
LETTER_WOBBLE = 3.0                   # px up or down per letter
LETTER_GAP = (-1.0, 2.5)              # px added after each letter (uneven spacing)
ELASTIC = (1.2, 2.0, 22)              # warp inside the letters: x and y amplitude, wavelength (px)
BEND = (1.5, 7.0, 80)                 # a slow warp: the word as a whole bends, mostly up and down
WORD_SIZE = (0.965, 1.035)            # size factor per word
WORD_TURN = 1.8                       # rotation per word (+/- degrees)
WORD_JUMP = 2.0                       # baseline jump per word (+/- px)
SKIP, SKIP_CELL, SKIP_INK = 0.12, 6, 0.4   # dry spots: share of the word, spot size (px), ink left
STROKE = [0, 0, 1]                    # pressure: stroke width added per word (supersampled px per side)
INK = (24, 44, 128)                   # ballpoint blue
WATERMARK_PX = 29
WATERMARK_COLOR = (55, 55, 60)
JPEG_QUALITY = 82

_font_cache: dict[tuple[Path, int], ImageFont.FreeTypeFont] = {}


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    if (path, size) not in _font_cache:
        _font_cache[(path, size)] = ImageFont.truetype(str(path), size)
    return _font_cache[(path, size)]


# --------------------------------------------------------------------------- handwriting

def pick_hand(rng: random.Random) -> Path:
    paths = list(HAND_FONTS)
    return rng.choices(paths, weights=[HAND_FONTS[p][0] for p in paths])[0]


def is_careful(word: str) -> bool:
    """A number such as 17.03.2009, 3, %, 14 (or a signature line): written slowly and clearly."""
    return set(word) <= CAREFUL | ON_LINE


def word_mask(word: str, size: int, rng: random.Random,
              np_rng: np.random.Generator) -> tuple[Image.Image, int, int, float]:
    """One word as an ink mask, drawn letter by letter at SUPERSAMPLE size and shrunk.
    Each letter: its own hand (sometimes), size, height, slant and baseline. Then the whole word
    is bent (elastic warps) and some words get a heavier line.
    Returns the mask, the x of the word start and the y of the baseline inside the mask, and the
    advance width of the word (the next word starts after it)."""
    ss = SUPERSAMPLE
    rule = set(word) == {"_"}                                # a signature line: one steady stroke
    hand = pick_hand(rng)
    slant = SLANT + rng.uniform(-SLANT_WORD, SLANT_WORD)
    big = font(hand, size * ss)
    ascent, descent = big.getmetrics()
    pad = size * ss // 2
    width = int(big.getlength(word) * 1.4 + 3 * ss * len(word)) + 2 * pad
    height = ascent + descent + 2 * pad
    base = pad + ascent
    mask = Image.new("L", (width, height), 0)
    x = float(pad)
    for ch in word:
        path = MAIN_HAND if ch in CAREFUL else pick_hand(rng) if rng.random() < LETTER_SWAP else hand
        f = font(path, round(size * ss * HAND_FONTS[path][1] * (1 if rule else rng.uniform(*LETTER_SIZE))))
        advance = f.getlength(ch)
        if ch == " " or advance == 0:
            x += advance
            continue
        lpad = int(size * ss * 0.6)
        letter = Image.new("L", (int(advance) + 2 * lpad, height), 0)
        dy = 0 if ch in ON_LINE else rng.uniform(-LETTER_WOBBLE, LETTER_WOBBLE) * ss
        ImageDraw.Draw(letter).text((lpad, base + dy), ch, font=f, fill=255, anchor="ls")
        if HAND_FONTS[path][2]:                              # same pen for every hand
            letter = letter.filter(ImageFilter.MaxFilter(2 * HAND_FONTS[path][2] + 1))
        k = slant + (0 if rule else rng.uniform(-SLANT_LETTER, SLANT_LETTER))
        sy = 1 if rule else rng.uniform(*LETTER_STRETCH)
        # affine around the baseline: shear by k, stretch the height by sy (coefficients map back)
        letter = letter.transform(letter.size, Image.AFFINE,
                                  (1, k / sy, -k * base / sy, 0, 1 / sy, base - base / sy), Image.BICUBIC)
        x0 = int(x) - lpad
        box = (x0, 0, x0 + letter.width, height)
        mask.paste(ImageChops.lighter(mask.crop(box), letter), box[:2])   # overlapping joins stay solid
        x += advance + (0 if rule else rng.uniform(*LETTER_GAP) * ss)
    for amp_x, amp_y, cell in ((BEND,) if is_careful(word) else (ELASTIC, BEND)):
        mask = elastic(mask, amp_x * ss, amp_y * ss, cell * ss, np_rng)
    stroke = rng.choice(STROKE)
    if stroke:
        mask = mask.filter(ImageFilter.MaxFilter(2 * stroke + 1))
    mask = mask.resize((width // ss, height // ss), Image.LANCZOS)
    return mask, pad // ss, base // ss, (x - pad) / ss


def elastic(mask: Image.Image, amp_x: float, amp_y: float, cell: float,
            np_rng: np.random.Generator) -> Image.Image:
    """Bend the word with a smooth random displacement field (random values on a coarse grid,
    interpolated bicubically): strokes curve a little differently in every letter."""
    a = np.asarray(mask, np.float32)
    h, w = a.shape
    grid = (max(2, round(h / cell) + 2), max(2, round(w / cell) + 2))
    dx, dy = (np.asarray(Image.fromarray(np_rng.normal(0, 1, grid).astype(np.float32)).resize((w, h), Image.BICUBIC))
              * amp for amp in (amp_x, amp_y))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sx = np.clip(xx + dx, 0, w - 1.001)
    sy = np.clip(yy + dy, 0, h - 1.001)
    x0, y0 = sx.astype(np.int32), sy.astype(np.int32)
    fx, fy = sx - x0, sy - y0
    out = (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy)
           + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)   # bilinear sampling
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def ballpoint(mask: Image.Image, rng: random.Random, np_rng: np.random.Generator,
              skip: float = 0.0) -> Image.Image:
    """Uneven pressure along the word, ink grain, and on `skip` of the area the faint spots where
    the ball ran dry (these break strokes: a reader fills the gap, Tesseract does not)."""
    a = np.asarray(mask, dtype=np.float32) / 255
    h, w = a.shape
    xs = np.linspace(0, 1, w, dtype=np.float32)
    pressure = rng.uniform(0.80, 0.95) + 0.07 * np.sin(2 * np.pi * (xs * rng.uniform(0.6, 1.6) + rng.random()))
    grain = np.clip(0.80 + 0.35 * np_rng.random((h, w), dtype=np.float32), 0, 1)
    a = np.clip(a * pressure[None, :] * grain, 0, 1)
    if skip:                                                 # spots where the ball ran dry: faint ink
        coarse = np_rng.normal(0, 1, (max(2, h // SKIP_CELL), max(2, w // SKIP_CELL))).astype(np.float32)
        field = np.asarray(Image.fromarray(coarse).resize((w, h), Image.BICUBIC))
        thr = np.quantile(field, skip)
        a *= np.clip(SKIP_INK + (field - thr) / 0.25, SKIP_INK, 1)
    return Image.fromarray((a * 255).astype(np.uint8))


def write_line(text: str, size: int, avail: int, rng: random.Random,
               np_rng: np.random.Generator) -> list[tuple[Image.Image, int, int, str]]:
    """Render the words of one line; returns (mask, x, y offset to the baseline, word) per word,
    x relative to the line start. The whole line is condensed so it fits the available width."""
    words = []
    for word in text.split(" "):
        s = round(size * rng.uniform(*WORD_SIZE))
        mask, x0, base, width = word_mask(word, s, rng, np_rng)
        words.append((mask, x0, base, width, word))
    spaces = [size * 0.40 * rng.uniform(1.05, 1.6) for _ in words]   # 0.40 em: the script font's space
    natural = sum(width for _, _, _, width, _ in words) + sum(spaces[:-1])
    condense = min(rng.uniform(*CONDENSE), avail / natural)
    placed, x = [], 0.0
    for (mask, x0, base, width, word), space in zip(words, spaces):
        mask = mask.resize((max(1, round(mask.width * condense)), mask.height), Image.LANCZOS)
        x0 = round(x0 * condense)
        angle = rng.uniform(-WORD_TURN, WORD_TURN)           # around the word's baseline start
        mask = mask.rotate(angle, resample=Image.BICUBIC, center=(x0, base))
        mask = ballpoint(mask, rng, np_rng, 0.0 if is_careful(word) else SKIP)
        placed.append((mask, round(x) - x0, -base, word))
        x += (width + space) * condense
    return placed


def signature(width: int, height: int, rng: random.Random) -> Image.Image:
    """A scribbled signature: a running row of loops (a stretched cycloid), a big first loop like a
    capital, a slight upward slant, then a flourish back under the name. Curves, not text."""
    ss = 3                                                   # draw large, shrink: smooth edges
    img = Image.new("L", (width * ss, height * ss), 0)
    draw = ImageDraw.Draw(img)
    loops = rng.randint(4, 7)
    t = np.linspace(0, loops * 2 * np.pi, loops * 60)
    knots = np.arange(loops + 1)
    radii = [rng.uniform(1.15, 1.5)] + [rng.uniform(0.2, 1.0) for _ in range(loops)]   # small = a wave, big = a loop
    widths = [rng.uniform(0.3, 0.9) for _ in knots]          # how far each loop swings back
    gaps = [rng.uniform(0.6, 1.6) for _ in knots]            # uneven distance between the loops
    r = np.interp(t / (2 * np.pi), knots, radii) * 0.30 * height
    back = np.interp(t / (2 * np.pi), knots, widths)
    step = np.interp(t / (2 * np.pi), knots, gaps)
    advance = np.cumsum(step) / np.sum(step) * 0.80 * width
    y = 0.50 * height - r * np.cos(t) - rng.uniform(0.0, 0.15) * height * t / t[-1]
    x = 0.06 * width + advance - back * r * np.sin(t) - rng.uniform(0.2, 0.45) * (y - 0.5 * height)   # slant
    draw.line([(px * ss, py * ss) for px, py in zip(x, y)], fill=255, width=int(3.2 * ss), joint="curve")
    y0 = rng.uniform(0.80, 0.9) * height                     # flourish from the end back under the name
    flourish = catmull_rom([(x[-1], y[-1]), (0.92 * width, y0 - 4), (0.55 * width, y0 + 5),
                            (0.12 * width, y0 - 2), (0.04 * width, y0 - 12)], 20)
    draw.line([(px * ss, py * ss) for px, py in flourish], fill=255, width=int(2.6 * ss), joint="curve")
    return img.resize((width, height), Image.LANCZOS)


def catmull_rom(pts: list[tuple[float, float]], steps: int) -> list[tuple[float, float]]:
    p = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        (x0, y0), (x1, y1), (x2, y2), (x3, y3) = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(steps):
            t = k / steps
            t2, t3 = t * t, t * t * t
            out.append((0.5 * (2 * x1 + (x2 - x0) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (3 * x1 - x0 - 3 * x2 + x3) * t3),
                        0.5 * (2 * y1 + (y2 - y0) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (3 * y1 - y0 - 3 * y2 + y3) * t3)))
    out.append(pts[-1])
    return out


# --------------------------------------------------------------------------- paper

def paper(np_rng: np.random.Generator) -> np.ndarray:
    """Off-white paper with soft mottling, fine grain and faint ruled lines (float RGB, 0..255)."""
    w, h = PAPER_SIZE
    mottle = Image.fromarray((np_rng.random((h // 40, w // 40)) * 255).astype(np.uint8))
    mottle = np.asarray(mottle.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(25)), np.float32)
    grain = np_rng.normal(0, 2.2, (h, w)).astype(np.float32)
    img = np.empty((h, w, 3), np.float32)
    img[:] = PAPER_COLOR
    img += ((mottle - 128) / 128 * 5 + grain)[..., None]
    rules = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(rules)
    y = RULE_TOP - RULE_GAP
    while y <= RULE_LAST_Y:
        draw.line([(0, y), (w, y)], fill=110, width=2)
        y += RULE_GAP
    a = np.asarray(rules.filter(ImageFilter.GaussianBlur(0.7)), np.float32)[..., None] / 255
    return img * (1 - a) + np.array(RULE_COLOR, np.float32) * a


def apply_ink(img: np.ndarray, mask: Image.Image, x: int, y: int, color: tuple[int, int, int]) -> None:
    """Multiply ink into the paper (ink is translucent: ruled lines stay visible underneath)."""
    a = np.asarray(mask, np.float32) / 255
    h, w = a.shape
    x1, y1 = max(x, 0), max(y, 0)
    x2, y2 = min(x + w, img.shape[1]), min(y + h, img.shape[0])
    if x2 <= x1 or y2 <= y1:
        return
    a = a[y1 - y:y2 - y, x1 - x:x2 - x, None]
    tint = np.array(color, np.float32) / 255
    img[y1:y2, x1:x2] *= 1 - a * (1 - tint)


def stamp_watermark(img: np.ndarray, rng: random.Random, np_rng: np.random.Generator) -> None:
    """The printed footer, slightly uneven like a rubber stamp, centred under the last rule."""
    f = font(PRINT_FONT, WATERMARK_PX)
    w = int(f.getlength(WATERMARK)) + 20
    mask = Image.new("L", (w, WATERMARK_PX * 2), 0)
    ImageDraw.Draw(mask).text((10, WATERMARK_PX * 1.4), WATERMARK, font=f, fill=235, anchor="ls")
    mask = mask.rotate(rng.uniform(-0.4, 0.4), resample=Image.BICUBIC)
    a = np.asarray(mask, np.float32) * np.clip(0.85 + 0.2 * np_rng.random((mask.height, mask.width)), 0, 1)
    mask = Image.fromarray(a.astype(np.uint8))
    apply_ink(img, mask, (PAPER_SIZE[0] - w) // 2, RULE_LAST_Y + 62, WATERMARK_COLOR)


def write_page(rng: random.Random, np_rng: np.random.Generator) -> np.ndarray:
    img = paper(np_rng)
    sig_spots = []
    for n, (text, rule) in enumerate(zip(LINES, RULE_OF_LINE)):
        size = round(FONT_PX * (TITLE_SCALE if n == 0 else 1))
        left = MARGIN_LEFT + (INDENT if n in CONTINUATION else 0) + rng.randint(-6, 6)
        avail = PAPER_SIZE[0] - MARGIN_RIGHT - left
        start_dy = rng.uniform(-5, 1)                         # writing sits on or just above the rule
        slope = rng.uniform(-0.006, 0.003)                    # lines drift up (negative) or down
        baseline = RULE_TOP + rule * RULE_GAP - 4
        for mask, x, dy, word in write_line(text, size, avail, rng, np_rng):
            y = baseline + start_dy + slope * x + rng.uniform(-WORD_JUMP, WORD_JUMP) + dy
            apply_ink(img, mask, left + x, round(y), INK)
            if n in SIGNATURE_LINES and word.startswith("_"):
                sig_spots.append((left + x, baseline))
    for x, baseline in sig_spots:                             # the signatures over the signature lines
        sig = ballpoint(signature(330, 120, rng), rng, np_rng, SKIP)
        apply_ink(img, sig, x + rng.randint(30, 70), baseline - 100, INK)
    stamp_watermark(img, rng, np_rng)
    return img


# --------------------------------------------------------------------------- photo

def perspective_coeffs(src: list[tuple[float, float]], dst: list[tuple[float, float]]) -> list[float]:
    """Coefficients for Image.PERSPECTIVE: they map a photo pixel (dst) back to the flat page (src)."""
    rows, rhs = [], []
    for (sx, sy), (dx, dy) in zip(src, dst):
        rows.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        rows.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
        rhs += [sx, sy]
    return np.linalg.solve(np.array(rows, float), np.array(rhs, float)).tolist()


def photograph(page: np.ndarray, np_rng: np.random.Generator) -> Image.Image:
    """Lay the page on a desk, tilt it, light it unevenly, blur, add noise."""
    W, H = PHOTO_SIZE
    w, h = PAPER_SIZE
    flat = Image.fromarray(np.clip(page, 0, 255).astype(np.uint8)).convert("RGBA")
    coeffs = perspective_coeffs([(0, 0), (w, 0), (w, h), (0, h)], PAPER_CORNERS)
    sheet = flat.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    alpha = np.asarray(sheet.getchannel("A"), np.float32)[..., None] / 255
    # desk: dark grey-brown with a soft grain; the sheet throws a small shadow on it
    desk = np.empty((H, W, 3), np.float32)
    desk[:] = (88, 80, 72)
    streaks = Image.fromarray((np_rng.random((H // 6, W // 60)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    desk += (np.asarray(streaks.filter(ImageFilter.GaussianBlur(4)), np.float32)[..., None] - 128) / 128 * 9
    shadow = Image.fromarray((alpha[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))
    shadow = np.asarray(ImageChops.offset(shadow, 10, 14), np.float32)[..., None] / 255
    desk *= 1 - 0.45 * shadow
    img = desk * (1 - alpha) + np.asarray(sheet.convert("RGB"), np.float32) * alpha
    # light: brighter from the upper left (window), darker corners, a warm indoor tint
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx, ny = xx / W, yy / H
    light = 1.03 - 0.13 * (0.55 * nx + 0.45 * ny)
    light -= 0.20 * (((nx - 0.45) ** 2 + (ny - 0.42) ** 2) / 0.5) ** 1.5
    img *= light[..., None] * np.array([1.0, 0.985, 0.945], np.float32)
    photo = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))
    # sensor noise: luminance plus a little colour noise
    noisy = np.asarray(photo, np.float32) + np_rng.normal(0, 3.2, (H, W, 1)) + np_rng.normal(0, 1.6, (H, W, 3))
    return Image.fromarray(np.clip(noisy, 0, 255).astype(np.uint8))


# --------------------------------------------------------------------------- main

def ocr_check(path: Path) -> None:
    """Measure what the pipeline will see: the same OCR call ingest makes for an image page.
    Optional - needs Tesseract and the pipeline's dependencies; the image does not depend on it."""
    sys.path.insert(0, str(ROOT))
    try:
        from pipeline import config
        from pipeline.ingest import _ocr_image
        _, conf, words = _ocr_image(Image.open(path))
    except Exception as exc:                                  # no Tesseract here: skip, do not fail
        print(f"OCR check skipped: {exc}")
        return
    verdict = "LOW_QUALITY" if conf < config.OCR_LOW_QUALITY_CONFIDENCE else "OCR_DONE (not flagged!)"
    print(f"Tesseract: {len(words)} words, mean confidence {conf:.1f} "
          f"(threshold {config.OCR_LOW_QUALITY_CONFIDENCE:.0f}) -> {verdict}")


def main() -> None:
    rng = random.Random(SEED)
    np_rng = np.random.default_rng(SEED)
    page = write_page(rng, np_rng)
    photo = photograph(page, np_rng)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    photo.save(OUT, quality=JPEG_QUALITY, optimize=True)
    digest = hashlib.sha256(OUT.read_bytes()).hexdigest()
    print(f"wrote {OUT.relative_to(ROOT).as_posix()} ({photo.width} x {photo.height}), sha256 {digest}")
    ocr_check(OUT)


if __name__ == "__main__":
    main()
