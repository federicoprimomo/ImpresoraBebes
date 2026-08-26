# Entrada Segura

Marketplace de reventa de entradas digitales con **pago retenido (escrow)**:
el comprador paga, el dinero queda retenido, y solo se libera al vendedor
cuando la entrada fue entregada y confirmada (o pasó el plazo de disputa sin
reclamos). Resuelve el problema de confianza mutua típico de la reventa
peer-to-peer.

## Cómo funciona

1. El vendedor publica una entrada digital (PDF/QR/código).
2. El comprador paga con Mercado Pago. El dinero queda **retenido**, no se
   le acredita al vendedor todavía.
3. El vendedor sube el archivo/código de la entrada a la plataforma.
4. El comprador la descarga. Se abre una ventana de tiempo (configurable)
   para reclamar si algo está mal.
5. Si no hay reclamo pasado ese plazo, el pago se libera automáticamente al
   vendedor (menos la comisión). Si el comprador abre una disputa, un admin
   revisa la evidencia y decide liberar el pago o reembolsar.

La comisión de la plataforma se divide entre comprador y vendedor.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL** + **Prisma** como ORM
- **Auth.js (NextAuth v5)** con Google como proveedor de login, sesiones
  persistidas en base vía `@auth/prisma-adapter`
- **Mercado Pago** (Checkout Pro) para el cobro con retención de pago

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

Completá:

- `DATABASE_URL`: cadena de conexión a tu Postgres.
- `AUTH_SECRET`: generalo con `openssl rand -base64 32`.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: credenciales OAuth de Google
  ([console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)).
  Callback URL a autorizar: `http://localhost:3000/api/auth/callback/google`.
- `MERCADOPAGO_*`: credenciales de **prueba** desde el panel de
  [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel).
  No son necesarias todavía — se usan a partir de la etapa 2 (checkout).

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

## Scripts

| Script              | Qué hace                                   |
| -------------------- | ------------------------------------------- |
| `npm run dev`         | Server de desarrollo                        |
| `npm run build`       | Build de producción                         |
| `npm run lint`        | Lint del proyecto                           |
| `npm run db:migrate`  | Corre migraciones de Prisma en desarrollo   |
| `npm run db:studio`   | Abre Prisma Studio (explorar la base)       |
| `npm run db:seed`     | Corre `prisma/seed.ts` (promover un admin)  |

## Modelo de datos

Ver `prisma/schema.prisma`. Entidades principales:

- **User**: comprador/vendedor (mismo rol) o admin.
- **Listing**: una entrada publicada en venta.
- **Order**: el ciclo de vida completo de una compra — pago pendiente →
  retenido → entregado → liberado / en disputa / reembolsado.
- **DeliveryFile**: referencia al archivo de la entrada subido por el
  vendedor, con hash del contenido para detectar reventa duplicada.
- **Dispute**: reclamo de un comprador y su resolución por un admin.
- **CommissionLedgerEntry**: registro de comisiones cobradas, para reportes.

## Roadmap

- [x] **Etapa 1** — Scaffold, modelo de datos, login con Google.
- [ ] **Etapa 2** — Publicación de entradas y checkout con Mercado Pago
      (retención de pago).
- [ ] **Etapa 3** — Entrega digital de la entrada (subida/descarga + hash
      anti-reutilización).
- [ ] **Etapa 4** — Liberación automática por timeout + sistema de
      disputas.
- [ ] **Etapa 5** — Panel de admin: comisiones y reportes.

## Nota legal

El dinero de las compras pasa por Mercado Pago (retención de pago vía su
API), no por una cuenta bancaria propia de la plataforma. Esto evita que el
proyecto quede alcanzado por las regulaciones de custodia de fondos de
terceros que aplicarían si el dinero pasara literalmente por una cuenta del
proyecto antes de llegar al vendedor.
