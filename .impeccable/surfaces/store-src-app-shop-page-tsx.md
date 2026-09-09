---
version: 1
slug: "store-src-app-shop-page-tsx"
primary_target: "store/src/app/(shop)/page.tsx"
related_targets: ["store/src/app/(shop)/products/(catalog)/page.tsx","store/src/app/(shop)/products/[slug]/page.tsx","store/src/app/(shop)/cart/page.tsx","store/src/components/shop/header.tsx"]
---

Scope: whole `(shop)` storefront — home, catalog, product detail, cart, checkout,
orders, auth. Lead surface: home page. Admin inherits the same tokens (back-of-rack)
but is not art-directed in this pass.

Visitor mode: Persuade (storefront front door), composed catalog-forward — the
homepage shows the gear immediately, no manifesto.

Audience / job / action: audio engineers, producers, studio owners evaluating
monitoring gear against a specific job (a room, a mix stage, a tracking chain).
They browse, filter by category / price / stock, compare variants, check out as
guest or account. Anti-hype, measurement-literate, skeptical of marketing gloss.

Proof / content: the real seeded catalog (5 categories, 38 products, per-variant
stock that can be 0) and its detailed spec copy. 12 shared placeholder product
photos — no per-product photography (asset gap, do not fake). No reviews, press,
benchmarks, or company story exist — none may be invented.

Constraints: money is integer cents; catalog filters stay in the URL query string
(`q`/`category`/`min`/`max`/`sort`); Server Actions return ActionResult; builds must
not touch the DB; keep the footer's "demo store / PayPal sandbox" disclosure.

## Direction contract

THESIS: The storefront is a loaded 19-inch equipment rack, and every product is a
faceplate on it. It refuses the category default — a grid of product photos on
white — and the audiophile-black-with-neon cliche. You land looking at inventory,
not a hero.

OWN-WORLD: Near-black matte anodized panel (#141414–#1C1C1C) as the page's actual
ground, edge to edge, carrying fine silkscreen-print grain and a faint corner-to-
corner tonal drift — never a flat fill. Silkscreen legend type: Saira Condensed
caps, wide-tracked at small sizes, for module names and numerals; JetBrains Mono
for every label, spec, price, and control. The 808 velocity ramp is the only
functional color — red #FF3B30 → orange #FF9A00 → yellow #FFE100 → white #F2F2F2 —
mapping stock and price tiers; amber is rationed to armed/active states; LEDs and
segmented readouts are the ONLY elements that emit light. Modules are square panels
with rack-screw rivets at the corners, hairline #333 seams, 3px radius on "keys"
only. No gradients, no glass, no glow except LEDs.

STORY: The visitor understands within one viewport that this catalog is kept by
people who measure — organized like their own rack. They believe the restraint
(unlit = unavailable, specs ruled inline, one number per row) means nothing is
being oversold. They act by scanning the rack, throwing the in-stock toggle or
dragging the price fader (each visibly marks the modules it governs), and pulling
a faceplate to its product page.

FIRST VIEWPORT: Full-bleed panel ground. Thin rack-rail header — engraved
"ACOUSTIC LEDGER" plate left, silkscreen category nav, LED cart counter right.
Immediately below, no hero: the five categories as five full-width faceplate
modules stacked in rack-unit rows, each with its silkscreen name, a segmented LED
product count, a one-line function caption, and a control motif (knob cluster /
meter / jack field). Primary action = enter a module (whole panel is the target).
A "NOW LOADED" featured strip of product faceplates begins at the fold.

FORM: 19-inch outboard rack + pro-audio silkscreen panel language (Neve/SSL/API/
dbx/TR-808). Assigned candidate #4 of 7 on my resonance-ordered grounded list.
Seed key: ecc4c4d5 (mode persuade, scope direction).

Raises folded into the build (named for their donor challenger):
- Step Row: LEDs are the only glow; primary catalog structure scales, never wraps;
  zero-results is designed as invitation.
- Plate Section: real grain + tonal drift on the ground; amber only on active.
- Scale Shower: default catalog rhythm is one product per full-width row, specs
  ruled inline; before/after values over decorative motion.
- Cloud Quarry: panel material IS the page ground, edge to edge.
- Character Sheet: every filter control visibly marks the modules it governs.
- Algorave: filter changes preview (ghost) before commit; one shared transport
  clock drives every meter/reveal.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
