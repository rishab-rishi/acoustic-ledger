// One-off: builds the App Router icon files from public/logo-mark.svg.
// Run with: npx tsx scripts/generate-favicon.ts
import { copyFileSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = join(__dirname, "..");
const LOGO = join(ROOT, "public", "logo-mark.svg");
const APP_DIR = join(ROOT, "src", "app");

async function main() {
  // Next.js requires the literal file inside app/ for the `icon` convention.
  copyFileSync(LOGO, join(APP_DIR, "icon.svg"));

  await sharp(LOGO).resize(180, 180).png().toFile(join(APP_DIR, "apple-icon.png"));

  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(LOGO).resize(size, size).png().toBuffer()),
  );
  const ico = await pngToIco(pngBuffers);
  writeFileSync(join(APP_DIR, "favicon.ico"), ico);

  console.log("Wrote icon.svg, apple-icon.png, favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
