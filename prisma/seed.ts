import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed mínimo de desarrollo: promueve a ADMIN al usuario cuyo email se pasa
 * por la variable de entorno SEED_ADMIN_EMAIL. El usuario tiene que haberse
 * logueado al menos una vez con Google antes de correr este script, porque
 * el registro se crea recién en el primer login (vía el adapter de Auth.js).
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.log(
      "SEED_ADMIN_EMAIL no está definida — no se promueve ningún admin.",
    );
    return;
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`Usuario ${user.email} promovido a ADMIN.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
