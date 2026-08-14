ALTER TABLE "orders" ADD COLUMN "paypal_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paypal_capture_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_paypal_order_id_unique" UNIQUE("paypal_order_id");