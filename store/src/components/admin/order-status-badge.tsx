import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/db/admin-queries";

const VARIANT = {
  pending: "outline",
  paid: "secondary",
  fulfilled: "default",
  cancelled: "destructive",
} as const;

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
