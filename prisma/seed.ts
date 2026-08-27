import { PrismaClient } from "@prisma/client";

import { FAQ_DEFAULTS } from "../src/lib/site-content";

const prisma = new PrismaClient();

/**
 * Seed mínimo de desarrollo:
 *   1. Promueve a ADMIN al usuario cuyo email se pasa por SEED_ADMIN_EMAIL
 *      (tiene que haberse logueado al menos una vez con Google antes,
 *      porque el registro se crea recién en el primer login).
 *   2. Carga las preguntas frecuentes por defecto como filas editables en
 *      FaqItem, si la tabla todavía está vacía — así el admin ya tiene algo
 *      concreto para editar en vez de partir de cero.
 */
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
    console.log("FaqItem ya tiene datos — no se tocó.");
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
