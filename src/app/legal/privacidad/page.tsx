export const metadata = { title: "Privacidad — Escrow.ar" };

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Privacidad
      </h1>
      <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Borrador de referencia — describe qué datos maneja la plataforma
        tal como está construida hoy. No reemplaza una revisión por un
        abogado antes de publicarse como política vinculante.
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Qué datos manejamos
          </h2>
          <ul className="mt-2 list-disc pl-5">
            <li>Nombre, email e imagen de perfil de tu cuenta de Google.</li>
            <li>
              Si vendés: el token de acceso OAuth de tu cuenta de Mercado
              Pago, guardado encriptado, para poder crear y liberar pagos
              en tu nombre.
            </li>
            <li>
              Los archivos de entrada que subís para entregarlas, y el
              hash de su contenido (para detectar reventa duplicada).
            </li>
            <li>
              Datos de la operación: precio, comisión, estados y fechas de
              cada compra/venta, y — si corresponde — el motivo de un
              reclamo.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Qué NO manejamos
          </h2>
          <p className="mt-2">
            No vemos ni guardamos el número de tu tarjeta — se tokeniza
            directo en tu navegador contra Mercado Pago. No tenemos acceso
            a tu cuenta bancaria.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Con quién se comparte
          </h2>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <strong>Google</strong>, para el inicio de sesión.
            </li>
            <li>
              <strong>Mercado Pago</strong>, para procesar el pago
              (autorización, retención, liberación).
            </li>
            <li>
              <strong>ARCA</strong> (ex-AFIP), al facturar electrónicamente
              la comisión cobrada.
            </li>
            <li>
              La otra parte de cada operación ve lo estrictamente
              necesario (nombre, email, y el estado de la orden en común).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Tus derechos
          </h2>
          <p className="mt-2">
            Podés pedir acceso a tus datos, corregirlos, o pedir que se
            borren (salvo lo que tengamos que conservar por obligaciones
            fiscales, como los registros de facturación) escribiendo a{" "}
            <a href="mailto:hola@escrow.ar" className="underline">
              hola@escrow.ar
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
