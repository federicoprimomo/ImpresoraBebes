import Link from "next/link";

import { auth, signOut } from "@/auth";
import { LockIcon } from "@/components/icons";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-black/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <LockIcon className="h-4 w-4" />
          </span>
          Escrow.ar
        </Link>

        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/listings" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Ver entradas
          </Link>

          {session?.user ? (
            <>
              <Link href="/orders" className="hidden hover:text-zinc-950 sm:inline dark:hover:text-zinc-50">
                Mis compras/ventas
              </Link>
              <Link
                href="/account/mercadopago"
                className="hidden hover:text-zinc-950 sm:inline dark:hover:text-zinc-50"
              >
                Cobrar con MP
              </Link>
              {session.user.role === "ADMIN" ? (
                <Link href="/admin" className="hidden hover:text-zinc-950 sm:inline dark:hover:text-zinc-50">
                  Admin
                </Link>
              ) : null}
              <Link
                href="/listings/new"
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
              >
                Publicar entrada
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
                className="flex items-center gap-2"
              >
                <span className="hidden text-xs text-zinc-500 lg:inline">
                  {session.user.name ?? session.user.email}
                </span>
                <button type="submit" className="hover:text-zinc-950 dark:hover:text-zinc-50">
                  Salir
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
            >
              Ingresar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
