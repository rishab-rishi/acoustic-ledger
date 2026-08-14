ALTER TABLE "orders" DROP CONSTRAINT "orders_stripe_session_id_unique";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "stripe_session_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "stripe_payment_intent_id";