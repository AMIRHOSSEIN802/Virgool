# Virgool — Project Rules

## HARD RULE: Frontend only

- The agent works ONLY inside `frontend/` (Next.js app). Never create, modify, or delete anything in the backend (repo root: `src/`, `test/`, root `package.json`, `nest-cli.json`, `.env`, configs).
- If a task seems to require a backend change: STOP, describe exactly what is needed (endpoint, DTO, field…) and let the USER apply it — unless the user explicitly says otherwise in that specific case.
- Backend suggestions are welcome anytime, but must be presented as proposals, never applied directly.

## Stack

- Backend: NestJS + TypeScript at repo root.
- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS 4, Tiptap, Zustand, React Hook Form + Zod, Axios. Dev server: `npm run dev` inside `frontend/` → port 3001.
- Note: Next.js version here has breaking changes vs older docs — check `frontend/node_modules/next/dist/docs/` before writing nonstandard code.
