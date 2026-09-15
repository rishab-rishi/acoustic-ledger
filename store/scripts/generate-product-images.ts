// One-off asset pipeline: renders a distinct illustrated product image per
// catalog slug (see PRODUCTS in src/db/seed.ts) to public/products/<slug>.webp.
// Run with: npx tsx scripts/generate-product-images.ts
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const OUT_DIR = join(__dirname, "..", "public", "products");
const SIZE = 1000;

// ---------------------------------------------------------------------------
// Palette (matches the existing "Acoustic Ledger" catalog motif: cream
// ground, graph-paper grid, terracotta corner brackets, near-black hardware).
// ---------------------------------------------------------------------------
const PALETTE = {
  bg: "#F3EEDF",
  grid: "#C9BE9F",
  bracket: "#C1652F",
  bodyLight: "#332A20",
  bodyDark: "#17130E",
  metalLight: "#DCDCDC",
  metalMid: "#9C9C9C",
  metalDark: "#5A5A5A",
  cream: "#EDE6D3",
  creamDark: "#C7BE9F",
  gold: "#D8A24A",
  screenBg: "#101A1B",
  screenGlow: "#7FD9C4",
  cableDark: "#221D18",
  shadow: "#00000022",
} as const;

function defs(): string {
  return `
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PALETTE.bodyLight}" />
      <stop offset="1" stop-color="${PALETTE.bodyDark}" />
    </linearGradient>
    <linearGradient id="bodySide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${PALETTE.bodyDark}" />
      <stop offset="1" stop-color="#0d0a07" />
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PALETTE.metalLight}" />
      <stop offset="0.5" stop-color="${PALETTE.metalMid}" />
      <stop offset="1" stop-color="${PALETTE.metalDark}" />
    </linearGradient>
    <radialGradient id="knob" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="${PALETTE.metalLight}" />
      <stop offset="0.55" stop-color="${PALETTE.metalMid}" />
      <stop offset="1" stop-color="${PALETTE.metalDark}" />
    </radialGradient>
    <radialGradient id="meterGlass" cx="0.4" cy="0.35" r="0.85">
      <stop offset="0" stop-color="${PALETTE.cream}" />
      <stop offset="1" stop-color="${PALETTE.creamDark}" />
    </radialGradient>
    <radialGradient id="screen" cx="0.5" cy="0.4" r="0.9">
      <stop offset="0" stop-color="#1c2b2c" />
      <stop offset="1" stop-color="${PALETTE.screenBg}" />
    </radialGradient>
    <linearGradient id="foam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#D9CFAE" />
      <stop offset="1" stop-color="#B7AA80" />
    </linearGradient>
    <pattern id="grille" width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="7" cy="7" r="2.1" fill="${PALETTE.bodyDark}" opacity="0.55" />
    </pattern>
    <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
      <feOffset in="blur" dx="0" dy="14" result="offsetBlur" />
      <feComponentTransfer in="offsetBlur" result="shadow">
        <feFuncA type="linear" slope="0.28" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>`;
}

function frame(): string {
  const lines: string[] = [];
  for (let x = 40; x <= 760; x += 40) {
    lines.push(`<line x1="${x}" y1="40" x2="${x}" y2="760" />`);
  }
  for (let y = 40; y <= 760; y += 40) {
    lines.push(`<line x1="40" y1="${y}" x2="760" y2="${y}" />`);
  }
  const bracket = (x: number, y: number, dx: number, dy: number) => `
    <path d="M ${x} ${y + dy} L ${x} ${y} L ${x + dx} ${y}"
      fill="none" stroke="${PALETTE.bracket}" stroke-width="4" stroke-linecap="square" />`;
  return `
  <rect width="800" height="800" fill="${PALETTE.bg}" />
  <g stroke="${PALETTE.grid}" stroke-width="1" opacity="0.35">${lines.join("")}</g>
  <rect x="40" y="40" width="720" height="720" fill="none" stroke="${PALETTE.grid}" stroke-width="1.5" opacity="0.6" />
  ${bracket(40, 40, 34, 34)}
  ${bracket(760, 40, -34, 34)}
  ${bracket(40, 760, 34, -34)}
  ${bracket(760, 760, -34, -34)}`;
}

function groundShadow(cx: number, y: number, rx: number): string {
  return `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${rx * 0.14}" fill="${PALETTE.shadow}" />`;
}

function wrap(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">${defs()}${frame()}<g filter="url(#softShadow)">${body}</g></svg>`;
}

// ---------------------------------------------------------------------------
// Studio monitors
// ---------------------------------------------------------------------------
type MonitorOpts = {
  w: number; // cabinet width
  h: number; // cabinet height
  cy: number; // cabinet vertical center
  tweeter: boolean;
  coax: boolean;
  woofer: number; // woofer radius
  port: "front" | "rear" | "none";
  handle?: boolean;
  angled?: boolean;
  badge?: string;
};

function monitor(o: MonitorOpts): string {
  const cx = 400;
  const x = cx - o.w / 2;
  const y = o.cy - o.h / 2;
  const side = o.angled
    ? `<path d="M ${x + o.w} ${y + 10} l 26 16 l 0 ${o.h - 20} l -26 -10 Z" fill="url(#bodySide)" />`
    : "";
  const tweeterR = o.w * 0.11;
  const tweeterCy = y + o.h * 0.24;
  const tweeterEl =
    o.tweeter && !o.coax
      ? `<circle cx="${cx}" cy="${tweeterCy}" r="${tweeterR}" fill="url(#metal)" />
         <circle cx="${cx}" cy="${tweeterCy}" r="${tweeterR * 0.42}" fill="${PALETTE.bracket}" />`
      : "";
  const wooferCy = o.coax ? tweeterCy : y + o.h * 0.62;
  const wooferEl = `
    <circle cx="${cx}" cy="${wooferCy}" r="${o.woofer}" fill="url(#grille)" stroke="${PALETTE.metalMid}" stroke-width="2" />
    <circle cx="${cx}" cy="${wooferCy}" r="${o.woofer}" fill="none" stroke="${PALETTE.metalDark}" stroke-width="3" />
    ${
      o.coax
        ? `<circle cx="${cx}" cy="${wooferCy}" r="${tweeterR}" fill="url(#metal)" /><circle cx="${cx}" cy="${wooferCy}" r="${tweeterR * 0.42}" fill="${PALETTE.bracket}" />`
        : `<circle cx="${cx}" cy="${wooferCy}" r="${o.woofer * 0.16}" fill="${PALETTE.bracket}" />`
    }`;
  const port =
    o.port === "front"
      ? `<rect x="${cx - o.w * 0.13}" y="${y + o.h * 0.86}" width="${o.w * 0.26}" height="${o.h * 0.06}" rx="${o.h * 0.03}" fill="${PALETTE.bodyDark}" />`
      : "";
  const handle = o.handle
    ? `<path d="M ${cx - o.w * 0.18} ${y - 2} q ${o.w * 0.18} -22 ${o.w * 0.36} 0" fill="none" stroke="url(#metal)" stroke-width="7" stroke-linecap="round" />`
    : "";
  const badge = o.badge
    ? `<rect x="${x + o.w - 46}" y="${y + o.h - 34}" width="34" height="20" rx="4" fill="${PALETTE.bracket}" />
       <text x="${x + o.w - 29}" y="${y + o.h - 19}" font-family="Arial" font-weight="700" font-size="13" fill="${PALETTE.cream}" text-anchor="middle">${o.badge}</text>`
    : "";
  return `
    ${groundShadow(cx + (o.angled ? 12 : 0), y + o.h + 16, o.w * 0.62)}
    <rect x="${x}" y="${y}" width="${o.w}" height="${o.h}" rx="10" fill="url(#body)" />
    <rect x="${x + 6}" y="${y + 6}" width="${o.w - 12}" height="${o.h - 12}" rx="7" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="1.5" />
    ${side}
    ${tweeterEl}
    ${wooferEl}
    ${port}
    ${handle}
    ${badge}`;
}

// ---------------------------------------------------------------------------
// Headphones
// ---------------------------------------------------------------------------
type HeadphoneOpts = {
  span: number; // headband width
  cupR: number;
  padStyle: "open" | "closed" | "thick";
  compact?: boolean;
  cable?: boolean;
  led?: boolean;
  premium?: boolean;
  fold?: boolean;
};

function headphones(o: HeadphoneOpts): string {
  const cx = 400;
  const cy = 330;
  const half = o.span / 2;
  const bandTopY = cy - 130;
  const accent = o.premium ? PALETTE.gold : PALETTE.bracket;
  const cup = (side: 1 | -1) => {
    const ex = cx + side * half;
    const ey = cy + 40;
    const padR = o.padStyle === "thick" ? o.cupR * 1.22 : o.cupR;
    return `
      <circle cx="${ex}" cy="${ey}" r="${padR}" fill="url(#body)" />
      <circle cx="${ex}" cy="${ey}" r="${padR * 0.62}" fill="${o.padStyle === "open" ? "url(#grille)" : PALETTE.bodyDark}" stroke="${accent}" stroke-width="3" />
      ${o.fold ? `<rect x="${ex - 5}" y="${ey - padR - 14}" width="10" height="16" rx="2" fill="url(#metal)" />` : ""}
      ${o.led && side === 1 ? `<circle cx="${ex + padR * 0.55}" cy="${ey - padR * 0.55}" r="6" fill="${PALETTE.screenGlow}" />` : ""}
    `;
  };
  const cable = o.cable
    ? `<path d="M ${cx - half} ${cy + 40 + o.cupR} q -10 60 10 80 t 4 70" fill="none" stroke="${PALETTE.cableDark}" stroke-width="5" stroke-linecap="round" />`
    : "";
  return `
    ${groundShadow(cx, cy + 40 + o.cupR + 30, half + o.cupR + 20)}
    <path d="M ${cx - half} ${cy - 20} Q ${cx - half} ${bandTopY} ${cx} ${bandTopY} Q ${cx + half} ${bandTopY} ${cx + half} ${cy - 20}"
      fill="none" stroke="url(#metal)" stroke-width="${o.compact ? 12 : 16}" stroke-linecap="round" />
    <path d="M ${cx - half} ${cy - 20} Q ${cx - half} ${bandTopY} ${cx} ${bandTopY} Q ${cx + half} ${bandTopY} ${cx + half} ${cy - 20}"
      fill="none" stroke="${PALETTE.bodyDark}" stroke-width="${o.compact ? 5 : 6}" stroke-linecap="round" opacity="0.5" />
    ${cup(-1)}
    ${cup(1)}
    ${cable}`;
}

// ---------------------------------------------------------------------------
// Rack / desktop electronics (EQs, amps, interfaces)
// ---------------------------------------------------------------------------
type PanelOpts = {
  w: number;
  h: number;
  cy: number;
  kind: "knobs" | "sliders" | "meters" | "screen" | "bigKnob" | "stripVertical";
  rows?: number;
  cols?: number;
  sliderCount?: number;
  meterCount?: number;
  jacks?: number;
  desktop?: boolean; // small feet, not a rack ear panel
  screenLabel?: string;
  mic?: boolean;
};

function panel(o: PanelOpts): string {
  const cx = 400;
  const x = cx - o.w / 2;
  const y = o.cy - o.h / 2;
  const rackEars = !o.desktop
    ? `<rect x="${x - 22}" y="${y}" width="20" height="${o.h}" rx="3" fill="url(#metal)" />
       <circle cx="${x - 12}" cy="${y + 14}" r="4" fill="${PALETTE.metalDark}" />
       <circle cx="${x - 12}" cy="${y + o.h - 14}" r="4" fill="${PALETTE.metalDark}" />
       <rect x="${x + o.w + 2}" y="${y}" width="20" height="${o.h}" rx="3" fill="url(#metal)" />
       <circle cx="${x + o.w + 12}" cy="${y + 14}" r="4" fill="${PALETTE.metalDark}" />
       <circle cx="${x + o.w + 12}" cy="${y + o.h - 14}" r="4" fill="${PALETTE.metalDark}" />`
    : `<rect x="${x + 10}" y="${y + o.h}" width="14" height="10" fill="${PALETTE.metalDark}" />
       <rect x="${x + o.w - 24}" y="${y + o.h}" width="14" height="10" fill="${PALETTE.metalDark}" />`;

  let inner = "";
  if (o.kind === "knobs") {
    const rows = o.rows ?? 1;
    const cols = o.cols ?? 4;
    const r = Math.min((o.w / (cols + 1)) * 0.32, (o.h / (rows + 1)) * 0.34);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const kx = x + (o.w / (cols + 1)) * (col + 1);
        const ky = y + (o.h / (rows + 1)) * (row + 1);
        inner += `<circle cx="${kx}" cy="${ky}" r="${r}" fill="url(#knob)" />
          <line x1="${kx}" y1="${ky}" x2="${kx}" y2="${ky - r * 0.75}" stroke="${PALETTE.bodyDark}" stroke-width="2.4" />`;
      }
    }
  } else if (o.kind === "bigKnob") {
    const r = Math.min(o.w, o.h) * 0.28;
    inner = `<circle cx="${cx}" cy="${o.cy}" r="${r}" fill="url(#knob)" />
      <line x1="${cx}" y1="${o.cy}" x2="${cx + r * 0.68}" y2="${o.cy - r * 0.4}" stroke="${PALETTE.bodyDark}" stroke-width="3" />
      ${Array.from({ length: 9 })
        .map((_, i) => {
          const a = (-135 + i * 33.75) * (Math.PI / 180);
          const x1 = cx + Math.cos(a) * (r + 8);
          const y1 = o.cy + Math.sin(a) * (r + 8);
          const x2 = cx + Math.cos(a) * (r + 16);
          const y2 = o.cy + Math.sin(a) * (r + 16);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PALETTE.metalDark}" stroke-width="2" />`;
        })
        .join("")}`;
  } else if (o.kind === "sliders") {
    const count = o.sliderCount ?? 15;
    const slotW = (o.w - 24) / count;
    for (let i = 0; i < count; i++) {
      const sx = x + 12 + slotW * i + slotW / 2;
      const capY = y + 18 + ((i * 37) % (o.h - 60));
      inner += `<line x1="${sx}" y1="${y + 14}" x2="${sx}" y2="${y + o.h - 14}" stroke="${PALETTE.bodyDark}" stroke-width="3" />
        <rect x="${sx - slotW * 0.28}" y="${capY}" width="${slotW * 0.56}" height="10" rx="2" fill="url(#metal)" />`;
    }
  } else if (o.kind === "meters") {
    const count = o.meterCount ?? 2;
    const r = Math.min(o.w / (count * 2.4), o.h * 0.32);
    for (let i = 0; i < count; i++) {
      const mx = x + (o.w / (count + 1)) * (i + 1);
      const my = o.cy;
      inner += `<circle cx="${mx}" cy="${my}" r="${r}" fill="url(#meterGlass)" stroke="${PALETTE.bodyDark}" stroke-width="3" />
        <line x1="${mx}" y1="${my + r * 0.15}" x2="${mx + r * 0.55}" y2="${my - r * 0.55}" stroke="${PALETTE.bracket}" stroke-width="3" stroke-linecap="round" />
        ${Array.from({ length: 5 })
          .map((_, k) => {
            const a = (200 + k * 35) * (Math.PI / 180);
            const x1 = mx + Math.cos(a) * (r - 6);
            const y1 = my + Math.sin(a) * (r - 6);
            const x2 = mx + Math.cos(a) * (r - 1);
            const y2 = my + Math.sin(a) * (r - 1);
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PALETTE.bodyDark}" stroke-width="1.6" />`;
          })
          .join("")}`;
    }
  } else if (o.kind === "screen") {
    const sw = o.w * 0.55;
    const sh = o.h * 0.42;
    const sx = cx - sw / 2;
    const sy = o.cy - sh / 2 - 6;
    inner = `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="4" fill="url(#screen)" stroke="${PALETTE.metalDark}" stroke-width="2" />
      <text x="${cx}" y="${sy + sh / 2 + 6}" font-family="monospace" font-size="16" fill="${PALETTE.screenGlow}" text-anchor="middle">${o.screenLabel ?? "-- dB"}</text>
      ${o.mic ? `<circle cx="${sx + sw + 26}" cy="${sy + sh / 2}" r="12" fill="url(#metal)" /><circle cx="${sx + sw + 26}" cy="${sy + sh / 2}" r="12" fill="url(#grille)" opacity="0.6" />` : ""}
      ${Array.from({ length: 3 })
        .map(
          (_, i) =>
            `<circle cx="${cx - 30 + i * 30}" cy="${o.cy + sh / 2 + 20}" r="7" fill="url(#knob)" />`,
        )
        .join("")}`;
  } else if (o.kind === "stripVertical") {
    const meterR = o.w * 0.28;
    inner = `<circle cx="${cx}" cy="${y + o.h * 0.2}" r="${meterR}" fill="url(#meterGlass)" stroke="${PALETTE.bodyDark}" stroke-width="3" />
      <line x1="${cx}" y1="${y + o.h * 0.2 + meterR * 0.15}" x2="${cx + meterR * 0.5}" y2="${y + o.h * 0.2 - meterR * 0.5}" stroke="${PALETTE.bracket}" stroke-width="2.6" stroke-linecap="round" />
      ${[0.44, 0.56].map((f) => `<circle cx="${x + o.w * (f === 0.44 ? 0.32 : 0.68)}" cy="${y + o.h * 0.48}" r="${o.w * 0.14}" fill="url(#knob)" />`).join("")}
      <rect x="${cx - o.w * 0.12}" y="${y + o.h * 0.62}" width="${o.w * 0.24}" height="${o.h * 0.3}" rx="4" fill="${PALETTE.bodyDark}" />
      <rect x="${cx - o.w * 0.07}" y="${y + o.h * 0.68}" width="${o.w * 0.14}" height="14" rx="2" fill="url(#metal)" />`;
  }

  const jacks = o.jacks
    ? Array.from({ length: o.jacks })
        .map((_, i) => {
          const jx = x + (o.w / (o.jacks! + 1)) * (i + 1);
          const jy = y + o.h - 16;
          return `<circle cx="${jx}" cy="${jy}" r="7" fill="${PALETTE.bodyDark}" stroke="url(#metal)" stroke-width="2" />`;
        })
        .join("")
    : "";

  return `
    ${groundShadow(cx, y + o.h + (o.desktop ? 22 : 12), o.w * 0.56)}
    ${rackEars}
    <rect x="${x}" y="${y}" width="${o.w}" height="${o.h}" rx="6" fill="url(#metal)" />
    <rect x="${x + 4}" y="${y + 4}" width="${o.w - 8}" height="${o.h - 8}" rx="4" fill="none" stroke="#000" stroke-opacity="0.2" stroke-width="1.5" />
    ${inner}
    ${jacks}`;
}

// ---------------------------------------------------------------------------
// Cables
// ---------------------------------------------------------------------------
type CableOpts = { connector: "xlr" | "trs" | "usbc" | "toslink"; ferrite?: boolean; glow?: boolean };

function cable(o: CableOpts): string {
  const path = "M 220 560 C 300 460, 340 420, 300 360 S 220 260, 300 220 S 460 260, 500 340 S 560 500, 600 460";
  const connectorAt = (x: number, y: number, flip: boolean) => {
    const s = flip ? -1 : 1;
    if (o.connector === "xlr") {
      return `<circle cx="${x}" cy="${y}" r="26" fill="url(#metal)" stroke="${PALETTE.metalDark}" stroke-width="2" />
        <circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${PALETTE.bodyDark}" stroke-width="3" opacity="0.4" />
        <circle cx="${x}" cy="${y - 9}" r="3" fill="${PALETTE.bodyDark}" />
        <circle cx="${x - 8}" cy="${y + 6}" r="3" fill="${PALETTE.bodyDark}" />
        <circle cx="${x + 8}" cy="${y + 6}" r="3" fill="${PALETTE.bodyDark}" />`;
    }
    if (o.connector === "trs") {
      return `<rect x="${x - 10}" y="${y - 34 * s}" width="20" height="34" rx="9" fill="url(#metal)" />
        <rect x="${x - 10}" y="${y - 34 * s + (flip ? 22 : 4)}" width="20" height="6" fill="${PALETTE.bodyDark}" />
        <rect x="${x - 10}" y="${y - 34 * s + (flip ? 10 : 16)}" width="20" height="6" fill="${PALETTE.bodyDark}" />`;
    }
    if (o.connector === "usbc") {
      return `
        ${o.ferrite ? `<rect x="${x - 22}" y="${y - 14}" width="30" height="28" rx="8" fill="${PALETTE.bodyDark}" />` : ""}
        <rect x="${x - 4}" y="${y - 12}" width="24" height="24" rx="7" fill="url(#metal)" />`;
    }
    // toslink
    return `<rect x="${x - 14}" y="${y - 14}" width="28" height="28" rx="4" fill="${PALETTE.bodyDark}" stroke="url(#metal)" stroke-width="3" />
      ${o.glow ? `<circle cx="${x}" cy="${y}" r="6" fill="${PALETTE.screenGlow}" opacity="0.9" />` : ""}`;
  };
  return `
    ${groundShadow(400, 610, 210)}
    <path d="${path}" fill="none" stroke="${PALETTE.cableDark}" stroke-width="14" stroke-linecap="round" />
    <path d="${path}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="14" stroke-linecap="round" stroke-dasharray="1 26" />
    ${connectorAt(220, 560, false)}
    ${connectorAt(600, 460, true)}`;
}

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------
function isoPad(): string {
  return `
    ${groundShadow(400, 560, 190)}
    <path d="M 220 520 L 260 400 L 540 400 L 580 520 Z" fill="url(#foam)" stroke="${PALETTE.metalDark}" stroke-width="2" />
    ${Array.from({ length: 6 })
      .map((_, i) =>
        Array.from({ length: 3 })
          .map((_, j) => {
            const x = 250 + i * 52;
            const y = 425 + j * 32;
            return `<circle cx="${x}" cy="${y}" r="6" fill="${PALETTE.bodyDark}" opacity="0.18" />`;
          })
          .join(""),
      )
      .join("")}`;
}

function tiltStand(): string {
  // Side-profile wedge riser: short front edge, tall back edge, slanted top
  // where the monitor sits — drawn as one solid shape so it doesn't read as
  // two disconnected pieces.
  const x1 = 250;
  const x2 = 550;
  const yBase = 540;
  const frontTopY = 500;
  const backTopY = 420;
  return `
    ${groundShadow(400, yBase + 14, 170)}
    <path d="M ${x1} ${yBase} L ${x1} ${frontTopY} L ${x2} ${backTopY} L ${x2} ${yBase} Z"
      fill="url(#body)" stroke="${PALETTE.bodyDark}" stroke-width="2" />
    <line x1="${x1}" y1="${frontTopY}" x2="${x2}" y2="${backTopY}" stroke="url(#metal)" stroke-width="5" stroke-linecap="round" />
    <circle cx="${x1 + 24}" cy="${yBase - 14}" r="7" fill="${PALETTE.bodyDark}" opacity="0.5" />
    <circle cx="${x2 - 24}" cy="${yBase - 14}" r="7" fill="${PALETTE.bodyDark}" opacity="0.5" />`;
}

function headphoneStand(): string {
  return `
    ${groundShadow(400, 600, 130)}
    <ellipse cx="400" cy="588" rx="90" ry="20" fill="url(#metal)" />
    <rect x="392" y="300" width="16" height="290" rx="6" fill="url(#metal)" />
    <path d="M 320 300 Q 400 250 480 300" fill="none" stroke="url(#metal)" stroke-width="16" stroke-linecap="round" />
  `;
}

function rackEarsIllustration(): string {
  return `
    ${groundShadow(400, 560, 190)}
    <path d="M 260 320 L 260 540 L 320 540 L 320 400 L 540 400 L 540 320 Z" fill="url(#metal)" stroke="${PALETTE.metalDark}" stroke-width="2" />
    ${[
      [290, 350],
      [290, 420],
      [290, 490],
      [420, 350],
      [500, 350],
    ]
      .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="9" fill="${PALETTE.bodyDark}" />`)
      .join("")}`;
}

function foamPanel(): string {
  const wedges = Array.from({ length: 7 })
    .map((_, i) => {
      const x = 240 + i * 45;
      return `<path d="M ${x} 520 L ${x + 22} 380 L ${x + 45} 520 Z" fill="url(#foam)" stroke="${PALETTE.metalDark}" stroke-width="1" />`;
    })
    .join("");
  return `
    ${groundShadow(400, 560, 190)}
    <rect x="230" y="510" width="340" height="26" rx="3" fill="${PALETTE.bodyDark}" />
    ${wedges}`;
}

// ---------------------------------------------------------------------------
// Per-product illustrations
// ---------------------------------------------------------------------------
const ILLUSTRATIONS: Record<string, () => string> = {
  // Studio monitors
  "datum-3-compact-monitor": () =>
    monitor({ w: 190, h: 250, cy: 420, tweeter: true, coax: false, woofer: 62, port: "front" }),
  "datum-5-nearfield-monitor": () =>
    monitor({ w: 230, h: 300, cy: 430, tweeter: true, coax: false, woofer: 78, port: "rear" }),
  "datum-5-mkii-nearfield-monitor": () =>
    monitor({ w: 230, h: 300, cy: 430, tweeter: true, coax: false, woofer: 78, port: "rear", badge: "II" }),
  "datum-8-studio-monitor": () =>
    monitor({ w: 300, h: 380, cy: 450, tweeter: true, coax: false, woofer: 104, port: "rear", angled: true }),
  "reference-6-coaxial-monitor": () =>
    monitor({ w: 250, h: 320, cy: 430, tweeter: true, coax: true, woofer: 92, port: "rear", angled: true }),
  "fieldglass-portable-monitor": () =>
    monitor({ w: 200, h: 250, cy: 420, tweeter: true, coax: false, woofer: 64, port: "front", handle: true }),
  "baseline-10-studio-subwoofer": () =>
    monitor({ w: 320, h: 300, cy: 460, tweeter: false, coax: false, woofer: 118, port: "front" }),

  // Headphones
  "calibrate-open-back-headphones": () =>
    headphones({ span: 300, cupR: 78, padStyle: "open", cable: true }),
  "calibrate-closed-back-headphones": () =>
    headphones({ span: 300, cupR: 78, padStyle: "closed", cable: true }),
  "calibrate-mix-lite-headphones": () =>
    headphones({ span: 240, cupR: 58, padStyle: "closed", compact: true, cable: true }),
  "calibrate-pro-reference-headphones": () =>
    headphones({ span: 300, cupR: 80, padStyle: "open", cable: true, premium: true }),
  "fieldglass-portable-headphones": () =>
    headphones({ span: 240, cupR: 60, padStyle: "closed", compact: true, fold: true, cable: true }),
  "calibrate-wireless-monitor-headphones": () =>
    headphones({ span: 250, cupR: 62, padStyle: "closed", compact: true, led: true }),
  "calibrate-iso-tracking-headphones": () =>
    headphones({ span: 290, cupR: 80, padStyle: "thick", cable: true }),

  // Equalizers & DSP
  "parametric-4-channel-eq": () =>
    panel({ w: 420, h: 220, cy: 400, kind: "knobs", rows: 2, cols: 4, jacks: 4 }),
  "parametric-8-channel-eq": () =>
    panel({ w: 560, h: 240, cy: 400, kind: "knobs", rows: 2, cols: 8, jacks: 8 }),
  "graphic-15-band-eq": () =>
    panel({ w: 480, h: 220, cy: 400, kind: "sliders", sliderCount: 15 }),
  "graphic-31-band-eq": () =>
    panel({ w: 560, h: 220, cy: 400, kind: "sliders", sliderCount: 31 }),
  "contour-desktop-eq": () =>
    panel({ w: 260, h: 180, cy: 420, kind: "knobs", rows: 1, cols: 4, desktop: true }),
  "room-correction-dsp-processor": () =>
    panel({ w: 420, h: 200, cy: 400, kind: "screen", screenLabel: "-2.4 dB", mic: true, jacks: 2 }),
  "contour-mastering-eq": () =>
    panel({ w: 340, h: 220, cy: 400, kind: "knobs", rows: 2, cols: 3, jacks: 2 }),
  "headroom-channel-strip-eq": () =>
    panel({ w: 220, h: 420, cy: 420, kind: "stripVertical", desktop: true }),

  // Amplifiers & interfaces
  "current-2-headphone-amplifier": () =>
    panel({ w: 240, h: 180, cy: 420, kind: "bigKnob", desktop: true, jacks: 2 }),
  "current-8-monitor-controller": () =>
    panel({ w: 340, h: 220, cy: 400, kind: "meters", meterCount: 2, desktop: true }),
  "interface-4-audio-interface": () =>
    panel({ w: 300, h: 180, cy: 410, kind: "knobs", rows: 1, cols: 2, desktop: true, jacks: 4 }),
  "interface-8-audio-interface": () =>
    panel({ w: 500, h: 220, cy: 400, kind: "knobs", rows: 1, cols: 4, jacks: 8 }),
  "current-100-power-amplifier": () =>
    panel({ w: 480, h: 240, cy: 400, kind: "meters", meterCount: 2, jacks: 4 }),
  "headroom-preamp": () =>
    panel({ w: 360, h: 200, cy: 400, kind: "knobs", rows: 1, cols: 2, jacks: 2 }),
  "current-dac-reference-converter": () =>
    panel({ w: 400, h: 190, cy: 400, kind: "screen", screenLabel: "192 kHz", jacks: 2 }),

  // Cables & accessories
  "line-xlr-cable": () => cable({ connector: "xlr" }),
  "line-trs-instrument-cable": () => cable({ connector: "trs" }),
  "line-usb-c-interface-cable": () => cable({ connector: "usbc", ferrite: true }),
  "line-optical-cable": () => cable({ connector: "toslink", glow: true }),
  "ledger-monitor-isolation-pads": () => isoPad(),
  "ledger-desktop-monitor-stands": () => tiltStand(),
  "ledger-headphone-stand": () => headphoneStand(),
  "ledger-rack-mount-kit": () => rackEarsIllustration(),
  "ledger-acoustic-foam-panel-set": () => foamPanel(),
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Clear previously generated (shared, low-variety) placeholder art.
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith(".webp")) unlinkSync(join(OUT_DIR, file));
  }

  const slugs = Object.keys(ILLUSTRATIONS);
  for (const slug of slugs) {
    const svg = wrap(ILLUSTRATIONS[slug]());
    const outPath = join(OUT_DIR, `${slug}.webp`);
    await sharp(Buffer.from(svg)).resize(SIZE, SIZE).webp({ quality: 82 }).toFile(outPath);
    process.stdout.write(`${slug}.webp\n`);
  }
  console.log(`Generated ${slugs.length} product images in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
