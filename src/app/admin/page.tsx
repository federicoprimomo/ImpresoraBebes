import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <ComingSoon
      title="Panel de administración"
      description="Resolución de disputas y reportes de comisiones. Se implementa en las últimas etapas."
    />
  );
}
