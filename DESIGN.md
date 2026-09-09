---
name: Acoustic Ledger
description: A studio-audio storefront built as a loaded 19-inch equipment rack — matte anodized panels, silkscreen legends, and LED readouts.
colors:
  panel-black: "#141414"
  panel: "#1c1c1e"
  panel-raised: "#262629"
  panel-sunken: "#0f0f10"
  popover: "#212124"
  faceplate-text: "#ECEAE3"
  silkscreen-grey: "#9c988d"
  seam: "#333330"
  seam-strong: "#47463f"
  field-stroke: "#38372f"
  ramp-red: "#ff3b30"
  ramp-orange: "#ff9a00"
  ramp-yellow: "#ffe100"
  ramp-white: "#f2f2f2"
  led-red: "#ff5a4b"
  amber-armed: "#ff9a00"
  primary-ink: "#180706"
  amber-ink: "#1a1103"
typography:
  display:
    fontFamily: "Saira Condensed, Saira, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Saira Condensed, Saira, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Saira Condensed, Saira, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "normal"
  body:
    fontFamily: "Saira, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.1em"
  readout:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
    fontFeature: "tabular-nums"
rounded:
  seg: "1px"
  chip: "2px"
  key: "3px"
  panel: "0"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ramp-red}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.ramp-red}"
    textColor: "{colors.primary-ink}"
  button-outline:
    backgroundColor: "{colors.panel-black}"
    textColor: "{colors.faceplate-text}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.faceplate-text}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "32px"
  chip-variant:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.silkscreen-grey}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "6px 12px"
  chip-variant-selected:
    backgroundColor: "{colors.amber-ink}"
    textColor: "{colors.ramp-orange}"
    rounded: "{rounded.chip}"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.faceplate-text}"
    typography: "{typography.body}"
    rounded: "{rounded.key}"
    padding: "4px 10px"
    height: "32px"
  card-faceplate:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.faceplate-text}"
    rounded: "{rounded.panel}"
    padding: "16px"
  led-readout:
    backgroundColor: "#0b0b0c"
    textColor: "{colors.led-red}"
    typography: "{typography.readout}"
    rounded: "{rounded.chip}"
    padding: "4px 8px"
---

# Design System: Acoustic Ledger

## Overview

**Creative North Star: "The Rack"**

The storefront is a loaded 19-inch outboard equipment rack, and every product is a faceplate bolted onto it. The page ground is not a background behind content — it *is* matte anodized panel metal, edge to edge, carrying fine silkscreen-print grain and a faint corner-to-corner tonal drift so it never reads as one flat hex. The visitor lands looking at inventory, not a hero: five category modules stacked in rack-unit rows between two screw-punched rails, then a "NOW LOADED" strip of featured units at the fold.

The world is anti-hype by construction. The audience — audio engineers, producers, studio owners — is measurement-literate and skeptical of marketing gloss, so the interface behaves like their own rack: one number per row, specs ruled inline, unlit means unavailable. The only functional color is the TR-808 "velocity ramp" (red to white), mapping stock and price tiers. Amber is rationed to armed/active states. Light itself is rationed: LEDs and segmented readouts are the *only* elements that emit it — no glow, no glass, no gradients on components.

It explicitly refuses two category defaults: the grid of product photos on white, and the audiophile-black-with-neon cliche. Product imagery (12 shared placeholder shots, an acknowledged asset gap) is deliberately suppressed to dim monochrome reference prints recessed into inset wells, so no photo ever competes with a lit readout.

**Key Characteristics:**
- Panel material is the page ground, full-bleed, with real grain + tonal drift — never a flat fill.
- The 808 velocity ramp (#ff3b30 → #ff9a00 → #ffe100 → #f2f2f2) is the only functional color.
- LEDs and segmented readouts are the only light sources; everything else is matte.
- Silkscreen legend type: Saira Condensed caps for names/numerals, JetBrains Mono for every label, spec, price, and control.
- Modules are near-square panels with rack-screw rivets at the corners and hairline seams; 3px radius on "keys" only.
- Every filter control visibly marks the modules it governs before it commits.

## Colors

A near-black anodized palette with a single saturated ramp for signal; everything structural is a matte grey.

### Primary
- **Velocity Red** (`ramp-red` #ff3b30): The armed action and the empty-tank warning. Fills the primary button ("ADD TO CART"), the header/footer LED status dot, `led-red` readouts, `StockMeter` at 0–5 units, and `destructive` text. Rung 1 of the 808 ramp.
- **Velocity Amber** (`ramp-orange` / `amber-armed` #ff9a00): Rationed to active and armed states only — focus rings, the selected variant chip, the price-fader track and its surviving-count readout, hover accents on silkscreen links, and `StockMeter` at 6–20 units. Rung 2 of the ramp.

### Secondary
- **Velocity Yellow** (`ramp-yellow` #ffe100): `StockMeter` at 21–60 units and the mid-band of the VU-ladder motif. Rung 3.
- **Velocity White** (`ramp-white` #f2f2f2): Full-stock signal (>60 units) and the top of the VU ladder. Rung 4 — the ramp resolves to plain light, not another hue.

### Neutral
- **Panel Black** (`panel-black` #141414): The page ground. Wears grain + tonal-drift gradients; `color-scheme: dark` throughout.
- **Faceplate** (`panel` #1c1c1e): Module/card surface, also the header bar and popovers (#212124).
- **Faceplate Raised** (`panel-raised` #262629): Rack rails, secondary buttons, the `-`/`+` quantity keys.
- **Faceplate Sunken** (`panel-sunken` #0f0f10): Inset wells behind photos, the footer, LED-counter chips, fader tracks, scrollbar track.
- **Ink** (`faceplate-text` #ECEAE3): Primary text — an off-white, never pure #fff.
- **Silkscreen Grey** (`silkscreen-grey` #9c988d): Legends, captions, category tags, muted body — the printed-label color.
- **Seam** (`seam` #333330): Hairline panel borders and inline rules.
- **Seam Strong** (`seam-strong` #47463f): Emphasized edges, registration crosshairs, hover border on faceplates.
- **Field Stroke** (`field-stroke` #38372f): Input borders.
- **LED Red** (`led-red` #ff5a4b): The emissive variant of red — cart counter, total readout — carried with a tight `--led-shadow` (`0 0 2px rgba(255,120,95,0.7)`), bright but never bloomed.

### Named Rules
**The Only-Light Rule.** LEDs, `led-dot`s, and segmented readouts are the only elements permitted to emit light (a tight 2px shadow, no bloom). No glow on text, borders, buttons, or panels.

**The Rationed Amber Rule.** Amber (#ff9a00) means *armed or active* — focus, selection, live filter preview, low-stock. It never appears as decoration or as a default accent on a resting surface.

**The Ramp-Is-The-Only-Color Rule.** Hue is functional. If a color isn't mapping a stock or price tier or an active state, it's greyscale. No brand color outside the ramp.

## Typography

**Display Font:** Saira Condensed (with Saira, system-ui, sans-serif) — weights 500/600/700
**Body Font:** Saira (with system-ui, sans-serif) — weights 400/500/600
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace) — weights 400/500/700

**Character:** Condensed grotesque caps read as engraved panel legends; the monospace carries every number, label, and control like printed silkscreen. Body Saira is the quiet connective prose between them — used sparingly, never for anything measurable.

### Hierarchy
- **Display** (Saira Condensed 700, clamp(1.75rem, 4vw, 2.25rem), tracking 0.04em, UPPERCASE): Category faceplate names on the home rack; product title on the PDP.
- **Headline** (Saira Condensed 700, ~1.5rem, line-height 1.05): PDP product name, section headers where present.
- **Title** (Saira Condensed 600, 1.125rem, line-height 1.15): Product-card name (`h2`), cart line items.
- **Body** (Saira 400, 0.8125rem / 13px, line-height 1.6): Category captions, spec prose, disclosures. Keep to ~65ch.
- **Label** (JetBrains Mono 500, 0.6875rem / 11px, tracking 0.1em, UPPERCASE): The `.silkscreen` class — every legend, nav item, category tag, filter label, "from $X" tag.
- **Readout** (JetBrains Mono 500, 1rem+, `tabular-nums`, tracking 0.04em): Prices, the LED total, cart counter, stock counts, the padded `07` category counts.

### Named Rules
**The Silkscreen Rule.** Any label, spec, price, control text, or nav item is JetBrains Mono, uppercase for labels, wide-tracked at small sizes. Prose sans (Saira) is only for full sentences.

**The Tabular-Numerals Rule.** Every number that a visitor might compare — price, stock, quantity, count — is set `tabular-nums` so columns align down a rack.

## Layout

Centered single column, `max-w-5xl` (64rem) for shop pages, `max-w-6xl` for the footer, gutters `px-4` mobile / `px-6` desktop. Vertical rhythm is Tailwind's default step scale; page padding `py-6` mobile / `py-10` desktop, major sections separated by `mt-12` (48px).

**The rack model.** The home catalog is a vertical stack of full-width faceplate rows (`space-y-2.5`, 10px between rack units) flanked by two 24px `RackRail` columns of punched screw holes (desktop only). The default catalog rhythm is **one product per full-width row** — the list scales by growing, never by wrapping to a grid. Featured units relax to a 2-up grid (`lg:grid-cols-2`); the PDP is a 2-column split (recessed photo well / spec column).

Each faceplate row is an internal grid: identity block (name + LED count + caption) on the left, a control motif centered, and a channel-strip readout (stock meter + price) right-aligned, dropping to a stacked layout with a top border rule below `sm`.

Sticky header (`z-40`) with a semi-opaque faceplate and backdrop blur; footer pinned to viewport bottom via `mt-auto` on a flex-column body.

## Elevation & Depth

Hybrid, but physical rather than floating: depth is **machined bezel**, not drop shadow. Panels are lit on the top edge and shadowed on the bottom with layered *inset* shadows that read as a milled faceplate; the only outward shadow is a 1px seating line (`0 1px 0 rgba(0,0,0,0.6)`). Recession (inset wells, fader tracks, LED chips) uses deep inner shadow. Nothing hovers; state change is a border-color shift or a 1px `translateY` press, not a lift.

### Shadow Vocabulary
- **Faceplate bezel** (`inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(0,0,0,0.25), inset 0 -2px 3px rgba(0,0,0,0.4), 0 1px 0 rgba(0,0,0,0.6)`): The `.panel` module — matte plate with a machined edge.
- **Raised** (`inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.4)`): `.panel-raised` — rails, secondary keys.
- **Inset well** (`inset 0 2px 6px rgba(0,0,0,0.6)`): `.panel-inset` — photo wells, fader tracks, counter chips.
- **Rivet** (`inset 0 0 0 1px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.6)`): The corner screw.
- **LED bloom** (`--led-shadow: 0 0 2px rgba(255,120,95,0.7)`): The *only* emissive shadow — kept tight on purpose.

### Named Rules
**The No-Lift Rule.** Surfaces never rise. Hover shifts a border to Seam Strong or an accent; `:active` presses 1px down. If an element looks like it's floating, it's wrong.

**The Bezel-Not-Shadow Rule.** Depth is built from inset highlights and shadows on the element's own edge. Outward `box-shadow` is limited to the 1px seating line and the LED bloom.

## Shapes

Overwhelmingly rectilinear and hard-cornered. Panels and cards have **no radius** (0). The 3px radius (`--radius`) is reserved for "keys" — buttons and the quantity steppers. LED segments and fader thumbs get 1–2px. The only circles in the system are functional hardware: rivet heads (12px), `led-dot`s (6px), rack screw holes, and the rotary-encoder / patch-jack motifs.

Recurring geometry: rivets at all four corners of a module (`Rivets`); registration crosshairs (`.reg-marks`) at opposite corners of a photo well; hairline seams between stacked rows; the 4-segment LED bar-graph (`StockMeter`) and 16-key dead-key row (`DeadKeys`, the empty-state signature — 15 unlit keys, one lit amber as an invitation).

## Components

### Buttons
- **Shape:** Slightly softened corners (3px radius); mono, uppercase, letter-spacing 0.09em, height 32px default (24/28/36px for xs/sm/lg), horizontal padding 10px.
- **Primary:** Velocity Red fill (#ff3b30) on near-black ink (#180706) — the single armed action per view ("ADD TO CART", "PLACE ORDER"). Hover drops opacity to ~80%.
- **Outline:** Panel-black fill, Seam border, Ink text; hover fills to muted grey. The "Simulate payment" demo action and most secondary CTAs.
- **Secondary:** Panel Raised fill (#262629). Ghost: transparent, hover fills muted.
- **Focus:** 2px Velocity Amber outline, 2px offset (global `:focus-visible`). Active: `translateY(1px)`.

### Chips (variant picker)
- **Style:** Small mono-caps keys. Unselected — Faceplate fill, Seam border, Silkscreen Grey text. Selected — amber-tinted ground (#1a1103) with Velocity Amber text and border, the rationed-amber "armed" read.
- **Out-of-stock variant:** dimmed and struck from selection, matching the unlit-means-unavailable doctrine.

### Cards / Containers
- **Corner Style:** None (0 radius).
- **Background:** Faceplate (#1c1c1e) with carried grain; hover shifts border to Seam Strong, focus-visible to amber.
- **Shadow Strategy:** Faceplate bezel (see Elevation).
- **Border:** 1px Seam, with a lighter top edge (#3d3d39) and darker bottom (#131312).
- **Internal Padding:** 12px product rows, 16–24px category faceplates.
- **Photo well:** `.panel-inset` with `.reg-marks`; image forced to `grayscale(1) brightness(0.3) contrast(1.6)` at 0.6 opacity, partially recovering on group hover.

### Inputs / Fields
- **Style:** Transparent fill, 1px Field Stroke border (#38372f), 32px tall, mono-adjacent body text.
- **Focus:** Border shifts to amber ring with a 3px translucent ring (shadcn Base UI default).
- **Note:** Inputs still carry the incumbent shadcn radius (~4px `rounded-lg`) rather than the 3px key radius — inherited, not art-directed this pass.

### Navigation
- **Style:** Silkscreen labels (Mono 11px, uppercase, tracking 0.1em) in Silkscreen Grey; hover to Ink (nav) or amber (utility links). No underlines, no active-state pill — the current section is not marked.
- **Header:** Engraved "ACOUSTIC LEDGER" plate (inset sunken chip + `led-dot`) left, three category links + "All Units" center (desktop), search glyph / account / LED cart counter right.
- **Mobile:** Nav collapses to a `MobileNav` sheet; center links hidden below `md`.

### Signature: The Price Rail
A dual-handle fader on the catalog channel strip. Track is an inset well; the in-range span is an amber (70% opacity) fill; thumbs are 3px-radius grey caps with a seating shadow. Dragging **live-dims every out-of-range product row** (`opacity: 0.28`, `filter: saturate(0.4)`) and writes a surviving-count readout (`19 / 38`) in amber next to the price range; releasing commits `min`/`max` to the URL query. Verified in the interaction capture. This is the literal expression of "every filter control visibly marks the modules it governs."

### Signature: StockMeter & readouts
4-segment LED bar-graph climbing the 808 ramp: red (≤5 / 0), amber (≤20), yellow (≤60), white (>60); unlit segments are dark wells. `LedReadout` is a segmented numeric display on a #0b0b0c ground with `tone` = neutral off-white / warn amber / crit red. `PanelMotif` draws a per-category control (rotary-encoder cluster / VU LED ladder / patch-jack field), cycled by index.

## Do's and Don'ts

### Do:
- **Do** make panel material the page ground, full-bleed, with the grain data-URI and the two tonal-drift radial gradients — never a flat `#141414` fill.
- **Do** map every use of hue to the 808 ramp (stock tier, price tier) or to an armed/active state; keep everything else greyscale.
- **Do** set labels, prices, specs, and controls in JetBrains Mono, uppercase for labels, `tabular-nums` for anything comparable.
- **Do** keep the primary catalog as one full-width row per product; let it scale by growing, and design zero-results as an invitation (the lit `DeadKeys` key).
- **Do** put rivets at all four corners of a module and hairline seams between stacked rows.
- **Do** reserve the 3px radius for buttons and steppers; keep panels and cards hard-cornered.
- **Do** let filter controls preview their effect (dim the governed rows) before committing to the URL.

### Don't:
- **Don't** add glow, bloom, gradients, or glass to any component — the only emissive shadow is the tight `--led-shadow` on LEDs and readouts.
- **Don't** let a surface float or lift on hover; shift a border color or press 1px instead.
- **Don't** let product photography read as a bright light box — recess it into an inset well and dim it to monochrome.
- **Don't** use amber as decoration or a default resting accent; it means armed/active only.
- **Don't** introduce a brand color, a second accent, or a headline typeface outside Saira Condensed / JetBrains Mono / Saira.
- **Don't** wrap the catalog into a photo grid or add a marketing hero above the rack.

<!-- not-canonized: (1) The `(shop)` area ships lucide-react line icons (search, bag, arrow, +/- steppers); glyph/line icons are a craft-floor defect the build carries, not a system element — future surfaces should prefer drawn hardware marks (SVG motifs, led-dots). (2) `Input`/`Label` and several shadcn/Base UI primitives retain stock radii (~4px), stock 3px focus rings, and light-theme class residue; they render dark by token inheritance but were not art-directed. (3) The `/admin` area inherits `:root` tokens (renders dark) but was not art-directed this pass — treat it as undocumented, not as intentional house style. None repaired here; recorded as pre-existing drift. -->
