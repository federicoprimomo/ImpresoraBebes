/**
 * Ícono oficial de Mercado Pago (el mismo que usan como favicon en
 * mercadopago.com.ar) + su nombre, para dejar claro en toda la app qué
 * empresa procesa cada pago. Nunca se usa como logo de Escrow.ar — es al
 * revés, es la marca de un tercero que estamos citando para generar
 * confianza, así que va siempre acompañado del nombre en texto plano.
 */
export function MercadoPagoBadge({
  className = "",
  iconClassName = "h-5 w-5",
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático, sin optimización de next/image necesaria */}
      <img
        src="/mercadopago-icon.svg"
        alt="Mercado Pago"
        className={`shrink-0 ${iconClassName}`}
      />
      <span className="font-semibold text-[#0a0080] dark:text-[#4dd2ff]">
        Mercado Pago
      </span>
    </span>
  );
}
