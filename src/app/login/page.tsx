import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Ingresá a Escrow.ar
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Comprá y vendé entradas con el pago retenido hasta que la entrada
          esté confirmada.
        </p>

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Continuar con Google
          </button>
        </form>
      </div>
    </div>
  );
}
