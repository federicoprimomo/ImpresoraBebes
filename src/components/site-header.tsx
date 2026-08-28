import Link from "next/link";

import { auth, signOut } from "@/auth";
import { LockIcon } from "@/components/icons";
import { MobileNav } from "@/components/mobile-nav";
import { isPublicBrowsingEnabled } from "@/lib/site-content";
import { countPendingActionOrders } from "@/lib/order-actions";

export async function SiteHeader() {
  const [session, publicBrowsing] = await Promise.all([auth(), isPublicBrowsingEnabled()]);
  const canSeeListingsLink = publicBrowsing || session?.user?.role === "ADMIN";
  // Cuántas compras/ventas están esperando que este usuario suba o
  // descargue la entrega — para que no se le pase apenas entra al sitio.
  const pendingActionCount = session?.user
    ? await countPendingActionOrders(session.user.id)
    : 0;

  // Los links de acá abajo se ocultaban del todo en mobile (`hidden
  // sm:inline`) sin ninguna forma de llegar a ellos salvo pidiendo "vista
  // de escritorio" — van también al menú de hamburguesa de MobileNav.
  const mobileLinks = session?.user
    ? [
        { href: "/listings/mine", label: "Mis publicaciones" },
        { href: "/orders", label: "Mis compras/ventas", badge: pendingActionCount },
        { href: "/account/mercadopago", label: "Cobrar con MP" },
        ...(session.user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <LockIcon className="h-4 w-4" />
          </span>
          Escrow.ar
        </Link>

        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-400">
          {canSeeListingsLink ? (
            <Link href="/listings" className="hover:text-zinc-950 dark:hover:text-zinc-50">
              Ver entradas
            </Link>
          ) : null}

          {session?.user ? (
            <>
              <Link
                href="/listings/mine"
                className="hidden hover:text-zinc-950 sm:inline dark:hover:text-zinc-50"
              >
                Mis publicaciones
              </Link>
              <Link
                href="/orders"
                className="relative hidden hover:text-zinc-950 sm:inline dark:hover:text-zinc-50"
              >
                Mis compras/ventas
                {pendingActionCount > 0 ? (
                  <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                    {pendingActionCount}
                  </span>
                ) : null}
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
              <MobileNav links={mobileLinks} />
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
