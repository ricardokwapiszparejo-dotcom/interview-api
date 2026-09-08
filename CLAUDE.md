# interview-api

Esqueleto de API REST para ejercicio de live coding. Express 5 + TypeScript (strict) + Vitest + supertest.

## Comandos

- `pnpm dev` — servidor con hot reload (tsx watch) en :3000
- `pnpm test` — tests (Vitest + supertest)
- `pnpm typecheck` — comprobación de tipos sin emitir

## Arquitectura

Módulos por recurso bajo `src/<recurso>/`, con capas OOP y dependencias por constructor:

- `*.entity.ts` — entidad de dominio (clase)
- `*.repository.ts` — interfaz del repositorio (puerto)
- `in-memory-*.repository.ts` — implementación en memoria (adaptador)
- `*.service.ts` — lógica de negocio; recibe el repositorio por constructor
- `*.router.ts` — capa HTTP (Express Router); solo traduce HTTP ↔ servicio

`src/app.ts` es una factoría (`createApp()`) separada de `src/server.ts` (listener) para que los tests monten la app sin abrir puerto.

El módulo `tasks` es el ejemplo de referencia: al añadir un recurso nuevo, copiar su estructura.

## Reglas

- Código, comentarios y nombres en inglés; commits en español (formato conventional `tipo(scope): resumen`).
- TDD cuando sea posible: test con supertest primero, luego implementación.
- Errores de dominio como clases (`TaskNotFoundError`); el router los mapea a códigos HTTP.
- ESM: los imports relativos llevan extensión `.js`.
