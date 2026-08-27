import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Paso intermedio, invisible, entre terminar de loguearse y llegar a algún
 * lado. Vive acá y no directo en el redirectTo de signIn() porque recién
 * acá ya existe la sesión — es la única forma de saber el role antes de
 * decidir a dónde mandar a alguien.
 */
export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await auth();

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  // Nunca redirigir a una URL externa — callbackUrl viene de un query param
  // que cualquiera puede armar a mano.
  redirect(callbackUrl?.startsWith("/") ? callbackUrl : "/");
}
