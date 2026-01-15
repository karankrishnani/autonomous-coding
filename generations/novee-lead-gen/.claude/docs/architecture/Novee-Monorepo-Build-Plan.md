# 🧭 Novee Lead Gen – Monorepo Specification

This monorepo powers **Novee**, a conversation-based lead generation platform with real-time scraping and predictive AI scoring.

---

## 📁 Monorepo Structure

```
novee-lead-gen/
├── apps/
│   ├── web/               # Next.js 15 web dashboard (Vercel)
│   └── desktop/           # Electron app for social login + scraping
│       ├── main.ts
│       ├── preload.ts
│       └── renderer/
│           └── index.html (or React)
├── packages/
│   └── shared/            # Supabase client, types, utils (used by both)
│       ├── supabase.ts
│       ├── types.ts
│       └── index.ts
├── pnpm-workspace.yaml
├── turbo.json (optional)
├── package.json
```

---

## ⚙️ Package Manager

- **pnpm workspaces** used to manage apps and packages
- Run all installs from the root:
  ```bash
  pnpm install
  ```

---

## 🌐 Web App (Next.js 15 on Vercel)

**Directory**: `apps/web`

- Hosted on [Vercel](https://vercel.com)
- Pulls in shared types and Supabase client from `@novee/shared`
- Configure Vercel:
  - Root directory: `apps/web`
  - Install command: `pnpm install`
  - Build command: `pnpm build` or `turbo run build --filter=web`
  - Output: `.next`

### Sample `tsconfig.json` Paths
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@novee/shared": ["../../packages/shared"]
    }
  }
}
```

---

## 💻 Desktop App (Electron)

**Directory**: `apps/desktop`

- Built with Electron + esbuild or Vite
- Uses `@novee/shared` for Supabase and utility logic
- Main process: `main.ts`
- Optional `preload.ts` with `contextBridge`
- Renderer: simple HTML or Vite + React

### Build Strategy

Use `vite` or `esbuild` for bundling:

```bash
pnpm build-desktop
```

Vite config example:
```ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: [], // allow workspace packages to bundle in
    }
  }
});
```

---

## 📦 Shared Package – `@novee/shared`

**Directory**: `packages/shared`

- Contains Supabase client, types, job keyword extractors, etc.
- Consumed by both web and desktop via:
  ```ts
  import { supabase } from '@novee/shared';
  ```

### Optional Build Output
If needed, add build step with `tsup` or `vite` to emit `dist/` with:
- `main`, `module`, `types` in `package.json`

---

## ✅ Tooling

- `pnpm` for package/dependency management
- `Turborepo` for optional build pipelines
- `Vercel` for web deploy
- `electron-builder` or `electron-forge` for packaging desktop app

---

## 🚀 Scripts (in root `package.json`)
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "build-web": "turbo run build --filter=web",
    "build-desktop": "turbo run build --filter=desktop"
  }
}
```

---

## 🧪 Future Enhancements
- Add testing with Vitest or Playwright
- Add linting/formatting via shared config
- Add `.env` management per environment