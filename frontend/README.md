# Pathshala frontend

Next.js 16 (App Router) frontend for Pathshala. Setup, configuration and the full project description are in the [repository README](../README.md).

```bash
npm ci
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL, defaults to http://localhost:5000
npm run dev                        # http://localhost:3000
npm run lint && npm run typecheck && npm run build
```
