"use client";

import Link from "next/link";
import { useState } from "react";

type NavLink = { href: string; label: string; badge?: number };

/**
 * En mobile, varios links del header se escondían del todo (`hidden
 * sm:inline`) sin ninguna forma de llegar a ellos salvo pidiendo "vista de
 * escritorio" en el navegador. Esto los junta atrás de un botón de
 * hamburguesa, visible solo en mobile (`sm:hidden`) — en desktop siguen
 * apareciendo como siempre, este componente ni se monta.
 */
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  if (links.length === 0) return null;

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Más opciones"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <>
          {/* Backdrop invisible para cerrar el menú al tocar afuera. */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-11 z-20 flex w-56 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-900">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-4 py-3 text-sm text-zinc-700 hover:bg-black/[.04] dark:text-zinc-300 dark:hover:bg-white/[.06]"
              >
                {link.label}
                {link.badge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-brand-foreground">
                    {link.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
