# Análisis de la base del código y propuesta para persistir `cartItems` en DB

## 1) Arquitectura actual (resumen)

- **Frontend**: Next.js App Router (`app/`) + componentes React en `components/`.
- **Estado cliente**: `zustand` con `persist` en `localStorage` para el carrito (`store/cartStore.ts`).
- **Backend/DB**: Prisma + PostgreSQL (`prisma/schema.prisma`, `lib/prisma.ts`, `lib/data/productsData.ts`).
- **Auth**: NextAuth con adapter Prisma (`app/api/[...nextauth]/route.ts`, `auth.ts`).

### Hallazgos principales

1. El carrito actualmente vive sólo en cliente (`zustand/persist`) y no existe una entidad de carrito en la DB.
2. El último cambio ya migró catálogo a DB (productos/categorías), pero el carrito aún depende de estado local.
3. Hay una mezcla de concerns: cálculo de totales y lectura de catálogo se hace en cliente, sin validación server-side para precios al momento de checkout.

---

## 2) Análisis del último commit (`d67a83d - setup db`)

### Qué mejoró

- Se conecta `shop` y `shopping-cart` a datos de Prisma (`getAllProducts`).
- Se corrigió el `addToCart` para usar `product.id` real en vez de hardcode.
- Se alinearon IDs del carrito a `string`, consistente con `cuid` de Prisma.

### Riesgos / deuda técnica detectada

1. **Regresión funcional en filtros de `ProductListSec`**
   - Se eliminaron estados y lógica de búsqueda/ordenación; los controles quedaron sólo visuales.
   - Impacto: UX degradada (el usuario cree que puede filtrar, pero no hace nada).

2. **Carrito acoplado a catálogo cargado en página**
   - `CartItems` resuelve datos del carrito buscando en `products` del page.
   - Si el producto desaparece o está inactivo, hoy lanza error (`throw new Error("Product not found")`) y rompe render.

3. **Modelo de datos incompleto para checkout real**
   - El carrito no guarda snapshot de precio/opciones; solo `id`+`quantity`.
   - Si cambia `basePriceCents`, el subtotal histórico cambia sin control.

4. **Sin sincronización multi-dispositivo**
   - Al estar sólo en localStorage, usuario logueado pierde carrito entre dispositivos/sesiones nuevas.

---

## 3) Propuesta: persistir `cartItems` en DB

## Objetivo
Tener un carrito duradero, sincronizable y consistente para usuarios autenticados, manteniendo experiencia rápida en cliente.

## Estrategia recomendada: **modelo híbrido**

- **Guest**: mantener `zustand + localStorage`.
- **Authenticated**: fuente de verdad en DB (`Cart`, `CartItem`), con sincronización al iniciar sesión.

Esto evita fricción de checkout para invitado y habilita persistencia real para usuarios registrados.

---

## 4) Diseño de datos propuesto (Prisma)

```prisma
model Cart {
  id        String   @id @default(cuid())
  userId    String?  @unique @map("user_id")
  status    CartStatus @default(ACTIVE)
  currency  String   @default("USD")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user  User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CartItem[]

  @@index([status, updatedAt])
  @@map("carts")
}

enum CartStatus {
  ACTIVE
  CHECKED_OUT
  ABANDONED
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String   @map("cart_id")
  productId String   @map("product_id")
  quantity  Int

  // Snapshot para evitar inconsistencias por cambios de precio/nombre
  unitPriceCents Int    @map("unit_price_cents")
  productName    String @map("product_name")
  imageUrl       String? @map("image_url")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@unique([cartId, productId])
  @@index([cartId])
  @@index([productId])
  @@map("cart_items")
}
```

> Nota: si vas a soportar modifiers/opciones, el unique ideal pasa a ser `@@unique([cartId, productId, configurationHash])` y agregas `configurationJson` + `configurationHash`.

---

## 5) Flujos de negocio

1. **GET `/api/cart`**
   - Crea carrito activo si no existe (para user logueado).
   - Devuelve ítems + totales calculados en servidor.

2. **POST `/api/cart/items`**
   - Input: `productId`, `quantity`, opcionales `optionIds`.
   - Valida producto activo.
   - Upsert item y actualiza cantidad.
   - Guarda snapshot (`unitPriceCents`, etc.) para coherencia.

3. **PATCH `/api/cart/items/:id`**
   - Cambia cantidad (si 0, elimina).

4. **DELETE `/api/cart/items/:id`**
   - Remueve ítem.

5. **POST `/api/cart/merge`** (al login)
   - Recibe carrito local (guest), lo fusiona en carrito DB.
   - Regla recomendada: sumar cantidades por SKU/configuración.

---

## 6) Integración con el store actual (`zustand`)

- Mantén API de store (`addItem/removeItem/updateQuantity`) para no romper UI.
- Agrega capa de sincronización:
  - Si `session.user` existe -> mutaciones optimistas + llamada API.
  - Si no existe -> localStorage (comportamiento actual).
- Al montar app autenticada:
  1. cargar carrito DB,
  2. hidratar store,
  3. opcionalmente vaciar `cart-storage` local tras merge exitoso.

---

## 7) Mejoras inmediatas recomendadas (corto plazo)

1. Restaurar filtro/orden real en `ProductListSec` (client state + memo).
2. En `CartItems`, manejar producto faltante de forma tolerante (no lanzar error de render).
3. Centralizar cálculo de totales en servidor para checkout (`subtotal/tax/shipping/total`).
4. Añadir tests de integración para APIs de carrito y merge al login.

---

## 8) Plan incremental sugerido

- **Fase 1:** crear modelos Prisma + migración + endpoints CRUD básicos.
- **Fase 2:** sincronización híbrida store/API (sin modifiers).
- **Fase 3:** merge guest→user y métricas de abandono.
- **Fase 4:** soporte completo de modifiers/configuración y promociones.

---

## 9) Criterios de aceptación

- Un usuario autenticado mantiene carrito al cerrar sesión/iniciar en otro dispositivo.
- Cambios de cantidad se reflejan en UI y DB consistentemente.
- El checkout no depende de precios del cliente.
- El carrito no rompe UI si un producto queda inactivo/eliminado.
