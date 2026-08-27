# Escrow.ar

Marketplace de reventa de entradas digitales con **pago retenido (escrow)**:
el comprador paga con tarjeta, el dinero queda **autorizado y retenido** en
Mercado Pago (modelo Marketplace, con split automático), y solo se **captura
(libera)** al vendedor cuando la entrada fue entregada y confirmada — o pasó
el plazo de disputa sin reclamos. Resuelve el problema de confianza mutua
típico de la reventa peer-to-peer. La comisión de la plataforma se factura
automáticamente en ARCA (ex-AFIP).

## Cómo funciona

1. El vendedor conecta su propia cuenta de Mercado Pago (OAuth) y publica
   una entrada digital (PDF/QR/código).
2. El comprador paga **solo con tarjeta**. El pago se crea con
   `capture=false` (autorización/reserva) contra la cuenta del vendedor,
   con `application_fee` para la comisión de la plataforma — el dinero
   nunca pasa por una cuenta propia de la plataforma.
3. El vendedor sube el archivo/código de la entrada a la plataforma.
4. El comprador la descarga. Se abre una ventana de tiempo (configurable)
   para reclamar si algo está mal.
5. El comprador descarga la entrada desde la plataforma. Esa primera
   descarga dispara la ventana de reclamo (`RELEASE_TIMEOUT_HOURS`). Si no
   hay reclamo pasado ese plazo, un worker **captura** el pago
   automáticamente (se libera al vendedor, menos la comisión).
6. Si el comprador abre un reclamo antes de eso, la orden queda congelada
   (`DISPUTED`) — el worker deja de tocarla. Un admin la revisa y decide:
   libera el pago al vendedor, o cancela la autorización (el dinero nunca
   salió de la tarjeta del comprador, así que "reembolsar" acá es cancelar
   la reserva, no devolver algo que ya se cobró). Mercado Pago da un
   máximo de **7 días** desde la autorización para resolver esto — pasado
   ese plazo sin capturarse (con o sin reclamo de por medio), la orden
   queda `EXPIRED` y la publicación se reactiva para que el vendedor pueda
   volver a intentarlo.
6. Al liberarse el pago, se emite automáticamente una Factura C por la
   comisión cobrada, vía el webservice de facturación electrónica de ARCA.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL** + **Prisma** como ORM
- **Auth.js (NextAuth v5)** con Google como proveedor de login, sesiones
  persistidas en base vía `@auth/prisma-adapter`
- **Mercado Pago** (Checkout API, modelo Marketplace) — SDK oficial
  `mercadopago` (OAuth, `Payment.create`/`capture`, `WebhookSignatureValidator`)
- **ARCA (ex-AFIP)** — WSAA + WSFEv1 para facturación electrónica de la
  comisión, con firma CMS/PKCS#7 vía `node-forge`
- **Resend** — notificaciones por mail de los eventos de una orden, con
  plantillas editables desde `/admin/emails`
- **Sentry** (`@sentry/nextjs`) — monitoreo de errores en producción
- **Vitest** — tests unitarios y de integración (contra Postgres real)

## Setup local

### 1. Base de datos

Necesitás un Postgres corriendo. Opciones:

```bash
# Local con Prisma (levanta un Postgres embebido para desarrollo)
npx prisma dev

# O tu propio Postgres/Docker, y después:
createdb entrada_segura
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completá (ver comentarios en `.env.example` para el detalle de cada una):

- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` — igual que antes.
- **Mercado Pago**: `MERCADOPAGO_CLIENT_ID`/`MERCADOPAGO_CLIENT_SECRET` (credenciales
  de tu aplicación, para el intercambio OAuth con cada vendedor),
  `MERCADOPAGO_ACCESS_TOKEN` (tu propia cuenta), `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
  (para tokenizar tarjetas en el checkout), `MERCADOPAGO_WEBHOOK_SECRET`.
  Todo desde el [panel de Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel),
  con credenciales de **prueba** hasta certificar el pasaje a producción.
  El `redirect_uri` de OAuth (`NEXT_PUBLIC_APP_URL` + `/api/connected-accounts/oauth/callback`)
  tiene que estar dado de alta en el panel de tu aplicación.
- `MP_TOKEN_ENCRYPTION_KEY`: clave para encriptar los tokens OAuth de cada
  vendedor antes de guardarlos (`openssl rand -base64 32`).
- `CRON_SECRET`: para autorizar al worker de capturas (ver más abajo).
- **ARCA** (opcional — ver sección dedicada más abajo): `ARCA_ENABLED`,
  `ARCA_CUIT`, `ARCA_CERT_BASE64`/`ARCA_KEY_BASE64`, etc.
- **Resend** (opcional): `RESEND_API_KEY`/`EMAIL_FROM` — sin esto, las
  notificaciones por mail de una orden simplemente no se envían.
- **Sentry** (opcional): `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` — sin esto,
  el monitoreo de errores queda inerte.

### 3. Instalar y migrar

```bash
npm install
npm run db:migrate    # aplica el schema a tu base
npm run dev
```

La app queda en `http://localhost:3000`.

### 4. Promover un usuario a admin (opcional, para desarrollo)

Iniciá sesión una vez con la cuenta de Google que querés que sea admin, y
después:

```bash
SEED_ADMIN_EMAIL="tu-email@gmail.com" npm run db:seed
```

### 5. Worker de liberación automática

`GET /api/cron/capture-orders` (con header `Authorization: Bearer $CRON_SECRET`)
marca vencidas las órdenes que superaron los 7 días de Mercado Pago sin
capturarse, y captura las que ya están entregadas y pasaron su ventana de
disputa. Se ejecuta como cron cada 15-30 minutos (ej. Vercel Cron, o
cualquier scheduler que le pegue a ese endpoint).

## Facturación electrónica (ARCA / ex-AFIP)

La comisión que cobra la plataforma (`buyerFeeArs + sellerFeeArs` de cada
orden) se puede facturar automáticamente como **Factura C** al liberarse el
pago, contra el webservice WSFEv1 de ARCA. Es automático por default y
configurable:

- `ARCA_ENABLED="true"` prende la integración (si falta cualquier otro dato
  necesario, queda desactivada sin romper el resto del flujo).
- `ARCA_AUTO_INVOICE_ON_RELEASE` (`true` por default) — si es `false`, la
  factura no se emite sola; un admin la dispara manualmente desde el
  detalle de la orden (`POST /api/orders/:id/invoice`).
- Certificado y clave privada de la facturación electrónica, en base64
  completo (`ARCA_CERT_BASE64` / `ARCA_KEY_BASE64` — ej. `base64 -w0 cert.crt`).
  Se gestionan desde el propio portal de ARCA con clave fiscal — no es algo
  que se pueda generar por código.
- `ARCA_ENVIRONMENT="testing"` usa el ambiente de homologación hasta
  certificar el pasaje a producción.
- El receptor de la factura es el **vendedor** (a quien se le descuenta la
  comisión). Si no cargó CUIT/DNI (`User.taxIdType`/`taxIdNumber`), se
  factura a "Consumidor Final".

**Simplificaciones conocidas, a resolver antes de un volumen serio:**
- No se consulta el padrón de ARCA (`ws_sr_padron_a13`) para saber la
  condición de IVA real del vendedor — se asume un default configurable
  (`ARCA_DEFAULT_CONDICION_IVA_RECEPTOR_CUIT`, Responsable Monotributo por
  default).
- La numeración de comprobante se resuelve pidiéndole a ARCA el último
  autorizado + 1 en cada emisión, serializado con un advisory lock de
  Postgres por (punto de venta, tipo de comprobante) para que dos
  facturas no pidan el mismo número en simultáneo.
- No se genera el PDF del comprobante (con el QR que exige ARCA) — el CAE,
  número y vencimiento quedan guardados y visibles en el detalle de la
  orden, pero falta el layout imprimible.

## Scripts

| Script                    | Qué hace                                                    |
| ------------------------- | ------------------------------------------------------------ |
| `npm run dev`              | Server de desarrollo                                         |
| `npm run build`            | Build de producción                                          |
| `npm run lint`             | Lint del proyecto                                            |
| `npm run db:migrate`       | Corre migraciones de Prisma en desarrollo                    |
| `npm run db:studio`        | Abre Prisma Studio (explorar la base)                        |
| `npm run db:seed`          | Corre `prisma/seed.ts` (promover un admin, cargar FAQ default) |
| `npm run test`             | Tests unitarios (sin base de datos)                          |
| `npm run test:watch`       | Tests unitarios en modo watch                                |
| `npm run test:integration` | Tests de integración (necesita `DATABASE_URL`)               |

## Tests

Dos niveles, separados a propósito:

- **Unitarios** (`src/**/*.test.ts`, `npm run test`) — funciones puras sin
  base de datos: cálculo de comisiones, formateo, plantillas de mail,
  firma/verificación del `state` de OAuth, helpers de XML de ARCA.
- **Integración** (`tests/integration/*.test.ts`, `npm run test:integration`)
  — contra una base Postgres real (la de `DATABASE_URL`). Cubren
  específicamente las condiciones de carrera del flujo de pago: dos
  compradores reservando la misma publicación al mismo tiempo, dos
  capturas concurrentes de la misma orden convergiendo a la misma
  `idempotencyKey`, apertura/resolución de disputas, entrega con hash
  duplicado, contenido editable. Mockean Mercado Pago (`vi.mock`) pero
  escriben de verdad en la base — al terminar cada test borran lo que
  crearon.

CI (`.github/workflows/ci.yml`) corre lint, chequeo de tipos, ambos niveles
de test contra un servicio de Postgres, y el build, en cada push/PR.

## Modelo de datos

Ver `prisma/schema.prisma`. Entidades principales:

- **User**: comprador/vendedor (mismo rol) o admin; opcionalmente con
  CUIT/DNI para la facturación de comisión.
- **ConnectedAccount**: vínculo OAuth con la cuenta de Mercado Pago de un
  vendedor (tokens encriptados).
- **Listing**: una entrada publicada en venta.
- **Order**: el ciclo de vida completo de una compra — pago pendiente →
  autorizado/retenido → entregado → liberado (capturado) / en disputa /
  reembolsado / vencido.
- **DeliveryFile**: referencia al archivo de la entrada subido por el
  vendedor, con hash del contenido para detectar reventa duplicada.
- **FileBlob**: backend de storage por default para los archivos de
  entrega (viven en la base) — reemplazable por storage de objetos sin
  tocar `DeliveryFile` (ver `src/lib/storage.ts`).
- **Dispute**: reclamo de un comprador (`OPEN`) y su resolución por un
  admin (`RESOLVED_RELEASE`/`RESOLVED_REFUND`) — o cerrado automáticamente
  si vence el plazo de 7 días de Mercado Pago sin que nadie lo resuelva.
- **CommissionLedgerEntry**: registro de comisiones cobradas, para reportes.
- **Invoice**: factura de comisión emitida (o fallida) en ARCA, con CAE.
- **ArcaAuthTicket**: token de acceso a los webservices de ARCA, cacheado.

## Roadmap

- [x] **Etapa 1** — Scaffold, modelo de datos, login con Google.
- [x] **Etapa 2** — Modelo Marketplace de Mercado Pago: OAuth de vendedores,
      checkout solo con tarjeta, reserva + captura con split
      (`application_fee`), worker de liberación automática, webhook, y
      facturación automática de la comisión en ARCA.
- [x] **Etapa 3** — Entrega digital de la entrada: el vendedor sube el
      archivo (PDF/PNG/JPG/WEBP, hasta 8MB) desde el detalle de la orden,
      con hash sha256 que rechaza reutilizar el mismo archivo en otra
      venta; el comprador la descarga desde ahí, y esa primera descarga
      dispara `releaseDueAt` — con esto el worker de la etapa 2 ya tiene
      algo que liberar solo.
- [x] **Etapa 4** — El comprador puede abrir un reclamo desde el detalle
      de la orden (congela la orden en `DISPUTED`, el worker deja de
      tocarla); un admin lo resuelve liberando el pago o cancelando la
      autorización. Si nadie lo resuelve antes de los 7 días de Mercado
      Pago, el worker lo cierra solo como reembolso y reactiva la
      publicación.
- [x] **Etapa 5** — Panel de admin (`/admin`): comisión total cobrada,
      volumen transaccionado, vendedores conectados, órdenes por estado,
      y accesos directos a lo que necesita atención (reclamos abiertos,
      facturas de ARCA que fallaron) además de una tabla de comisiones
      recientes.

Con esto están las 5 etapas del roadmap original, más una revisión general
de concurrencia (reserva atómica de publicaciones, captura idempotente
bajo llamados en paralelo, numeración de factura serializada) hecha
después de un chequeo completo del código.

Después de la revisión se sumó, sin cambiar el flujo de pago en sí:
contenido editable desde `/admin/content` (textos de la landing, FAQ,
legales), notificaciones por mail de los 8 eventos de una orden con
plantillas editables en `/admin/emails`, monitoreo de errores con Sentry,
y la suite de tests (unitarios + integración) con CI en GitHub Actions.

Lo que sigue no es funcionalidad nueva sino terminar de cerrar las
simplificaciones ya documentadas arriba (padrón de IVA de ARCA, PDF con QR
de la factura), soporte real de múltiples entradas por publicación (hoy
cada publicación es de una sola entrada — el campo `quantity` existe en el
modelo pero no hay lógica de stock todavía), y cargar credenciales reales
para probar el flujo de punta a punta con plata de verdad.

## Nota legal

El dinero de las compras pasa por Mercado Pago (autorización + captura vía
su API, modelo Marketplace), no por una cuenta bancaria propia de la
plataforma. Esto evita que el proyecto quede alcanzado por las regulaciones
de custodia de fondos de terceros que aplicarían si el dinero pasara
literalmente por una cuenta del proyecto antes de llegar al vendedor.
