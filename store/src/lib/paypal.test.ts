import { describe, expect, it } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  buildPaypalOrderPayload,
  centsToPaypalAmount,
  paypalAmountToCents,
  shippingForSubtotal,
} from "./paypal";

describe("centsToPaypalAmount", () => {
  it("renders whole dollars with two decimals", () => {
    expect(centsToPaypalAmount(0)).toBe("0.00");
    expect(centsToPaypalAmount(900)).toBe("9.00");
    expect(centsToPaypalAmount(10_000)).toBe("100.00");
  });

  it("renders sub-dollar and odd-cent amounts exactly", () => {
    expect(centsToPaypalAmount(1)).toBe("0.01");
    expect(centsToPaypalAmount(1999)).toBe("19.99");
    expect(centsToPaypalAmount(133_337)).toBe("1333.37");
  });

  it("survives amounts where float division is inexact", () => {
    // 1.005-style values are the classic toFixed trap; these must not drift.
    expect(centsToPaypalAmount(1005)).toBe("10.05");
    expect(centsToPaypalAmount(70)).toBe("0.70");
    expect(centsToPaypalAmount(8_299_99)).toBe("8299.99");
  });
});

describe("paypalAmountToCents", () => {
  it("round-trips with centsToPaypalAmount across a wide range", () => {
    for (const cents of [0, 1, 7, 99, 100, 999, 1999, 10_000, 123_456, 9_999_99]) {
      expect(paypalAmountToCents(centsToPaypalAmount(cents))).toBe(cents);
    }
  });

  it("rounds rather than truncates", () => {
    expect(paypalAmountToCents("19.99")).toBe(1999);
    expect(paypalAmountToCents("0.1")).toBe(10);
    expect(paypalAmountToCents("1333.37")).toBe(133_337);
  });

  it("returns NaN for junk so an equality check against cents fails closed", () => {
    // The capture route compares paidCents !== order.totalCents. NaN is never
    // equal to a number, so garbage from PayPal can never settle an order.
    expect(Number.isNaN(paypalAmountToCents(""))).toBe(true);
    expect(Number.isNaN(paypalAmountToCents("free"))).toBe(true);
    expect(paypalAmountToCents("19.99") === 1999).toBe(true);
  });
});

describe("shippingForSubtotal", () => {
  it("charges flat shipping below the threshold", () => {
    expect(shippingForSubtotal(0)).toBe(SHIPPING_FLAT_CENTS);
    expect(shippingForSubtotal(FREE_SHIPPING_THRESHOLD_CENTS - 1)).toBe(
      SHIPPING_FLAT_CENTS
    );
  });

  it("is free at and above the threshold", () => {
    expect(shippingForSubtotal(FREE_SHIPPING_THRESHOLD_CENTS)).toBe(0);
    expect(shippingForSubtotal(FREE_SHIPPING_THRESHOLD_CENTS + 1)).toBe(0);
    expect(shippingForSubtotal(1_000_000)).toBe(0);
  });
});

describe("buildPaypalOrderPayload", () => {
  const base = {
    internalOrderId: "11111111-2222-3333-4444-555555555555",
    items: [
      {
        productName: "Datum 3 Compact Monitor",
        variantName: "Pair / Black",
        qty: 2,
        unitPriceCents: 44_900,
      },
    ],
    subtotalCents: 89_800,
    shippingCents: 0,
    totalCents: 89_800,
  };

  it("carries the internal order id as custom_id", () => {
    const unit = buildPaypalOrderPayload(base).purchase_units[0];
    expect(unit.custom_id).toBe(base.internalOrderId);
  });

  it("makes item_total + shipping equal amount.value to the cent", () => {
    // PayPal rejects the whole order if this doesn't balance.
    for (const [subtotal, shipping] of [
      [89_800, 0],
      [4_999, 900],
      [0, 900],
      [10_000, 0],
      [1, 900],
    ] as const) {
      const unit = buildPaypalOrderPayload({
        ...base,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
      }).purchase_units[0];

      const item = paypalAmountToCents(unit.amount.breakdown.item_total.value);
      const ship = paypalAmountToCents(unit.amount.breakdown.shipping.value);
      const total = paypalAmountToCents(unit.amount.value);
      expect(item + ship).toBe(total);
    }
  });

  it("always requests a capture in USD", () => {
    const payload = buildPaypalOrderPayload(base);
    expect(payload.intent).toBe("CAPTURE");
    expect(payload.purchase_units[0].amount.currency_code).toBe("USD");
  });

  it("sends quantity as a string and unit price in decimal", () => {
    const item = buildPaypalOrderPayload(base).purchase_units[0].items[0];
    expect(item.quantity).toBe("2");
    expect(item.unit_amount.value).toBe("449.00");
  });

  it("truncates names to PayPal's 127-character limit", () => {
    const item = buildPaypalOrderPayload({
      ...base,
      items: [{ ...base.items[0], productName: "x".repeat(300), variantName: "y".repeat(300) }],
    }).purchase_units[0].items[0];

    expect(item.name).toHaveLength(127);
    expect(item.description).toHaveLength(127);
  });

  it("asks PayPal for the payer's address on file", () => {
    // The capture route snapshots this onto the order; GET_FROM_FILE is what
    // makes PayPal return it at all.
    expect(buildPaypalOrderPayload(base).application_context.shipping_preference).toBe(
      "GET_FROM_FILE"
    );
  });
});
