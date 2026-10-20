# Project Instructions — eventfuse

## Tech Stack & Versions

- **Core:** React `^19.2.8`, TypeScript `~6.0.2`, Vite `^8.3.0` (`"type": "module"`).
- **Package Manager:** Yarn 4 (`nodeLinker: node-modules`). Always use `yarn` (never `npm` or `pnpm`).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite` `^4.3.3`), `tw-animate-css` (`^1.4.0`), `@fontsource-variable/geist` (`^5.3.0`).
- **UI Components:** `shadcn` (`^4.21.5`) built on **`@base-ui/react` (`^1.9.0`)**, `class-variance-authority` (`^0.7.1`), `lucide-react` (`^1.57.0`).
- **Node/Canvas Editor:** React Flow (`@xyflow/react` `^12.12.0`).
- **Animation:** Motion (`motion` `^14.2.0`).
- **Testing:** Vitest (`^5.0.4`).

## MCP Usage Rules

- **shadcn MCP (`shadcn`):** Use the `shadcn` MCP server to inspect, search, and install UI components instead of guessing component source code.
- **Context7 MCP (`context7`):** Whenever unsure about API changes in `@base-ui/react`, `@xyflow/react` v12, `motion` v14, or Tailwind v4, query the `context7` MCP server for up-to-date documentation before writing code.

## Strict Coding Guidelines

### 1. React 19 & TypeScript

- Path alias `@/*` maps to `./src/*`. Always use `@/` imports for internal modules.
- In `vite.config.ts` or Node ESM scripts, use `import.meta.dirname` instead of `__dirname`.
- Do NOT use `React.forwardRef`. Pass `ref` directly as a standard prop (React 19).

### 2. shadcn & Base UI (`@base-ui/react`)

- **CRITICAL:** This project uses `@base-ui/react`, NOT `@radix-ui/*`.
- Never use Radix's `asChild` prop. Use Base UI's `render` prop for element composition (e.g., `<Button render={<a href="..." />}>`).
- Never install `@radix-ui/*` packages when creating or extending UI primitives.

### 3. Tailwind CSS v4

- Do NOT create `tailwind.config.js` or `tailwind.config.ts`.
- Configure theme tokens, custom utilities, and CSS variables directly in the main CSS file using `@import "tailwindcss";` and `@theme`.
- Animations use `tw-animate-css` (not `tailwindcss-animate`).

### 4. React Flow (`@xyflow/react` v12)

- Always import from `@xyflow/react` (NEVER from the legacy `reactflow` package).
- Ensure `@xyflow/react/dist/style.css` is imported where the canvas is rendered.
- Define custom `nodeTypes` and `edgeTypes` outside the component body or memoize them with `useMemo` to prevent re-render loops.
- Use `Node<TData, TType>` and `Edge<TData, TType>` generics from `@xyflow/react` for strict typing.

### 5. Motion / Framer Motion (`motion` v14)

- Always import from `"motion/react"` (e.g., `import { motion, AnimatePresence } from "motion/react"`).
- Do NOT import from `"framer-motion"`.

## Verification Commands

After making code changes, always verify using these scripts:

- Typecheck: `yarn typecheck`
- Lint: `yarn lint`
- Test: `yarn test`
- Build check: `yarn build`
