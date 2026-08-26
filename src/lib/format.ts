const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

/** Formatea un monto en centavos como pesos argentinos ("$ 12.345,67"). */
export function formatArsCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return dateFormatter.format(new Date(date));
}
