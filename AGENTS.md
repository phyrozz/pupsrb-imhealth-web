# Current frontend

Follow the workspace root `AGENTS.md`. Only AWS profile `imhealth-dev` is permitted. All browser and test flows must avoid live database access, including indirect access through APIs and Cognito triggers.

The frontend engineer owns this React / TypeScript / Vite application. Follow the current Mantine components, React Router routes, `src/context/AuthContext.tsx`, and `src/lib/api.ts`. Migrate pages and components from `../legacy/` into the existing layouts and pages; do not add Next.js server routes or privileged Supabase clients to this application.

Keep persistence and privileged business logic in `../pupsrb-imhealth-api/`. Coordinate typed API payloads, pagination, dates, errors, and authorization with the backend engineer. Preserve legacy assessment behavior, student workflows, dashboard charts, reporting, and account flows for the feature being migrated. Provide accessible loading, empty, error, and success states. Never put AWS or database credentials in `VITE_*` variables or browser bundles.

Review configuration and lifecycle scripts before running checks. Existing checks are `npm run lint` and `npm run build`; there is no test script yet. Use mocked API responses and authentication for component/browser tests and prevent unhandled requests from reaching live services. Do not load real `.env` files or submit forms to deployed endpoints as a verification step. Refer all schema changes to the backend engineer for a manual SQL file in `../pupsrb-imhealth-api/sql/`.
