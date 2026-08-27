const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

/** Formatea un monto en centavos como pesos argentinos ("$ 12.345,67"). */
export function formatArsCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

/**
 * UTC-3 fijo todo el año (Argentina no tiene horario de verano desde
 * 2009) — a diferencia de casi cualquier otro huso horario, esto hace que
 * sea seguro hardcodear el nombre de zona en vez de calcularlo.
 */
export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

// Server-side esto corre con el huso horario del proceso (UTC en
// producción) — sin fijar `timeZone` acá, un mismo Date se mostraría con
// una hora distinta según en qué servidor se renderice la página, en vez
// de siempre en hora argentina como espera cualquiera que use el sitio.
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ARGENTINA_TIME_ZONE,
});

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return dateFormatter.format(new Date(date));
}

/**
 * Convierte el valor de un <input type="datetime-local"> (sin huso
 * horario, ej. "2026-08-27T18:00") asumiendo que esa hora es en horario
 * de Argentina. Sin esto, `new Date(raw)` la interpreta con el huso
 * horario del proceso que corre el server (UTC en producción) — corre la
 * hora real 3hs, suficiente para que un evento recién cargado ya
 * aparezca como "pasado" y desaparezca de la lista apenas se publica.
 */
export function parseArgentinaDateTimeLocal(raw: string): Date | null {
  if (!raw) return null;
  const hasSeconds = raw.split("T")[1]?.split(":").length === 3;
  const withSeconds = hasSeconds ? raw : `${raw}:00`;
  const parsed = new Date(`${withSeconds}-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Inversa de `parseArgentinaDateTimeLocal`: para precargar un
 * `eventDate` guardado en el `defaultValue` de un
 * <input type="datetime-local"> en el form de editar. Como Argentina es
 * UTC-3 fijo, alcanza con correr el instante 3hs y leer los componentes en
 * UTC — evita depender de Intl para armar el string exacto que ese input
 * espera ("YYYY-MM-DDTHH:mm").
 */
export function toArgentinaDateTimeLocalInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const shifted = new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}
