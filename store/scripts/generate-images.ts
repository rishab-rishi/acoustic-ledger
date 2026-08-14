/**
 * Generates the product photography set for the seed data.
 *
 * Acoustic Ledger's catalog images are procedural "technical drawing"
 * renders (paper background, fine grid, copper accent) rather than stock
 * photography — this keeps the look consistent across the whole catalog
 * and avoids depending on a third-party image host at demo time.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SIZE = 1200;

const PAPER = "#f3efe7";
const GRID = "#e4ddce";
const INK = "#232019";
const INK_SOFT = "#57524a";
const COPPER = "#b3703b";

function frame(inner: string) {
  return `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${GRID}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#grid)"/>
  <rect x="60" y="60" width="${SIZE - 120}" height="${SIZE - 120}" fill="none" stroke="${INK_SOFT}" stroke-width="1.5" opacity="0.5"/>
  ${corners()}
  <g>${inner}</g>
</svg>`.trim();
}

function corners() {
  const m = 60;
  const l = 28;
  const pts = [
    [m, m, l, 0, 0, l],
    [SIZE - m, m, -l, 0, 0, l],
    [m, SIZE - m, l, 0, 0, -l],
    [SIZE - m, SIZE - m, -l, 0, 0, -l],
  ];
  return pts
    .map(
      ([x, y, dx1, dy1, dx2, dy2]) =>
        `<path d="M ${x! + dx1!} ${y! + dy1!} L ${x} ${y} L ${x! + dx2!} ${y! + dy2!}" fill="none" stroke="${COPPER}" stroke-width="3"/>`
    )
    .join("");
}

const CX = SIZE / 2;
const CY = SIZE / 2;

// --- Glyphs ---

function monitorGlyph({ angled = false, sub = false }: { angled?: boolean; sub?: boolean } = {}) {
  const w = sub ? 420 : 340;
  const h = sub ? 520 : 480;
  const x = CX - w / 2;
  const y = CY - h / 2;
  const tweeterR = sub ? 0 : 46;
  const wooferR = sub ? 150 : 90;
  const transform = angled ? `rotate(-8 ${CX} ${CY})` : "";
  return `
  <g transform="${transform}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${INK}" />
    <rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="8" fill="none" stroke="${PAPER}" stroke-width="2" opacity="0.15"/>
    ${
      tweeterR
        ? `<circle cx="${CX}" cy="${y + 90}" r="${tweeterR}" fill="${PAPER}" opacity="0.92"/>
           <circle cx="${CX}" cy="${y + 90}" r="${tweeterR - 14}" fill="${INK}" />
           <circle cx="${CX}" cy="${y + 90}" r="8" fill="${COPPER}"/>`
        : ""
    }
    <circle cx="${CX}" cy="${y + h - wooferR - 60}" r="${wooferR}" fill="${PAPER}" opacity="0.92"/>
    <circle cx="${CX}" cy="${y + h - wooferR - 60}" r="${wooferR - 22}" fill="${INK}" />
    <circle cx="${CX}" cy="${y + h - wooferR - 60}" r="10" fill="${COPPER}"/>
    <rect x="${x + w / 2 - 30}" y="${y + h - 34}" width="60" height="14" rx="3" fill="${COPPER}" opacity="0.85"/>
  </g>`;
}

function headphoneGlyph({ compact = false }: { compact?: boolean } = {}) {
  const r = compact ? 210 : 250;
  const cupR = compact ? 70 : 88;
  const cupY = CY + 40;
  return `
  <path d="M ${CX - r} ${cupY} A ${r} ${r} 0 0 1 ${CX + r} ${cupY}" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>
  <circle cx="${CX - r}" cy="${cupY}" r="${cupR}" fill="${INK}"/>
  <circle cx="${CX - r}" cy="${cupY}" r="${cupR - 20}" fill="${PAPER}" opacity="0.9"/>
  <circle cx="${CX - r}" cy="${cupY}" r="10" fill="${COPPER}"/>
  <circle cx="${CX + r}" cy="${cupY}" r="${cupR}" fill="${INK}"/>
  <circle cx="${CX + r}" cy="${cupY}" r="${cupR - 20}" fill="${PAPER}" opacity="0.9"/>
  <circle cx="${CX + r}" cy="${cupY}" r="10" fill="${COPPER}"/>
  `;
}

function eqSlidersGlyph() {
  const count = 7;
  const spacing = 70;
  const startX = CX - ((count - 1) * spacing) / 2;
  const trackTop = CY - 220;
  const trackH = 440;
  const heights = [0.3, 0.55, 0.75, 0.5, 0.35, 0.6, 0.45];
  return `
  <rect x="${CX - 300}" y="${CY - 280}" width="600" height="560" rx="10" fill="${INK}"/>
  ${heights
    .map((f, i) => {
      const x = startX + i * spacing;
      const capY = trackTop + (1 - f) * trackH;
      return `
      <line x1="${x}" y1="${trackTop}" x2="${x}" y2="${trackTop + trackH}" stroke="${PAPER}" stroke-width="4" opacity="0.35"/>
      <rect x="${x - 22}" y="${capY - 10}" width="44" height="20" rx="4" fill="${COPPER}"/>
      `;
    })
    .join("")}
  `;
}

function eqKnobsGlyph() {
  const rows = 2;
  const cols = 4;
  const spacingX = 150;
  const spacingY = 170;
  const startX = CX - ((cols - 1) * spacingX) / 2;
  const startY = CY - ((rows - 1) * spacingY) / 2;
  let knobs = "";
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * spacingX;
      const y = startY + r * spacingY;
      const angle = -120 + ((i * 47) % 240);
      i++;
      const rad = (angle * Math.PI) / 180;
      const tickX = x + Math.sin(rad) * 34;
      const tickY = y - Math.cos(rad) * 34;
      knobs += `
        <circle cx="${x}" cy="${y}" r="46" fill="${INK}"/>
        <circle cx="${x}" cy="${y}" r="46" fill="none" stroke="${PAPER}" stroke-width="2" opacity="0.2"/>
        <line x1="${x}" y1="${y}" x2="${tickX}" y2="${tickY}" stroke="${COPPER}" stroke-width="5" stroke-linecap="round"/>
      `;
    }
  }
  return `<rect x="${CX - 340}" y="${CY - 260}" width="680" height="520" rx="10" fill="${INK}" opacity="0.06"/>${knobs}`;
}

function ampGlyph({ meters = true }: { meters?: boolean } = {}) {
  const w = 620;
  const h = 320;
  const x = CX - w / 2;
  const y = CY - h / 2;
  const body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${INK}"/>`;
  if (meters) {
    const arc = (mx: number) => {
      const r = 90;
      const cyM = y + h / 2 + 20;
      return `
        <path d="M ${mx - r} ${cyM} A ${r} ${r} 0 0 1 ${mx + r} ${cyM}" fill="none" stroke="${PAPER}" stroke-width="4" opacity="0.5"/>
        <line x1="${mx}" y1="${cyM}" x2="${mx + 55}" y2="${cyM - 65}" stroke="${COPPER}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="${mx}" cy="${cyM}" r="8" fill="${COPPER}"/>
      `;
    };
    return `${body}${arc(CX - 150)}${arc(CX + 150)}`;
  }
  let jacks = "";
  for (let i = 0; i < 5; i++) {
    const jx = x + 90 + i * 110;
    jacks += `<circle cx="${jx}" cy="${y + h / 2}" r="26" fill="${PAPER}" opacity="0.9"/><circle cx="${jx}" cy="${y + h / 2}" r="10" fill="${INK}"/>`;
  }
  return `${body}${jacks}<rect x="${x + w - 140}" y="${y + h / 2 - 8}" width="90" height="16" rx="4" fill="${COPPER}"/>`;
}

function cableGlyph({ xlr = true }: { xlr?: boolean } = {}) {
  let path = `M ${CX - 260} ${CY + 200} `;
  const coils = 5;
  for (let i = 0; i < coils; i++) {
    const cx1 = CX - 260 + (i + 0.5) * (520 / coils);
    const dir = i % 2 === 0 ? -1 : 1;
    path += `Q ${cx1} ${CY + 200 + dir * 220} ${CX - 260 + (i + 1) * (520 / coils)} ${CY + 200} `;
  }
  const connector = xlr
    ? `<circle cx="${CX + 300}" cy="${CY + 200}" r="60" fill="${INK}"/><circle cx="${CX + 300}" cy="${CY + 200}" r="60" fill="none" stroke="${COPPER}" stroke-width="4"/><circle cx="${CX + 300}" cy="${CY + 170}" r="7" fill="${COPPER}"/><circle cx="${CX + 280}" cy="${CY + 215}" r="7" fill="${COPPER}"/><circle cx="${CX + 320}" cy="${CY + 215}" r="7" fill="${COPPER}"/>`
    : `<rect x="${CX + 260}" y="${CY + 170}" width="90" height="60" rx="10" fill="${INK}"/><rect x="${CX + 340}" y="${CY + 188}" width="30" height="24" rx="4" fill="${COPPER}"/>`;
  return `<path d="${path}" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>${connector}`;
}

function standGlyph() {
  return `
  <rect x="${CX - 200}" y="${CY - 220}" width="400" height="60" rx="8" fill="${INK}"/>
  <rect x="${CX - 30}" y="${CY - 160}" width="60" height="260" fill="${INK}" opacity="0.85"/>
  <rect x="${CX - 220}" y="${CY + 100}" width="440" height="70" rx="8" fill="${INK}"/>
  <circle cx="${CX - 150}" cy="${CY + 135}" r="10" fill="${COPPER}"/>
  <circle cx="${CX + 150}" cy="${CY + 135}" r="10" fill="${COPPER}"/>
  `;
}

const IMAGES: Record<string, string> = {
  "monitor-front-01": monitorGlyph(),
  "monitor-angle-02": monitorGlyph({ angled: true }),
  "monitor-sub-03": monitorGlyph({ sub: true }),
  "headphone-over-01": headphoneGlyph(),
  "headphone-compact-02": headphoneGlyph({ compact: true }),
  "eq-sliders-01": eqSlidersGlyph(),
  "eq-knobs-02": eqKnobsGlyph(),
  "amp-meters-01": ampGlyph({ meters: true }),
  "interface-jacks-02": ampGlyph({ meters: false }),
  "cable-xlr-01": cableGlyph({ xlr: true }),
  "cable-trs-02": cableGlyph({ xlr: false }),
  "stand-iso-01": standGlyph(),
};

async function main() {
  const outDir = path.resolve(process.cwd(), "public/products");
  await mkdir(outDir, { recursive: true });

  for (const [name, glyph] of Object.entries(IMAGES)) {
    const svg = frame(glyph);
    const outPath = path.join(outDir, `${name}.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(outPath);
    console.log(`wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
