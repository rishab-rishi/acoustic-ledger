import { sweepStalePendingOrders } from "@/lib/sweep-pending-orders";

export const dynamic = "force-dynamic";

/**
 * Triggered by a Vercel Cron Job (see vercel.json) — daily, which is both
 * the Hobby plan's minimum cron interval and plenty for a ~24h staleness
 * threshold.
 *
 * Vercel signs cron-triggered requests with `Authorization: Bearer
 * $CRON_SECRET` when CRON_SECRET is set in the project's environment
 * variables. 404 rather than 401 when it's unset — same reasoning as
 * /api/demo/checkout: without a configured secret this is a destructive
 * (delete) endpoint with no other protection, so it should not exist
 * rather than fall open to running unauthenticated.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(null, { status: 404 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { removed } = await sweepStalePendingOrders();
  return Response.json({ ok: true, removed });
}
