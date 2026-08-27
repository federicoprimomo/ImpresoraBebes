import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  // Corremos siempre detrás de un proxy propio (Traefik/Coolify) que
  // termina el TLS y nos manda el Host real por header — sin esto,
  // Auth.js rechaza cualquier request en producción con "UntrustedHost".
  trustHost: true,
  session: {
    // El adapter de Prisma persiste sesiones en la base (no JWT), así que
    // podemos revocarlas de forma centralizada si hace falta (ej. baneos).
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
});
