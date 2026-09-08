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

## Flujo de trabajo (live coding)

1. **Plan primero**: ante un enunciado nuevo, proponer endpoints y orden de escenarios ANTES de escribir código, y esperar confirmación del usuario.
2. **Un escenario cada vez**, con TDD: test de integración con supertest → verlo fallar → implementación mínima → verde → refactor si procede.
3. **Commit al cerrar cada escenario** en verde (formato `tipo(scope): resumen` en español).
4. Recurso nuevo = copiar la estructura de 5 ficheros de `src/tasks/` con el lenguaje del dominio del ejercicio.
5. Cambios pequeños y explicados: nada de generar la API entera de golpe.
6. El servidor (`pnpm dev`) y el watch (`pnpm test:watch`) los ejecuta el usuario en sus terminales; no lanzarlos desde la sesión.
