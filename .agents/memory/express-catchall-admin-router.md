---
name: Express catch-all admin router pattern
description: Sub-routers with role-check middleware block all unmatched requests when mounted without a path prefix inside a public router.
---

## The Rule
Never mount a sub-router that has a role-check middleware (returns 403 for non-admins) using `router.use(subRouter)` without a path prefix inside a public router. This makes it a catch-all that blocks every request not matched by an earlier route.

**Why:** Express passes ALL requests to `router.use(subRouter)` regardless of path. The sub-router's middleware (e.g. `if role !== admin → 403`) runs before any route matching inside the sub-router. Any request that reaches it — including routes meant for entirely different routers registered later — gets blocked.

**How to apply:** When a route file (e.g. `responsaveis.ts`) has both public routes and admin-only routes:
1. Define admin routes in a separate local Router (e.g. `const adminRouter = Router()`)
2. Do NOT mount it inside the public router with `router.use(adminRouter)`
3. Export it as a named export: `export { adminRouter as responsaveisAdminRouter }`
4. In `routes/index.ts`, mount it explicitly after routes that need to be unblocked (e.g. aiRouter)

**Concrete case:** `responsaveis.ts` had `router.use(adminRouter)` at the end of the public router. Every request that didn't match `/responsaveis-financeiros` (including `/ai/parse-cliente`) hit the local adminRouter's 403 middleware. Fixed by exporting `responsaveisAdminRouter` separately and mounting it in `index.ts` after `aiRouter`.
