import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Vendé y comprá entradas sin miedo a que te estafen
      </h1>
      <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        El comprador paga, la plata queda retenida, y solo se libera al
        vendedor cuando la entrada digital fue entregada y confirmada. Nadie
        se mueve primero.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/listings"
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Ver entradas en venta
        </Link>
        <Link
          href="/listings/new"
          className="flex h-12 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
        >
          Publicar una entrada
        </Link>
      </div>

      <ol className="mt-16 grid max-w-3xl gap-6 text-left sm:grid-cols-3">
        <li className="rounded-xl border border-black/10 p-5 dark:border-white/10">
          <span className="text-sm font-semibold text-zinc-500">Paso 1</span>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            El comprador paga con Mercado Pago. El dinero queda retenido.
          </p>
        </li>
        <li className="rounded-xl border border-black/10 p-5 dark:border-white/10">
          <span className="text-sm font-semibold text-zinc-500">Paso 2</span>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            El vendedor sube la entrada digital a la plataforma.
          </p>
        </li>
        <li className="rounded-xl border border-black/10 p-5 dark:border-white/10">
          <span className="text-sm font-semibold text-zinc-500">Paso 3</span>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            Confirmada la entrega (o pasado el plazo sin reclamos), se libera
            el pago al vendedor.
          </p>
        </li>
      </ol>
    </main>
  );
}
