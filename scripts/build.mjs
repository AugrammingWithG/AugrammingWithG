/* Builds the profile README's images into ../assets.

   The look is the portfolio's: warm near-black ground, brass light falling
   into teal, Space Grotesk / Inter / JetBrains Mono. A README image cannot
   load a webfont, so every word is set here and written out as outlines.

     npm install && npm run build

   With GH_TOKEN set, the activity panel is refetched from GitHub first;
   without it, the last fetch (activity.json) is drawn again. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import { CONTACT, PROJECTS, SKILL_GROUPS, BUTTONS } from "./content.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "assets");
const LOGIN = process.env.GH_LOGIN || "AugrammingWithG";

/* ---- tokens (Portfolio-Web: styles.css, hero.css, hud.css) --------------- */
const C = {
  bg: "#0c0a0a",
  ink: "#ece7dc",
  bone: "#e8e5dc",
  inkSoft: "#a6a294",
  ink3: "#8f8878",
  steel: "#a3a8b1",
  gold: "#d0a44c",
  goldSoft: "#e3c789",
  brassLt: "#e7c063",
  line: "rgba(255,255,255,0.09)",
};
const W = 900;
const PAD = 40;

/* ---- type ---------------------------------------------------------------- */
const font = (pkg, file) => {
  const buf = fs.readFileSync(path.join(HERE, "node_modules", "@fontsource", pkg, "files", file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const F = {
  d5: font("space-grotesk", "space-grotesk-latin-500-normal.woff"),
  d6: font("space-grotesk", "space-grotesk-latin-600-normal.woff"),
  d7: font("space-grotesk", "space-grotesk-latin-700-normal.woff"),
  b4: font("inter", "inter-latin-400-normal.woff"),
  b6: font("inter", "inter-latin-600-normal.woff"),
  m4: font("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
  m5: font("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff"),
};

const n = (v) => +v.toFixed(2);
const n1 = (v) => +v.toFixed(1);

/* Advance width without the trailing letter-space. */
function measure(f, str, size, ls = 0) {
  return f.getAdvanceWidth(str, size, { letterSpacing: ls }) - ls * size;
}

/* A line of text as one outlined path. `map` projects every point, which is
   how the card's lettering sits in perspective. */
function text(f, str, x, y, size, { fill = C.ink, ls = 0, anchor = "start", opacity, map, cls } = {}) {
  const w = measure(f, str, size, ls);
  const x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
  const p = f.getPath(str, x0, y, size, { letterSpacing: ls });
  let d;
  if (map) {
    d = p.commands
      .map((c) => {
        if (c.type === "Z") return "Z";
        const pts = [];
        if (c.type === "C" || c.type === "Q") pts.push(map(c.x1, c.y1));
        if (c.type === "C") pts.push(map(c.x2, c.y2));
        pts.push(map(c.x, c.y));
        return c.type + pts.map(([a, b]) => `${n1(a)} ${n1(b)}`).join(" ");
      })
      .join("");
  } else {
    d = p.toPathData(1);
  }
  const attrs = [`fill="${fill}"`];
  if (opacity != null) attrs.push(`opacity="${opacity}"`);
  if (cls) attrs.push(`class="${cls}"`);
  return `<path ${attrs.join(" ")} d="${d}"/>`;
}

const hud = (str, x, y, opts = {}) => text(F.m5, str.toUpperCase(), x, y, 12, { ls: 0.16, ...opts });

function wrap(f, str, size, max) {
  const lines = [];
  let cur = "";
  for (const word of str.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(f, next, size) > max) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  lines.push(cur);
  return lines;
}

/* ---- the ground ---------------------------------------------------------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stars(w, h, count, seed, twinkle = 0) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = n(r() * w);
    const y = n(r() * h);
    const rad = n(0.45 + r() * r() * 1.1);
    const o = n(0.14 + r() * 0.5);
    const fill = r() < 0.72 ? C.goldSoft : "#ffffff";
    const tw = i < twinkle ? ` class="tw" style="animation-delay:-${n(r() * 6)}s"` : "";
    out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}" opacity="${o}"${tw}/>`;
  }
  return out;
}

/* One section of the page: the dark ground, brass and teal light at the two
   given points, a dark rail top and bottom for the mono labels, and stars.
   Light positions move down the README the way the wash crosses the site. */
function ground(h, { gold, teal, seed, count = 90, twinkle = 0, scrim = 0 }) {
  const glow = (id, [cx, cy, r, a], rgb) =>
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">` +
    `<stop offset="0" stop-color="rgb(${rgb})" stop-opacity="${a}"/>` +
    `<stop offset="0.55" stop-color="rgb(${rgb})" stop-opacity="${n(a * 0.32)}"/>` +
    `<stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient>`;
  const defs =
    glow("gGold", gold, "196,152,70") +
    glow("gTeal", teal, "30,84,100") +
    `<linearGradient id="gRail" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#0a0703" stop-opacity="0.72"/>` +
    `<stop offset="0.2" stop-color="#0a0703" stop-opacity="0"/>` +
    `<stop offset="0.8" stop-color="#0a0703" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0a0703" stop-opacity="0.6"/></linearGradient>` +
    `<clipPath id="frame"><rect width="${W}" height="${h}" rx="4"/></clipPath>`;
  const body =
    `<rect width="${W}" height="${h}" fill="${C.bg}"/>` +
    `<rect width="${W}" height="${h}" fill="url(#gGold)"/>` +
    `<rect width="${W}" height="${h}" fill="url(#gTeal)"/>` +
    (scrim ? `<rect width="${W}" height="${h}" fill="#0b0803" opacity="${scrim}"/>` : "") +
    `<rect width="${W}" height="${h}" fill="url(#gRail)"/>` +
    stars(W, h, count, seed, twinkle);
  return { defs, body };
}

const MOTION = `
  .tw{animation:tw 5.5s ease-in-out infinite}
  @keyframes tw{0%,100%{opacity:.15}50%{opacity:.9}}
  @media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}.tw,.sheen,.st *{animation:none!important}}`;

function svg(h, label, defs, css, body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(label)}">` +
    `<title>${esc(label)}</title><defs>${defs}</defs><style>${MOTION}${css}</style>` +
    `<g clip-path="url(#frame)">${body}</g>` +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${h - 1}" rx="4" fill="none" stroke="rgba(231,201,135,0.14)"/>` +
    `</svg>\n`
  );
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function header(label, meta) {
  let out = hud(label, PAD, 43);
  if (meta) {
    /* meta: [strong, rest] — the strong part reads in full ink, like <b> in
       .sector-hud-meta. */
    const [strong, rest] = meta;
    const restStr = rest ? `  ·  ${rest}`.toUpperCase() : "";
    const restW = rest ? measure(F.m4, restStr, 12, 0.16) : 0;
    if (rest) out += text(F.m4, restStr, W - PAD, 43, 12, { ls: 0.16, anchor: "end", fill: C.inkSoft });
    out += text(F.m4, strong.toUpperCase(), W - PAD - restW, 43, 12, { ls: 0.16, anchor: "end", fill: C.ink });
  }
  return out;
}

/* ==========================================================================
   HERO — the name, the role, the line under it, and the card.
   ========================================================================== */
function hero() {
  const H = 420;
  const g = ground(H, { gold: [40, 60, 520, 0.6], teal: [820, 300, 520, 0.72], seed: 11, count: 120, twinkle: 14 });

  /* The card is laid out flat at 680 x 400 (the stand-in card's own
     proportions, hero.css .hero-card) and projected onto this quad. */
  const CW = 680;
  const CH = 400;
  const Q = [
    [472, 100],
    [870, 68],
    [857, 372],
    [464, 328],
  ];
  const map = homography(CW, CH, Q);
  const poly = (pts) => pts.map(([x, y]) => map(x, y).map(n).join(",")).join(" ");
  const quad = Q.map((p) => p.join(",")).join(" ");
  const glowAt = map(CW * 0.87, CH * 0.88);
  const mono = { fill: C.steel, map };

  const card =
    `<polygon points="${quad}" fill="#000" opacity="0.62" filter="url(#shadow)" transform="translate(0 24)"/>` +
    /* the slab's near edge */
    `<polygon points="${Q[1].join(",")} ${Q[1][0] + 4},${Q[1][1] + 2} ${Q[2][0] + 4},${Q[2][1] + 1} ${Q[2].join(",")}" fill="#8a6a2c"/>` +
    `<polygon points="${quad}" fill="#131418"/>` +
    `<polygon points="${quad}" fill="url(#cardGlow)"/>` +
    `<polygon points="${poly([[0, 0], [CW * 0.412, 0], [0, CH * 0.55]])}" fill="url(#brass)"/>` +
    text(F.d7, CONTACT.initials, 32, 74, 52, { fill: "#1a1204", map }) +
    text(F.d7, CONTACT.name, 42, 272, 41, { fill: C.ink, ls: -0.01, map }) +
    text(F.d6, CONTACT.role, 42, 311, 24, { fill: C.goldSoft, map }) +
    text(F.m4, CONTACT.email, 42, 366, 18, mono) +
    text(F.m4, CONTACT.location, CW - 42, 366, 18, { ...mono, anchor: "end" }) +
    /* the band of light the hero's scan leaves on it */
    `<g clip-path="url(#cardClip)"><polygon class="sheen" points="0,40 70,40 -50,400 -120,400" fill="url(#sheen)"/></g>` +
    `<polygon points="${quad}" fill="none" stroke="rgba(231,201,135,0.5)" stroke-width="1"/>`;

  const defs =
    g.defs +
    `<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="20"/></filter>` +
    `<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3c789"/><stop offset="1" stop-color="#b8892b"/></linearGradient>` +
    `<radialGradient id="cardGlow" gradientUnits="userSpaceOnUse" cx="${n(glowAt[0])}" cy="${n(glowAt[1])}" r="230">` +
    `<stop offset="0" stop-color="#d0a44c" stop-opacity="0.2"/><stop offset="1" stop-color="#d0a44c" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4d6" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="#fff4d6" stop-opacity="0.2"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="cardClip"><polygon points="${quad}"/></clipPath>`;

  const css = `
  .sheen{transform:translateX(380px);animation:sheen 9s cubic-bezier(.16,1,.3,1) infinite}
  @keyframes sheen{0%,58%{transform:translateX(380px)}100%{transform:translateX(1080px)}}`;

  const [open, rest] = CONTACT.availability;
  const body =
    g.body +
    hud(CONTACT.location, PAD, 43, { fill: C.steel, ls: 0.18 }) +
    header("", [open, rest]) +
    text(F.d7, CONTACT.nameLines[0], PAD, 172, 45, { fill: C.bone, ls: -0.03 }) +
    text(F.d7, CONTACT.nameLines[1], PAD, 220, 45, { fill: C.bone, ls: -0.03 }) +
    text(F.d6, CONTACT.role, PAD, 262, 23, { fill: C.brassLt, ls: -0.01 }) +
    CONTACT.ledeLines.map((l, i) => text(F.b4, l, PAD, 302 + i * 24, 15, { fill: C.bone, opacity: 0.8 })).join("") +
    card;

  return svg(
    H,
    `${CONTACT.name}, ${CONTACT.role}. ${CONTACT.ledeLines.join(" ")} ${CONTACT.location}. Open to remote work and freelance.`,
    defs,
    css,
    body
  );
}

/* Rectangle (0..w, 0..h) onto a quad given clockwise from top-left. */
function homography(w, h, [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const gg = (sx * dy2 - dx2 * sy) / den;
  const hh = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + gg * x1;
  const b = x3 - x0 + hh * x3;
  const d = y1 - y0 + gg * y1;
  const e = y3 - y0 + hh * y3;
  return (px, py) => {
    const u = px / w;
    const v = py / h;
    const k = gg * u + hh * v + 1;
    return [(a * u + b * v + x0) / k, (d * u + e * v + y0) / k];
  };
}

/* ==========================================================================
   SELECTED WORK — the orbit, and under each ring's colour the project on it.
   ========================================================================== */
function work() {
  const H = 404;
  const g = ground(H, { gold: [120, 210, 420, 0.3], teal: [860, 120, 480, 0.5], seed: 23, count: 70, scrim: 0.3 });

  /* One star, eight rings, one planet each. Ring r and period follow
     planets.js: inner faster than outer, phases a golden angle apart. */
  const CX = 196;
  const CY = 226;
  const TILT = 0.5;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  let rings = "";
  let planets = "";
  let css = `
  .orb,.orb *{transform-box:view-box;transform-origin:0 0}
  .spin{animation:spin linear infinite}.unspin{animation:spin linear infinite reverse}
  @keyframes spin{to{transform:rotate(360deg)}}`;
  PROJECTS.forEach((p, i) => {
    const r = 46 + i * 18;
    const period = n(48 * Math.pow(r / 46, 0.7));
    const phase = (0.9 + i * GOLDEN) % (Math.PI * 2);
    const delay = n(-(phase / (Math.PI * 2)) * period);
    const t = `style="animation-duration:${period}s;animation-delay:${delay}s"`;
    rings += `<ellipse rx="${r}" ry="${n(r * TILT)}" fill="none" stroke="${C.goldSoft}" stroke-opacity="0.62" stroke-width="1.5" stroke-dasharray="0.1 4.6" stroke-linecap="round"/>`;
    /* scale . rotate . translate . unrotate . unscale = a pure slide along the
       ellipse, so the planet stays round. */
    planets +=
      `<g transform="scale(1 ${TILT})"><g class="spin" ${t}><g transform="translate(${r} 0)"><g class="unspin" ${t}>` +
      `<g transform="scale(1 ${n(1 / TILT)})"><circle r="7.5" fill="${p.accent}"/><circle r="7.5" fill="url(#shade)"/></g>` +
      `</g></g></g></g>`;
  });
  const orbit =
    `<g class="orb" transform="translate(${CX} ${CY}) rotate(-9)">` +
    rings +
    `<circle r="34" fill="url(#sun)"/><circle r="7" fill="${C.goldSoft}"/>` +
    planets +
    `</g>`;

  /* Four across, two down: a crop of the real screen, the name, and what
     kind of thing it is beside the colour of its planet. */
  const X0 = 400;
  const TW = 106;
  const TH = 60;
  const GAP = 12;
  let tiles = "";
  let clips = "";
  PROJECTS.forEach((p, i) => {
    const x = X0 + (i % 4) * (TW + GAP);
    const y = 84 + Math.floor(i / 4) * 150;
    const img = fs.readFileSync(path.join(HERE, "thumbs", `${p.id}.jpg`)).toString("base64");
    clips += `<clipPath id="t${i}"><rect x="${x}" y="${y}" width="${TW}" height="${TH}" rx="3"/></clipPath>`;
    tiles +=
      `<image x="${x}" y="${y}" width="${TW}" height="${TH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#t${i})" filter="url(#tone)" xlink:href="data:image/jpeg;base64,${img}"/>` +
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${TW - 1}" height="${TH - 1}" rx="3" fill="none" stroke="rgba(255,255,255,0.14)"/>`;
    const lines = wrap(F.d6, p.name, 13.5, TW);
    lines.forEach((l, j) => {
      tiles += text(F.d6, l, x, y + TH + 21 + j * 16.5, 13.5, { fill: C.bone });
    });
    const ky = y + TH + 21 + lines.length * 16.5 + 1;
    tiles += `<circle cx="${x + TW - 10}" cy="${y + 10}" r="4.5" fill="${p.accent}" stroke="${C.bg}" stroke-width="2"/>` + text(F.b4, p.kind, x, ky, 12, { fill: C.steel });
  });

  const defs =
    g.defs +
    clips +
    `<radialGradient id="sun"><stop offset="0" stop-color="#e7c063" stop-opacity="0.55"/><stop offset="1" stop-color="#e7c063" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="shade" cx="0.32" cy="0.3" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>` +
    /* the tiles' resting tone on the site: grey, warmed, held back */
    `<filter id="tone" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.30 0.46 0.12 0 0  0.25 0.40 0.10 0 0  0.18 0.29 0.07 0 0  0 0 0 1 0"/></filter>`;

  const body =
    g.body +
    header("Selected work", [`${PROJECTS.length} projects`, "case studies on the portfolio"]) +
    orbit +
    tiles;

  return svg(
    H,
    `Selected work. ${PROJECTS.map((p) => `${p.name}, ${p.kind.toLowerCase()}`).join("; ")}. Case studies are on the portfolio.`,
    defs,
    css,
    body
  );
}

/* ==========================================================================
   SKILLS — one sky, four constellations.
   ========================================================================== */
function skills() {
  const H = 432;
  const g = ground(H, { gold: [-40, 440, 420, 0.3], teal: [700, 200, 540, 0.55], seed: 37, count: 60, scrim: 0.34 });
  const all = SKILL_GROUPS.flatMap((x) => x.skills);

  const COLW = 214;
  const STEP = 35;
  let out = "";
  SKILL_GROUPS.forEach((grp, gi) => {
    const x0 = PAD + gi * COLW;
    out += text(F.d7, grp.name, x0, 104, 25, { fill: C.ink, ls: -0.02 });
    /* The figure: a slow, uneven sway, different for each group. */
    const pts = grp.skills.map((_, j) => [
      n(x0 + 20 + 15 * Math.sin(j * 1.05 + gi * 1.9) + 5 * Math.sin(j * 2.3 + gi)),
      146 + j * STEP,
    ]);
    out += `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${C.goldSoft}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="0.1 4.6" stroke-linecap="round"/>`;
    grp.skills.forEach((label, j) => {
      const [x, y] = pts[j];
      out += `<circle cx="${x}" cy="${y}" r="7" fill="${C.goldSoft}" opacity="0.14"/><circle cx="${x}" cy="${y}" r="3.2" fill="${C.goldSoft}"/>`;
      out += text(F.d5, label, x + 15, y + 5, 15, { fill: C.ink });
    });
  });

  const body = g.body + header("Skills", [`${all.length} skills`]) + out;
  const label =
    "Skills. " +
    SKILL_GROUPS.map((grp) => `${grp.name}: ${grp.skills.join(", ")}`).join(". ") +
    ".";
  return svg(H, label, g.defs, "", body);
}

/* ==========================================================================
   ACTIVITY — the last year of contributions, one point per day.
   ========================================================================== */
function activity(data) {
  const H = 250;
  const g = ground(H, { gold: [300, -160, 420, 0.3], teal: [760, 300, 520, 0.5], seed: 53, count: 0, scrim: 0.3 });
  const weeks = data.weeks;
  const PITCH = (W - PAD * 2) / weeks.length;
  const X0 = PAD + PITCH / 2;
  const Y0 = 96;
  const max = Math.max(1, ...weeks.flat().map((d) => d.count));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const rnd = rng(71);
  const css = `
  .st *{animation:linear infinite;animation-duration:var(--d);animation-delay:var(--t)}
  .co{opacity:var(--o);animation-name:co}
  .ha{opacity:.05;animation-name:ha}
  .gl{opacity:0;transform-box:fill-box;transform-origin:center;animation-name:gl}
  @keyframes co{0%,64%,100%{opacity:var(--o)}78%{opacity:1}}
  @keyframes ha{0%,62%,100%{opacity:.05}78%{opacity:.45}}
  @keyframes gl{0%,64%{opacity:0;transform:scale(.15) rotate(-18deg)}78%{opacity:1;transform:scale(1) rotate(0deg)}94%,100%{opacity:0;transform:scale(.15) rotate(14deg)}}`;
  let out = "";
  let lastMonth = -1;
  let lastLabelAt = -9;
  weeks.forEach((week, wi) => {
    const m = +week[0].date.slice(5, 7) - 1;
    if (m !== lastMonth) {
      if (wi - lastLabelAt >= 3 && wi < weeks.length - 1) {
        out += text(F.m4, MONTHS[m].toUpperCase(), X0 + wi * PITCH - 3, 76, 11, { fill: C.ink3, ls: 0.12 });
        lastLabelAt = wi;
      }
      lastMonth = m;
    }
    week.forEach((day) => {
      const dow = new Date(`${day.date}T00:00:00Z`).getUTCDay();
      const cx = n(X0 + wi * PITCH);
      const cy = n(Y0 + dow * PITCH);
      if (!day.count) {
        out += `<circle cx="${cx}" cy="${cy}" r="1.1" fill="${C.ink}" opacity="0.2"/>`;
        return;
      }
      /* square-root scale: one commit is already a visible star */
      const k = Math.sqrt(day.count / max);
      const r = n(1.9 + k * 3.4);
      /* Every day with a commit is a star that scintillates: it rests a
         little dim, then flares — the core brightens, a halo opens and a
         four-point glint flashes across it. Each star keeps its own clock,
         so the sky never pulses in step; busier days flare bigger. */
      const dur = n(3.2 + rnd() * 4.2);
      const L = n(r * 2.3 + 4.5);
      const q = n(L * 0.14);
      const glint =
        `M${cx} ${n(cy - L)}Q${n(cx + q)} ${n(cy - q)} ${n(cx + L)} ${cy}Q${n(cx + q)} ${n(cy + q)} ${cx} ${n(cy + L)}` +
        `Q${n(cx - q)} ${n(cy + q)} ${n(cx - L)} ${cy}Q${n(cx - q)} ${n(cy - q)} ${cx} ${n(cy - L)}Z`;
      out +=
        `<g class="st" style="--d:${dur}s;--t:-${n(rnd() * dur)}s;--o:${n(0.42 + k * 0.4)}">` +
        `<circle class="ha" cx="${cx}" cy="${cy}" r="${n(Math.min(r + 3.2, 7.4))}" fill="${C.gold}"/>` +
        `<circle class="co" cx="${cx}" cy="${cy}" r="${r}" fill="${k > 0.6 ? C.goldSoft : C.gold}"/>` +
        `<path class="gl" d="${glint}" fill="#fff3d2"/></g>`;
    });
  });

  const active = weeks.flat().filter((d) => d.count).length;
  const total = data.total.toLocaleString("en-US");
  const y = H - 30;
  const lead = `${total} contributions`;
  out +=
    text(F.d6, lead, PAD, y, 17, { fill: C.ink, ls: -0.01 }) +
    text(F.b4, `in the last year, on ${active} days`, PAD + measure(F.d6, lead, 17, -0.01) + 8, y, 15, { fill: C.inkSoft }) +
    hud(`On GitHub since ${data.since}`, W - PAD, y, { fill: C.ink3, ls: 0.12, anchor: "end" });

  const body = g.body + header("Activity", ["Last 12 months", `github.com/${LOGIN}`]) + out;
  return svg(H, `Activity. ${total} contributions in the last year, on ${active} days. On GitHub since ${data.since}.`, g.defs, css, body);
}

async function loadActivity() {
  const cache = path.join(HERE, "activity.json");
  const token = process.env.GH_TOKEN;
  if (!token) return JSON.parse(fs.readFileSync(cache, "utf8"));
  const query = `{user(login:"${LOGIN}"){createdAt contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profile-readme" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API: ${res.status} ${JSON.stringify(json.errors || json)}`);
  const u = json.data.user;
  const cal = u.contributionsCollection.contributionCalendar;
  const data = {
    since: +u.createdAt.slice(0, 4),
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
  fs.writeFileSync(cache, JSON.stringify(data) + "\n");
  return data;
}

/* ==========================================================================
   BUTTONS — .btn and .btn--gold. Each is its own image so each can be a link.
   ========================================================================== */
function button({ label, gold }) {
  const H = 46;
  const size = 15.5;
  const w = Math.round(measure(F.b6, label, size) + 46);
  const face = gold
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3c789"/><stop offset="1" stop-color="#d0a44c"/></linearGradient></defs>` +
      `<rect width="${w}" height="${H}" rx="11" fill="url(#g)"/>`
    : `<rect x="0.5" y="0.5" width="${w - 1}" height="${H - 1}" rx="10.5" fill="#15120e" stroke="rgba(227,199,137,0.3)"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="${esc(label)}">` +
    `<title>${esc(label)}</title>${face}` +
    text(F.b6, label, w / 2, 28.5, size, { fill: gold ? "#1a1204" : C.ink, anchor: "middle" }) +
    `</svg>\n`
  );
}

/* ---- write ---------------------------------------------------------------- */
fs.mkdirSync(OUT, { recursive: true });
const files = {
  "hero.svg": hero(),
  "work.svg": work(),
  "skills.svg": skills(),
  "activity.svg": activity(await loadActivity()),
};
for (const b of BUTTONS) files[`${b.file}.svg`] = button(b);
for (const [name, src] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), src);
  console.log(`${name.padEnd(20)} ${(src.length / 1024).toFixed(1)} KB`);
}
