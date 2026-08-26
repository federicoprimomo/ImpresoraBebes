import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ComingSoon
      title="Publicar una entrada"
      description="El formulario para publicar entradas se implementa en la siguiente etapa."
    />
  );
}
