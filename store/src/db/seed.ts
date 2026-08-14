import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  addresses,
  cartItems,
  carts,
  categories,
  orderItems,
  orders,
  products,
  users,
  variants,
} from "./schema";

type SeedVariant = {
  name: string;
  skuSuffix: string;
  priceCents: number;
  stock: number;
};

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  basePriceCents: number;
  images: string[];
  featured?: boolean;
  active?: boolean;
  variants: SeedVariant[];
};

const CATEGORIES = [
  {
    name: "Studio Monitors",
    slug: "studio-monitors",
    description:
      "Nearfield and reference monitors voiced for a flat, honest response — built to reveal mix problems, not flatter them.",
  },
  {
    name: "Headphones",
    slug: "headphones",
    description:
      "Open and closed-back monitoring headphones for tracking, mixing, and long critical-listening sessions.",
  },
  {
    name: "Equalizers & DSP",
    slug: "equalizers-dsp",
    description:
      "Graphic, parametric, and digital correction tools for shaping a room or a mix without adding coloration.",
  },
  {
    name: "Amplifiers & Interfaces",
    slug: "amplifiers-interfaces",
    description:
      "Power amps, monitor controllers, preamps, and audio interfaces that stay out of the way of the signal.",
  },
  {
    name: "Cables & Accessories",
    slug: "cables-accessories",
    description:
      "Balanced cables, isolation hardware, and mounting accessories for a clean, resonance-free setup.",
  },
] as const;

const PRODUCTS: SeedProduct[] = [
  // --- Studio Monitors ---
  {
    name: "Datum 3 Compact Monitor",
    slug: "datum-3-compact-monitor",
    description:
      "A 3.5\" nearfield monitor built for desks where space is the constraint, not standards. The waveguide-loaded tweeter keeps the top end even off-axis, so the balance holds up whether you're centered or reaching for a fader. Not a bass monster — it's tuned to tell you the truth about the low end instead of flattering it.",
    categorySlug: "studio-monitors",
    basePriceCents: 14900,
    images: ["monitor-front-01"],
    featured: true,
    variants: [
      { name: "Single", skuSuffix: "SGL", priceCents: 14900, stock: 42 },
      { name: "Matched Pair", skuSuffix: "PR", priceCents: 28900, stock: 19 },
    ],
  },
  {
    name: "Datum 5 Nearfield Monitor",
    slug: "datum-5-nearfield-monitor",
    description:
      "The reference point for the Datum line: a 5\" woven-fiber woofer and 1\" silk dome crossed over at 2.4kHz for a seam you won't hear. Flat within 2dB from 55Hz to 20kHz, with a rear port tuned to extend low end without letting it dominate the mix.",
    categorySlug: "studio-monitors",
    basePriceCents: 24900,
    images: ["monitor-front-01"],
    featured: true,
    variants: [
      { name: "Single", skuSuffix: "SGL", priceCents: 24900, stock: 31 },
      { name: "Matched Pair", skuSuffix: "PR", priceCents: 48900, stock: 24 },
    ],
  },
  {
    name: "Datum 5 MkII Nearfield Monitor",
    slug: "datum-5-mkii-nearfield-monitor",
    description:
      "A revised crossover and a stiffer cabinet brace over the original Datum 5, cutting cabinet resonance by roughly 6dB in the 300-500Hz range where boxiness usually hides. Same balanced, low-emphasis tuning philosophy, tightened up.",
    categorySlug: "studio-monitors",
    basePriceCents: 27900,
    images: ["monitor-front-01"],
    variants: [
      { name: "Single", skuSuffix: "SGL", priceCents: 27900, stock: 27 },
      { name: "Matched Pair", skuSuffix: "PR", priceCents: 54900, stock: 15 },
    ],
  },
  {
    name: "Datum 8 Studio Monitor",
    slug: "datum-8-studio-monitor",
    description:
      "An 8\" monitor for rooms too large for a nearfield to load properly. The bigger cone moves more air at lower excursion, which means less distortion at the volumes a full mix session actually needs — without the bloated low end larger monitors are prone to.",
    categorySlug: "studio-monitors",
    basePriceCents: 44900,
    images: ["monitor-angle-02"],
    variants: [
      { name: "Single", skuSuffix: "SGL", priceCents: 44900, stock: 12 },
      { name: "Matched Pair", skuSuffix: "PR", priceCents: 87900, stock: 8 },
    ],
  },
  {
    name: "Reference 6 Coaxial Monitor",
    slug: "reference-6-coaxial-monitor",
    description:
      "A coincident driver design — the tweeter sits at the acoustic center of the woofer cone — so the whole frequency range arrives from a single point in space. That gives a wider, more stable sweet spot than a standard two-way, which matters when you're mixing for more than one seat in the room.",
    categorySlug: "studio-monitors",
    basePriceCents: 59900,
    images: ["monitor-angle-02"],
    featured: true,
    variants: [
      { name: "Single", skuSuffix: "SGL", priceCents: 59900, stock: 9 },
      { name: "Matched Pair", skuSuffix: "PR", priceCents: 116900, stock: 6 },
    ],
  },
  {
    name: "Fieldglass Portable Monitor",
    slug: "fieldglass-portable-monitor",
    description:
      "A battery-powered nearfield for mixing outside a treated room — location sessions, hotel rooms, a second opinion away from the studio. 9 hours on a charge, with the same restrained low-end voicing as the rest of the Datum-tuned lineup so what you hear on the road still translates.",
    categorySlug: "studio-monitors",
    basePriceCents: 19900,
    images: ["monitor-front-01"],
    variants: [
      { name: "Single", skuSuffix: "SGL", priceCents: 19900, stock: 22 },
      { name: "Matched Pair", skuSuffix: "PR", priceCents: 38900, stock: 0 },
    ],
  },
  {
    name: "Baseline 10 Studio Subwoofer",
    slug: "baseline-10-studio-subwoofer",
    description:
      "Extends any Datum or Reference pair down to 28Hz with a steep 24dB/octave crossover, so the mains keep doing what they're good at and the sub only fills the octave underneath. Built for mix decisions, not for feeling it in your chest.",
    categorySlug: "studio-monitors",
    basePriceCents: 54900,
    images: ["monitor-sub-03"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 54900, stock: 11 },
      { name: "Silver", skuSuffix: "SLV", priceCents: 56900, stock: 4 },
    ],
  },

  // --- Headphones ---
  {
    name: "Calibrate Open-Back Headphones",
    slug: "calibrate-open-back-headphones",
    description:
      "Open-back monitoring headphones for sessions long enough that clamping force and heat start to matter. The open design trades isolation for a more natural, less fatiguing stereo image — built for mixing, not for tracking next to a live mic.",
    categorySlug: "headphones",
    basePriceCents: 24900,
    images: ["headphone-over-01"],
    featured: true,
    variants: [
      { name: "Graphite", skuSuffix: "GRA", priceCents: 24900, stock: 38 },
      { name: "Slate", skuSuffix: "SLT", priceCents: 24900, stock: 26 },
    ],
  },
  {
    name: "Calibrate Closed-Back Headphones",
    slug: "calibrate-closed-back-headphones",
    description:
      "Closed-back monitoring headphones with enough isolation for tracking near a live mic without bleed. Tuned to the same flat target curve as the open-back model, so switching between the two mid-session doesn't change your read on the mix.",
    categorySlug: "headphones",
    basePriceCents: 22900,
    images: ["headphone-over-01"],
    variants: [
      { name: "Graphite", skuSuffix: "GRA", priceCents: 22900, stock: 33 },
      { name: "Slate", skuSuffix: "SLT", priceCents: 22900, stock: 17 },
    ],
  },
  {
    name: "Calibrate Mix Lite Headphones",
    slug: "calibrate-mix-lite-headphones",
    description:
      "An entry point into the Calibrate line's tuning philosophy at a third of the cost of the Pro model. Lighter clamping force and a simplified driver, but the same restrained bass shelf — a deliberately unglamorous headphone for people who'd rather trust their monitors.",
    categorySlug: "headphones",
    basePriceCents: 12900,
    images: ["headphone-compact-02"],
    variants: [
      { name: "Graphite", skuSuffix: "GRA", priceCents: 12900, stock: 51 },
    ],
  },
  {
    name: "Calibrate Pro Reference Headphones",
    slug: "calibrate-pro-reference-headphones",
    description:
      "The flagship of the line: hand-matched driver pairs within 0.5dB of each other, replaceable earpads, and a detachable cable with a locking connector. Built for engineers who use headphones as a primary reference, not a backup.",
    categorySlug: "headphones",
    basePriceCents: 39900,
    images: ["headphone-over-01"],
    featured: true,
    variants: [
      { name: "Graphite", skuSuffix: "GRA", priceCents: 39900, stock: 14 },
      { name: "Slate", skuSuffix: "SLT", priceCents: 39900, stock: 9 },
    ],
  },
  {
    name: "Fieldglass Portable Headphones",
    slug: "fieldglass-portable-headphones",
    description:
      "A folding, travel-sized headphone that keeps the Fieldglass line's flat tuning without the studio-headphone bulk. Comes with a hard case sized for a laptop bag, for mix checks between sessions.",
    categorySlug: "headphones",
    basePriceCents: 17900,
    images: ["headphone-compact-02"],
    variants: [
      { name: "Graphite", skuSuffix: "GRA", priceCents: 17900, stock: 29 },
    ],
  },
  {
    name: "Calibrate Wireless Monitor Headphones",
    slug: "calibrate-wireless-monitor-headphones",
    description:
      "Wireless monitoring with a low-latency mode intended for tracking, not casual listening — under 40ms round-trip, low enough that a vocalist won't fight their own headphone mix. 18-hour battery, with a wired fallback for sessions where latency has to be zero.",
    categorySlug: "headphones",
    basePriceCents: 29900,
    images: ["headphone-compact-02"],
    variants: [
      { name: "Graphite", skuSuffix: "GRA", priceCents: 29900, stock: 20 },
      { name: "Slate", skuSuffix: "SLT", priceCents: 29900, stock: 0 },
    ],
  },
  {
    name: "Calibrate ISO Tracking Headphones",
    slug: "calibrate-iso-tracking-headphones",
    description:
      "Extra-isolating closed-back headphones for vocal booths and drum rooms, where bleed into a nearby mic is the actual problem being solved. 26dB of passive isolation, at some cost to soundstage width versus the open-back model — a deliberate tradeoff for a specific job.",
    categorySlug: "headphones",
    basePriceCents: 19900,
    images: ["headphone-over-01"],
    variants: [
      { name: "Graphite", skuSuffix: "GRA", priceCents: 19900, stock: 25 },
    ],
  },

  // --- Equalizers & DSP ---
  {
    name: "Parametric 4 Channel EQ",
    slug: "parametric-4-channel-eq",
    description:
      "A 4-band parametric EQ, one channel per instrument bus, with fully sweepable frequency and Q on every band. Unity-gain bypass on each channel so A/B comparisons against the dry signal are honest, not level-biased.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 34900,
    images: ["eq-knobs-02"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 34900, stock: 16 },
      { name: "Silver", skuSuffix: "SLV", priceCents: 36900, stock: 10 },
    ],
  },
  {
    name: "Parametric 8 Channel EQ",
    slug: "parametric-8-channel-eq",
    description:
      "The 4-channel unit's larger sibling, built for full mix-bus correction across eight channels in a single 2U rack space. Same sweepable-band design, doubled — meant for the back of a rack, not the top of a desk.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 54900,
    images: ["eq-knobs-02"],
    featured: true,
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 54900, stock: 7 },
    ],
  },
  {
    name: "Graphic 15-Band EQ",
    slug: "graphic-15-band-eq",
    description:
      "A classic 15-band graphic EQ with ISO-standard center frequencies, built for fast room correction rather than surgical mix work. The slider layout gives you an immediate visual read of the curve you're dialing in — useful when you're working by ear against a room, not a plugin window.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 29900,
    images: ["eq-sliders-01"],
    featured: true,
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 29900, stock: 21 },
      { name: "Silver", skuSuffix: "SLV", priceCents: 31900, stock: 13 },
    ],
  },
  {
    name: "Graphic 31-Band EQ",
    slug: "graphic-31-band-eq",
    description:
      "Third-octave resolution across the full audible range, for room correction work where a 15-band unit isn't precise enough to notch a narrow standing-wave problem. Constant-Q filter design keeps adjacent bands from smearing into each other.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 44900,
    images: ["eq-sliders-01"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 44900, stock: 8 },
    ],
  },
  {
    name: "Contour Desktop EQ",
    slug: "contour-desktop-eq",
    description:
      "A compact 2-channel desktop EQ sized to sit next to a monitor controller rather than live in a rack. Meant for small, targeted corrections — a resonant desk, a wall too close behind the monitors — not full-range shaping.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 19900,
    images: ["eq-knobs-02"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 19900, stock: 24 },
    ],
  },
  {
    name: "Room Correction DSP Processor",
    slug: "room-correction-dsp-processor",
    description:
      "A digital room correction unit that ships with a calibrated measurement mic. Run the sweep, and it builds a correction curve targeting a flat in-room response — automated groundwork for the same balanced, non-boosted low end the rest of the catalog is tuned around.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 64900,
    images: ["eq-knobs-02"],
    featured: true,
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 64900, stock: 6 },
    ],
  },
  {
    name: "Contour Mastering EQ",
    slug: "contour-mastering-eq",
    description:
      "A premium 2-channel mastering EQ with discrete, hand-selected components and stepped gain controls for repeatable settings. Built for the last, most conservative pass on a mix bus — small moves, large consequences.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 89900,
    images: ["eq-knobs-02"],
    variants: [
      { name: "Silver", skuSuffix: "SLV", priceCents: 89900, stock: 3 },
    ],
  },
  {
    name: "Headroom Channel Strip EQ",
    slug: "headroom-channel-strip-eq",
    description:
      "A combined preamp, compressor, and 3-band EQ in a single channel strip, for tracking chains that need shaping before the signal ever hits a DAW. The EQ section shares its curve design with the Contour desktop unit, scaled down to fit the strip.",
    categorySlug: "equalizers-dsp",
    basePriceCents: 49900,
    images: ["eq-knobs-02"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 49900, stock: 10 },
    ],
  },

  // --- Amplifiers & Interfaces ---
  {
    name: "Current 2 Headphone Amplifier",
    slug: "current-2-headphone-amplifier",
    description:
      "A 2-channel desktop headphone amp with enough clean power to drive high-impedance reference headphones without strain. Zero-feedback design keeps distortion low across the volume range, not just at the top.",
    categorySlug: "amplifiers-interfaces",
    basePriceCents: 24900,
    images: ["interface-jacks-02"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 24900, stock: 19 },
      { name: "Silver", skuSuffix: "SLV", priceCents: 26900, stock: 12 },
    ],
  },
  {
    name: "Current 8 Monitor Controller",
    slug: "current-8-monitor-controller",
    description:
      "Source and level switching for up to three sets of monitors plus a headphone output, with calibrated volume detents so a mix level is reproducible session to session. The VU pair on the front reads true RMS, not peak, for a level sense that matches how loud the room actually feels.",
    categorySlug: "amplifiers-interfaces",
    basePriceCents: 39900,
    images: ["amp-meters-01"],
    featured: true,
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 39900, stock: 14 },
    ],
  },
  {
    name: "Interface 4 Audio Interface",
    slug: "interface-4-audio-interface",
    description:
      "A 4-in/4-out USB interface with clean, accurate preamps rather than character-driven coloration — the same philosophy as the monitors it's meant to sit next to. Class-compliant, so it works without a driver install on most systems.",
    categorySlug: "amplifiers-interfaces",
    basePriceCents: 34900,
    images: ["interface-jacks-02"],
    featured: true,
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 34900, stock: 27 },
    ],
  },
  {
    name: "Interface 8 Audio Interface",
    slug: "interface-8-audio-interface",
    description:
      "Eight channels of the same clean preamp design as the Interface 4, for sessions that need to track a full band at once. Adds word clock I/O for syncing with outboard digital gear.",
    categorySlug: "amplifiers-interfaces",
    basePriceCents: 59900,
    images: ["interface-jacks-02"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 59900, stock: 8 },
    ],
  },
  {
    name: "Current 100 Power Amplifier",
    slug: "current-100-power-amplifier",
    description:
      "A 2-channel power amp for driving passive Datum or Reference monitors, rated at 100W per channel into 8 ohms with headroom to spare. Toroidal transformer keeps the noise floor low enough to disappear under any program material.",
    categorySlug: "amplifiers-interfaces",
    basePriceCents: 74900,
    images: ["amp-meters-01"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 74900, stock: 5 },
    ],
  },
  {
    name: "Headroom Preamp",
    slug: "headroom-preamp",
    description:
      "A clean, 2-channel mic preamp with up to 66dB of gain and a switchable high-pass filter. Built for engineers who add character with a mic choice, not with the preamp — this one is meant to stay out of the way.",
    categorySlug: "amplifiers-interfaces",
    basePriceCents: 44900,
    images: ["interface-jacks-02"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 44900, stock: 11 },
    ],
  },
  {
    name: "Current DAC Reference Converter",
    slug: "current-dac-reference-converter",
    description:
      "A standalone D/A converter for engineers who want their monitoring chain decoupled from a computer's onboard audio. Bit-transparent up to 24-bit/192kHz, with a fixed and a variable output for feeding a power amp directly.",
    categorySlug: "amplifiers-interfaces",
    basePriceCents: 54900,
    images: ["amp-meters-01"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 54900, stock: 9 },
      { name: "Silver", skuSuffix: "SLV", priceCents: 56900, stock: 0 },
    ],
  },

  // --- Cables & Accessories ---
  {
    name: "Line XLR Cable",
    slug: "line-xlr-cable",
    description:
      "A balanced XLR cable with braided shielding and gold-plated connectors, built to reject noise over long mic and line runs. The workhorse cable behind most of the catalog's product photography.",
    categorySlug: "cables-accessories",
    basePriceCents: 1900,
    images: ["cable-xlr-01"],
    variants: [
      { name: "1m", skuSuffix: "1M", priceCents: 1900, stock: 88 },
      { name: "3m", skuSuffix: "3M", priceCents: 2900, stock: 64 },
      { name: "6m", skuSuffix: "6M", priceCents: 3900, stock: 41 },
      { name: "10m", skuSuffix: "10M", priceCents: 5400, stock: 18 },
    ],
  },
  {
    name: "Line TRS Instrument Cable",
    slug: "line-trs-instrument-cable",
    description:
      "A balanced 1/4\" TRS cable for line-level connections between interfaces, preamps, and outboard gear. Same shielding standard as the XLR line, in a connector suited to unbalanced and balanced line runs.",
    categorySlug: "cables-accessories",
    basePriceCents: 1700,
    images: ["cable-trs-02"],
    variants: [
      { name: "1m", skuSuffix: "1M", priceCents: 1700, stock: 76 },
      { name: "3m", skuSuffix: "3M", priceCents: 2500, stock: 52 },
      { name: "6m", skuSuffix: "6M", priceCents: 3400, stock: 29 },
    ],
  },
  {
    name: "Line USB-C Interface Cable",
    slug: "line-usb-c-interface-cable",
    description:
      "A shielded USB-C cable rated for the current draw and data rates the Interface 4 and Interface 8 need. Ferrite choke at both ends to keep interface noise out of a nearby signal chain.",
    categorySlug: "cables-accessories",
    basePriceCents: 1400,
    images: ["cable-trs-02"],
    variants: [
      { name: "1m", skuSuffix: "1M", priceCents: 1400, stock: 61 },
      { name: "2m", skuSuffix: "2M", priceCents: 1900, stock: 43 },
    ],
  },
  {
    name: "Line Optical Cable",
    slug: "line-optical-cable",
    description:
      "A TOSLINK optical cable for digital I/O between the Room Correction DSP Processor, the Current DAC, and other digital gear. Immune to the electrical noise that a long copper digital run can pick up.",
    categorySlug: "cables-accessories",
    basePriceCents: 1600,
    images: ["cable-trs-02"],
    variants: [
      { name: "1m", skuSuffix: "1M", priceCents: 1600, stock: 39 },
      { name: "2m", skuSuffix: "2M", priceCents: 2100, stock: 22 },
      { name: "5m", skuSuffix: "5M", priceCents: 3200, stock: 7 },
    ],
  },
  {
    name: "Ledger Monitor Isolation Pads",
    slug: "ledger-monitor-isolation-pads",
    description:
      "High-density foam pads that decouple a monitor cabinet from a desk, cutting the resonant transfer that muddies low-mid detail. Angled wedge option included for monitors sitting above ear height.",
    categorySlug: "cables-accessories",
    basePriceCents: 2900,
    images: ["stand-iso-01"],
    variants: [
      { name: "Small (fits Datum 3/5)", skuSuffix: "SM", priceCents: 2900, stock: 47 },
      { name: "Large (fits Datum 8/Reference 6)", skuSuffix: "LG", priceCents: 3900, stock: 21 },
    ],
  },
  {
    name: "Ledger Desktop Monitor Stands",
    slug: "ledger-desktop-monitor-stands",
    description:
      "Isolating desktop stands that tilt monitors to ear height and decouple them from the desk surface in one piece, replacing a stack of books and a pair of isolation pads. Sold as a pair.",
    categorySlug: "cables-accessories",
    basePriceCents: 6900,
    images: ["stand-iso-01"],
    featured: true,
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 6900, stock: 16 },
      { name: "Walnut", skuSuffix: "WAL", priceCents: 7900, stock: 9 },
    ],
  },
  {
    name: "Ledger Headphone Stand",
    slug: "ledger-headphone-stand",
    description:
      "A weighted desktop stand sized for the Calibrate line's headband curve, keeping the earpads shaped correctly between sessions instead of resting flat on a desk.",
    categorySlug: "cables-accessories",
    basePriceCents: 3400,
    images: ["stand-iso-01"],
    variants: [
      { name: "Black", skuSuffix: "BLK", priceCents: 3400, stock: 33 },
      { name: "Walnut", skuSuffix: "WAL", priceCents: 3900, stock: 14 },
    ],
  },
  {
    name: "Ledger Rack Mount Kit",
    slug: "ledger-rack-mount-kit",
    description:
      "Rack ears and hardware for mounting any 1U or 2U unit in the catalog — EQs, the monitor controller, preamps — into a standard 19\" rack frame.",
    categorySlug: "cables-accessories",
    basePriceCents: 1900,
    images: ["stand-iso-01"],
    variants: [
      { name: "1U", skuSuffix: "1U", priceCents: 1900, stock: 40 },
      { name: "2U", skuSuffix: "2U", priceCents: 2400, stock: 25 },
    ],
  },
  {
    name: "Ledger Acoustic Foam Panel Set",
    slug: "ledger-acoustic-foam-panel-set",
    description:
      "Wedge-profile acoustic panels for first-reflection treatment around a monitoring position. Treats flutter echo and early reflections — a room-treatment complement to correction DSP, not a replacement for it.",
    categorySlug: "cables-accessories",
    basePriceCents: 8900,
    images: ["stand-iso-01"],
    variants: [
      { name: "6-Pack, Charcoal", skuSuffix: "6PK", priceCents: 8900, stock: 20 },
      { name: "12-Pack, Charcoal", skuSuffix: "12PK", priceCents: 15900, stock: 11 },
    ],
  },
];

const CUSTOMER_ORDERS: Array<{
  daysAgo: number;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  guest?: boolean;
  items: Array<{ productSlug: string; variantIndex: number; qty: number }>;
}> = [
  {
    daysAgo: 58,
    status: "fulfilled",
    items: [{ productSlug: "datum-5-nearfield-monitor", variantIndex: 1, qty: 1 }],
  },
  {
    daysAgo: 52,
    status: "fulfilled",
    items: [
      { productSlug: "line-xlr-cable", variantIndex: 1, qty: 4 },
      { productSlug: "ledger-monitor-isolation-pads", variantIndex: 0, qty: 1 },
    ],
  },
  {
    daysAgo: 45,
    status: "fulfilled",
    guest: true,
    items: [{ productSlug: "calibrate-open-back-headphones", variantIndex: 0, qty: 1 }],
  },
  {
    daysAgo: 37,
    status: "paid",
    items: [{ productSlug: "interface-4-audio-interface", variantIndex: 0, qty: 1 }],
  },
  {
    daysAgo: 30,
    status: "cancelled",
    items: [{ productSlug: "current-100-power-amplifier", variantIndex: 0, qty: 1 }],
  },
  {
    daysAgo: 24,
    status: "paid",
    items: [
      { productSlug: "graphic-15-band-eq", variantIndex: 0, qty: 1 },
      { productSlug: "line-trs-instrument-cable", variantIndex: 1, qty: 2 },
    ],
  },
  {
    daysAgo: 18,
    status: "paid",
    guest: true,
    items: [{ productSlug: "calibrate-mix-lite-headphones", variantIndex: 0, qty: 2 }],
  },
  {
    daysAgo: 11,
    status: "fulfilled",
    items: [{ productSlug: "current-8-monitor-controller", variantIndex: 0, qty: 1 }],
  },
  {
    daysAgo: 5,
    status: "pending",
    items: [{ productSlug: "line-usb-c-interface-cable", variantIndex: 0, qty: 1 }],
  },
  {
    daysAgo: 1,
    status: "pending",
    items: [{ productSlug: "ledger-desktop-monitor-stands", variantIndex: 0, qty: 1 }],
  },
];

/**
 * Historical seed orders predate this database, so they carry plausible
 * PayPal-shaped ids (17-char uppercase alphanumeric) rather than obvious
 * placeholders. Deterministic, so re-seeding is stable.
 */
function fakePaypalId(seq: number, salt: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let x = seq * 2654435761 + salt.charCodeAt(0) * 40503;
  let out = "";
  for (let i = 0; i < 17; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out += alphabet[x % alphabet.length];
  }
  return out;
}

async function main() {
  console.log("Clearing existing data...");
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(cartItems);
  await db.delete(carts);
  await db.delete(addresses);
  await db.delete(variants);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(users);

  console.log("Seeding users...");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const customerPasswordHash = await bcrypt.hash("customer123", 10);

  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@demo.test",
      name: "Store Admin",
      passwordHash: adminPasswordHash,
      role: "admin",
      emailVerified: new Date(),
    })
    .returning();

  const [customer] = await db
    .insert(users)
    .values({
      email: "customer@demo.test",
      name: "Alex Rivera",
      passwordHash: customerPasswordHash,
      role: "customer",
      emailVerified: new Date(),
    })
    .returning();

  console.log("Seeding address...");
  const [customerAddress] = await db
    .insert(addresses)
    .values({
      userId: customer.id,
      line1: "482 Kestrel Ave",
      line2: "Unit 3",
      city: "Portland",
      region: "OR",
      postal: "97214",
      country: "US",
    })
    .returning();

  console.log("Seeding categories...");
  const categoryRows = await db.insert(categories).values([...CATEGORIES]).returning();
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c]));

  console.log("Seeding products & variants...");
  const productByS = new Map<
    string,
    { id: string; variants: { id: string; name: string; priceCents: number }[] }
  >();

  for (const p of PRODUCTS) {
    const category = categoryBySlug.get(p.categorySlug);
    if (!category) throw new Error(`Unknown category ${p.categorySlug}`);

    const [productRow] = await db
      .insert(products)
      .values({
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: category.id,
        basePriceCents: p.basePriceCents,
        images: p.images.map((img) => `/products/${img}.webp`),
        featured: p.featured ?? false,
        active: p.active ?? true,
      })
      .returning();

    const skuBase = p.slug.toUpperCase().replace(/-/g, "-");
    const variantRows = await db
      .insert(variants)
      .values(
        p.variants.map((v) => ({
          productId: productRow.id,
          name: v.name,
          sku: `${skuBase}-${v.skuSuffix}`,
          priceCents: v.priceCents,
          stock: v.stock,
        }))
      )
      .returning();

    productByS.set(p.slug, {
      id: productRow.id,
      variants: variantRows.map((v) => ({
        id: v.id,
        name: v.name,
        priceCents: v.priceCents,
      })),
    });
  }

  console.log("Seeding orders...");
  const now = Date.now();
  let orderCounter = 1;

  for (const o of CUSTOMER_ORDERS) {
    const createdAt = new Date(now - o.daysAgo * 24 * 60 * 60 * 1000);
    const lineItems = o.items.map((item) => {
      const product = productByS.get(item.productSlug);
      if (!product) throw new Error(`Unknown product ${item.productSlug}`);
      const variant = product.variants[item.variantIndex];
      const productSeed = PRODUCTS.find((p) => p.slug === item.productSlug)!;
      return {
        variantId: variant.id,
        productName: productSeed.name,
        variantName: variant.name,
        unitPriceCents: variant.priceCents,
        qty: item.qty,
      };
    });

    const subtotalCents = lineItems.reduce(
      (sum, li) => sum + li.unitPriceCents * li.qty,
      0
    );
    const shippingCents = subtotalCents >= 10000 ? 0 : 900;
    const totalCents = subtotalCents + shippingCents;

    const [orderRow] = await db
      .insert(orders)
      .values({
        userId: o.guest ? null : customer.id,
        email: o.guest ? "guest@example.com" : customer.email,
        status: o.status,
        subtotalCents,
        shippingCents,
        totalCents,
        paypalOrderId: fakePaypalId(orderCounter, "order"),
        paypalCaptureId:
          o.status === "paid" || o.status === "fulfilled"
            ? fakePaypalId(orderCounter, "capture")
            : null,
        shippingAddress: o.guest
          ? {
              line1: "18 Harbor St",
              line2: null,
              city: "Seattle",
              region: "WA",
              postal: "98101",
              country: "US",
            }
          : {
              line1: customerAddress.line1,
              line2: customerAddress.line2,
              city: customerAddress.city,
              region: customerAddress.region,
              postal: customerAddress.postal,
              country: customerAddress.country,
            },
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(orderItems).values(
      lineItems.map((li) => ({
        orderId: orderRow.id,
        variantId: li.variantId,
        productName: li.productName,
        variantName: li.variantName,
        unitPriceCents: li.unitPriceCents,
        qty: li.qty,
      }))
    );

    orderCounter++;
  }

  console.log(
    `Done. Seeded ${categoryRows.length} categories, ${PRODUCTS.length} products, ${CUSTOMER_ORDERS.length} orders.`
  );
  console.log("Admin login:    admin@demo.test / admin123");
  console.log("Customer login: customer@demo.test / customer123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
