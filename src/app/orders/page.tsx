import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ComingSoon
      title="Mis compras y ventas"
      description="Acá vas a ver el estado de tus órdenes (pago retenido, entrega, liberación o disputa). Se implementa en las siguientes etapas."
    />
  );
}
