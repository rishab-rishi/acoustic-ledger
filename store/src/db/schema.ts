import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

const timestamps = {
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const roleEnum = pgEnum("role", ["customer", "admin"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
]);

// --- Auth ---

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  image: text("image"),
  role: roleEnum("role").notNull().default("customer"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  ...timestamps,
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    // Postgres doesn't index foreign keys automatically. The adapter deletes
    // by userId on account unlinking/cascade.
    index("account_user_id_idx").on(account.userId),
  ]
);

export const sessions = pgTable(
  "session",
  {
    sessionToken: text("sessionToken").primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)]
);

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// --- Catalog ---

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    basePriceCents: integer("base_price_cents").notNull(),
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    featured: boolean("featured").notNull().default(false),
    active: boolean("active").notNull().default(true),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(name, '')), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B')`
    ),
    ...timestamps,
  },
  (t) => [
    index("products_search_idx").using("gin", t.searchVector),
    // Every catalog row's category filter and stock signal join through
    // this.
    index("products_category_id_idx").on(t.categoryId),
  ]
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull().unique(),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("variants_product_id_idx").on(t.productId)]
);

// --- Cart ---

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    sessionToken: text("session_token"),
    ...timestamps,
  },
  (t) => [
    // A cart belongs to exactly one owner: a signed-in user or a guest cookie.
    check(
      "carts_owner_present",
      sql`(${t.userId} IS NOT NULL) != (${t.sessionToken} IS NOT NULL)`
    ),
    uniqueIndex("carts_user_id_unique")
      .on(t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
    uniqueIndex("carts_session_token_unique")
      .on(t.sessionToken)
      .where(sql`${t.sessionToken} IS NOT NULL`),
  ]
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id),
    qty: integer("qty").notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.cartId, t.variantId),
    index("cart_items_variant_id_idx").on(t.variantId),
  ]
);

// --- Orders ---

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    region: text("region").notNull(),
    postal: text("postal").notNull(),
    country: text("country").notNull(),
    ...timestamps,
  },
  (t) => [index("addresses_user_id_idx").on(t.userId)]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    email: text("email").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    // Unknown until PayPal responds: the order row is created first so its
    // id can travel as the PayPal order's custom_id, then this is filled in.
    paypalOrderId: text("paypal_order_id").unique(),
    paypalCaptureId: text("paypal_capture_id"),
    shippingAddress: jsonb("shipping_address"),
    ...timestamps,
  },
  (t) => [
    // The whole /orders page.
    index("orders_user_id_idx").on(t.userId),
    // The admin order list filters by status and sorts by recency.
    index("orders_status_created_at_idx").on(t.status, t.createdAt),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => variants.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    variantName: text("variant_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    qty: integer("qty").notNull(),
    // Null until settlement. Usually equals qty; less than qty only on an
    // oversell (stock ran out between the cart re-check and settlement,
    // e.g. two buyers racing the last unit) — settleOrder() clamps the
    // decrement at 0 rather than going negative. cancelOrder() restocks
    // this value, not qty, so a cancelled oversold order can't hand back
    // more stock than it ever actually took.
    stockDecrementedQty: integer("stock_decremented_qty"),
    ...timestamps,
  },
  (t) => [
    // Every order view and every settlement.
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_variant_id_idx").on(t.variantId),
  ]
);

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  carts: many(carts),
  orders: many(orders),
  addresses: many(addresses),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
  cartItems: many(cartItems),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(variants, {
    fields: [cartItems.variantId],
    references: [variants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(variants, {
    fields: [orderItems.variantId],
    references: [variants.id],
  }),
}));
