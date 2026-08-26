import Link from "next/link";

import { auth, signOut } from "@/auth";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Escrow.ar
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/listings" className="hover:underline">
            Ver entradas
          </Link>

          {session?.user ? (
            <>
              <Link href="/listings/new" className="hover:underline">
                Publicar entrada
              </Link>
              <Link href="/orders" className="hover:underline">
                Mis compras/ventas
              </Link>
              <Link href="/account/mercadopago" className="hover:underline">
                Cobrar con MP
              </Link>
              {session.user.role === "ADMIN" ? (
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              ) : null}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="hover:underline">
                  Salir ({session.user.name ?? session.user.email})
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hover:underline">
              Ingresar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
