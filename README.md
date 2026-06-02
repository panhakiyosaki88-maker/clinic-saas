# Clinic SaaS

Multi-clinic management system for doctors & small clinics — Next.js 15 + Supabase.

## Quick start
```bash
cp .env.example .env.local   # add your Supabase keys
npm install
supabase start               # local stack (requires Docker + Supabase CLI)
supabase db reset            # apply migrations + seed
npm run db:types             # regenerate DB types
npm run dev                  # http://localhost:3000
```

## Project layout & conventions
See [CLAUDE.md](./CLAUDE.md). Module docs live in [docs/modules/](./docs/modules/).

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run db:reset` | Reset local DB (migrations + seed) |
| `npm run db:types` | Regenerate `src/types/database.ts` |

## Status
Module 1 (Multi-Clinic Foundation) complete. Roadmap in [CLAUDE.md](./CLAUDE.md).
