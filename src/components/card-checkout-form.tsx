"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// El SDK de Mercado Pago no publica tipos oficiales para v2; lo tipamos
// mínimamente con lo que efectivamente usamos.
type CardFormData = {
  token: string;
  paymentMethodId: string;
  issuerId: string;
  installments: string;
  identificationType: string;
  identificationNumber: string;
  cardholderEmail: string;
};

type CardForm = {
  getCardFormData: () => CardFormData;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => {
      cardForm: (config: {
        amount: string;
        iframe: boolean;
        form: Record<string, { id: string; placeholder?: string }>;
        callbacks: {
          onFormMounted: (error?: unknown) => void;
          onSubmit: (event: Event) => void;
          onFetching?: (resource: string) => () => void;
        };
      }) => CardForm;
    };
  }
}

const SDK_SRC = "https://sdk.mercadopago.com/js/v2";
const SDK_SCRIPT_ID = "mercadopago-sdk-v2";

type Status = "loading-sdk" | "ready" | "submitting" | "error";

export function CardCheckoutForm({
  listingId,
  amountArs,
  publicKey,
}: {
  listingId: string;
  amountArs: number; // en centavos
  publicKey: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(
    publicKey ? "loading-sdk" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    publicKey
      ? null
      : "Falta configurar la clave pública de Mercado Pago (NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY).",
  );
  const cardFormRef = useRef<CardForm | null>(null);

  useEffect(() => {
    // El caso "sin publicKey" ya quedó reflejado en el estado inicial de
    // arriba — acá solo hace falta no seguir de largo con la carga del SDK.
    if (!publicKey) return;

    let cancelled = false;

    function initCardForm() {
      if (cancelled || !window.MercadoPago) return;

      const mp = new window.MercadoPago(publicKey as string, {
        locale: "es-AR",
      });

      cardFormRef.current = mp.cardForm({
        amount: String(amountArs / 100),
        iframe: true,
        form: {
          cardNumber: {
            id: "form-checkout__cardNumber",
            placeholder: "Número de tarjeta",
          },
          expirationDate: {
            id: "form-checkout__expirationDate",
            placeholder: "MM/YY",
          },
          securityCode: {
            id: "form-checkout__securityCode",
            placeholder: "Código de seguridad",
          },
          cardholderName: {
            id: "form-checkout__cardholderName",
            placeholder: "Titular de la tarjeta",
          },
          issuer: { id: "form-checkout__issuer" },
          installments: { id: "form-checkout__installments" },
          identificationType: { id: "form-checkout__identificationType" },
          identificationNumber: {
            id: "form-checkout__identificationNumber",
            placeholder: "Número de documento",
          },
          cardholderEmail: {
            id: "form-checkout__cardholderEmail",
            placeholder: "E-mail",
          },
        },
        callbacks: {
          onFormMounted: (error) => {
            if (cancelled) return;
            if (error) {
              setErrorMessage("No pudimos cargar el formulario de tarjeta.");
              setStatus("error");
              return;
            }
            setStatus("ready");
          },
          onSubmit: (event) => {
            event.preventDefault();
            if (!cardFormRef.current) return;

            setStatus("submitting");
            setErrorMessage(null);

            const data = cardFormRef.current.getCardFormData();

            fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                listingId,
                cardToken: data.token,
                paymentMethodId: data.paymentMethodId,
                issuerId: data.issuerId,
                installments: Number(data.installments),
                identificationType: data.identificationType,
                identificationNumber: data.identificationNumber,
                payerEmail: data.cardholderEmail,
              }),
            })
              .then(async (response) => {
                const json = await response.json();
                if (!response.ok) {
                  throw new Error(json.error ?? "No pudimos procesar el pago.");
                }
                router.push(`/orders/${json.orderId}`);
              })
              .catch((err: Error) => {
                if (cancelled) return;
                setErrorMessage(err.message);
                setStatus("ready");
              });
          },
          onFetching: () => {
            // El SDK espera que devolvamos un "cleanup" (ej. detener un loader).
            return () => {};
          },
        },
      });
    }

    if (window.MercadoPago) {
      initCardForm();
    } else {
      let script = document.getElementById(
        SDK_SCRIPT_ID,
      ) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SDK_SCRIPT_ID;
        script.src = SDK_SRC;
        document.body.appendChild(script);
      }
      script.addEventListener("load", initCardForm);
    }

    return () => {
      cancelled = true;
    };
  }, [amountArs, listingId, publicKey, router]);

  const fieldClass =
    "h-11 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent";

  return (
    <form id="form-checkout" className="flex flex-col gap-3">
      <div id="form-checkout__cardNumber" className={fieldClass} />
      <div className="flex gap-3">
        <div id="form-checkout__expirationDate" className={`${fieldClass} flex-1`} />
        <div id="form-checkout__securityCode" className={`${fieldClass} flex-1`} />
      </div>
      <input
        id="form-checkout__cardholderName"
        type="text"
        placeholder="Titular de la tarjeta"
        className={fieldClass}
      />
      <select id="form-checkout__issuer" className={fieldClass} />
      <select id="form-checkout__installments" className={fieldClass} />
      <div className="flex gap-3">
        <select
          id="form-checkout__identificationType"
          className={`${fieldClass} w-28`}
        />
        <input
          id="form-checkout__identificationNumber"
          type="text"
          placeholder="Número de documento"
          className={`${fieldClass} flex-1`}
        />
      </div>
      <input
        id="form-checkout__cardholderEmail"
        type="email"
        placeholder="E-mail"
        className={fieldClass}
      />

      {errorMessage ? (
        <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
      ) : null}

      <button
        id="form-checkout__submit"
        type="submit"
        disabled={status === "loading-sdk" || status === "submitting" || status === "error"}
        className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {status === "submitting"
          ? "Procesando..."
          : status === "loading-sdk"
            ? "Cargando..."
            : "Pagar"}
      </button>
    </form>
  );
}
