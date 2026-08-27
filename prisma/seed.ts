import { PrismaClient } from "@prisma/client";

import { FAQ_DEFAULTS } from "../src/lib/site-content";
import { GENRE_DEFAULTS } from "../src/lib/genres";

const prisma = new PrismaClient();

/**
 * Seed mínimo de desarrollo:
 *   1. Promueve a ADMIN al usuario cuyo email se pasa por SEED_ADMIN_EMAIL
 *      (tiene que haberse logueado al menos una vez con Google antes,
 *      porque el registro se crea recién en el primer login).
 *   2. Carga las preguntas frecuentes por defecto como filas editables en
 *      FaqItem, si la tabla todavía está vacía — así el admin ya tiene algo
 *      concreto para editar en vez de partir de cero. Si la tabla ya tiene
 *      datos (de un seed anterior), agrega solo las preguntas de
 *      FAQ_DEFAULTS que todavía no existan — así una pregunta nueva que se
 *      suma en el código llega sola a producción con un re-run del seed,
 *      sin pisar nada que ya esté editado a mano.
 *   3. Borra preguntas obsoletas por texto exacto (OBSOLETE_FAQ_QUESTIONS)
 *      — quedaron de una redacción vieja (ej. "la comisión se reparte entre
 *      comprador y vendedor", de cuando existía ese modelo) que ya no
 *      describe cómo funciona la plataforma y nadie fue a borrar a mano.
 *   4. Carga géneros y subgéneros por defecto (GENRE_DEFAULTS) con upsert
 *      por nombre — crea los que falten, nunca pisa uno que el admin ya
 *      haya renombrado o editado desde /admin/categories.
 */
const OBSOLETE_FAQ_QUESTIONS = [
  // Del modelo de comisión dividida (reemplazado por 10% único a cargo
  // del vendedor) — ver commit "Comisión única del 10%...".
  "¿La comisión es la misma para el comprador y el vendedor?",
  // Reemplazada por una versión que también aclara "dinero en cuenta" de
  // Mercado Pago y que solo se acepta tarjeta — ver commit "Aclarar forma
  // de pago y cuotas con interés".
  "¿Por qué no acepta transferencia o efectivo?",
];
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.log(
      "SEED_ADMIN_EMAIL no está definida — no se promueve ningún admin.",
    );
  } else {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    console.log(`Usuario ${user.email} promovido a ADMIN.`);
  }

  const { count: obsoleteDeleted } = await prisma.faqItem.deleteMany({
    where: { question: { in: OBSOLETE_FAQ_QUESTIONS } },
  });
  if (obsoleteDeleted > 0) {
    console.log(`Borradas ${obsoleteDeleted} pregunta(s) frecuente(s) obsoleta(s).`);
  }

  const faqCount = await prisma.faqItem.count();
  if (faqCount === 0) {
    await prisma.faqItem.createMany({
      data: FAQ_DEFAULTS.map((item, index) => ({
        question: item.question,
        answer: item.answer,
        order: index,
      })),
    });
    console.log(`Cargadas ${FAQ_DEFAULTS.length} preguntas frecuentes por defecto.`);
  } else {
    const existingQuestions = new Set(
      (await prisma.faqItem.findMany({ select: { question: true } })).map(
        (f) => f.question,
      ),
    );
    const missing = FAQ_DEFAULTS.filter((item) => !existingQuestions.has(item.question));
    if (missing.length > 0) {
      const maxOrder = await prisma.faqItem.aggregate({ _max: { order: true } });
      let nextOrder = (maxOrder._max.order ?? -1) + 1;
      await prisma.faqItem.createMany({
        data: missing.map((item) => ({
          question: item.question,
          answer: item.answer,
          order: nextOrder++,
        })),
      });
      console.log(
        `Agregadas ${missing.length} pregunta(s) frecuente(s) nueva(s): ${missing
          .map((m) => m.question)
          .join(" / ")}`,
      );
    } else {
      console.log("FaqItem ya tiene todas las preguntas por defecto — no se tocó.");
    }
  }

  let genresCreated = 0;
  let subgenresCreated = 0;
  for (const [index, genreDefault] of GENRE_DEFAULTS.entries()) {
    const existing = await prisma.genre.findUnique({ where: { name: genreDefault.name } });
    const genre = await prisma.genre.upsert({
      where: { name: genreDefault.name },
      create: { name: genreDefault.name, order: index },
      update: {},
    });
    if (!existing) genresCreated++;

    for (const [subIndex, subgenreName] of genreDefault.subgenres.entries()) {
      const existingSubgenre = await prisma.subgenre.findUnique({
        where: { genreId_name: { genreId: genre.id, name: subgenreName } },
      });
      await prisma.subgenre.upsert({
        where: { genreId_name: { genreId: genre.id, name: subgenreName } },
        create: { genreId: genre.id, name: subgenreName, order: subIndex },
        update: {},
      });
      if (!existingSubgenre) subgenresCreated++;
    }
  }
  if (genresCreated > 0 || subgenresCreated > 0) {
    console.log(`Cargados ${genresCreated} género(s) y ${subgenresCreated} subgénero(s) nuevos.`);
  } else {
    console.log("Genre/Subgenre ya tienen todos los defaults — no se tocó.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
