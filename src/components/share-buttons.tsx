import { WhatsAppIcon, MailIcon } from "@/components/icons";

/**
 * Botones para que el vendedor le mande el link de su publicación a un
 * comprador puntual — pensado sobre todo para las privadas (no aparecen
 * en /listings, así que compartir el link es la única forma de que
 * alguien llegue). `wa.me/?text=` sin número abre el selector de contacto
 * de WhatsApp en vez de mandarle el mensaje a un número fijo.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const message = `${title} — ${url}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <WhatsAppIcon className="h-4 w-4" />
        WhatsApp
      </a>
      <a
        href={emailHref}
        className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
      >
        <MailIcon className="h-4 w-4" />
        Email
      </a>
    </div>
  );
}
