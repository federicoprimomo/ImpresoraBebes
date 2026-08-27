import type { Provincia } from "@prisma/client";

/**
 * Las 24 provincias de Argentina (23 + CABA). Lista fija a propósito — a
 * diferencia de localidad/género, esto no necesita administrarse desde
 * ningún lado.
 */
export const PROVINCIA_LABELS: Record<Provincia, string> = {
  CABA: "Ciudad Autónoma de Buenos Aires",
  BUENOS_AIRES: "Buenos Aires",
  CATAMARCA: "Catamarca",
  CHACO: "Chaco",
  CHUBUT: "Chubut",
  CORDOBA: "Córdoba",
  CORRIENTES: "Corrientes",
  ENTRE_RIOS: "Entre Ríos",
  FORMOSA: "Formosa",
  JUJUY: "Jujuy",
  LA_PAMPA: "La Pampa",
  LA_RIOJA: "La Rioja",
  MENDOZA: "Mendoza",
  MISIONES: "Misiones",
  NEUQUEN: "Neuquén",
  RIO_NEGRO: "Río Negro",
  SALTA: "Salta",
  SAN_JUAN: "San Juan",
  SAN_LUIS: "San Luis",
  SANTA_CRUZ: "Santa Cruz",
  SANTA_FE: "Santa Fe",
  SANTIAGO_DEL_ESTERO: "Santiago del Estero",
  TIERRA_DEL_FUEGO: "Tierra del Fuego",
  TUCUMAN: "Tucumán",
};

export const PROVINCIA_OPTIONS: Array<{ value: Provincia; label: string }> =
  Object.entries(PROVINCIA_LABELS)
    .map(([value, label]) => ({ value: value as Provincia, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

/** Plataformas de envío más comunes en Argentina — lista fija + "Otra" a texto libre en el form. */
export const DELIVERY_PLATFORMS = [
  "Ticketek",
  "AllAccess",
  "Passline",
  "Entrada Uno",
  "TuEntrada",
  "Plateanet",
] as const;
