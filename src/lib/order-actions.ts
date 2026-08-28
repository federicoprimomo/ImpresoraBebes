import type { Order } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Si esta orden necesita que ESTE usuario haga algo ahora — vendedor
 * subiendo la entrega, o comprador descargándola. Se usa tanto para
 * destacar filas en /orders como para el badge del header.
 */
export function orderNeedsAction(
  order: Pick<Order, "status" | "sellerId" | "buyerId">,
  userId: string,
): boolean {
  if (order.sellerId === userId) {
    return order.status === "PAYMENT_HELD";
  }
  if (order.buyerId === userId) {
    return order.status === "DELIVERED";
  }
  return false;
}

/**
 * Cuántas órdenes de este usuario necesitan acción ahora — misma lógica
 * que `orderNeedsAction`, pero como query directa (para el badge del
 * header, que no puede darse el lujo de traer todas las órdenes).
 */
export async function countPendingActionOrders(userId: string): Promise<number> {
  return prisma.order.count({
    where: {
      OR: [
        { sellerId: userId, status: "PAYMENT_HELD" },
        { buyerId: userId, status: "DELIVERED" },
      ],
    },
  });
}
