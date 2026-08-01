# Twilio Multi-Tenant Frontend

React + TypeScript + Vite dashboard for the multi-tenant AI voice agent platform. Tenants manage their AI receptionist, phone numbers, calls, analytics and integrations here; super-admins manage tenants and platform-wide settings from the same app.

Talks to the [Twilio-Multi-Tenant-Voice-Agent](../Twilio-Multi-Tenant-Voice-Agent) Flask backend over REST.

## Tech stack

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- [React Router](https://reactrouter.com/) for routing
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) for forms/validation

## Project structure

```
src/
  app/            # router setup
  features/
    auth/         # login, signup, password reset, OTP verification
    tenant/       # tenant dashboard: agent config, calls, numbers, analytics, integrations
    super-admin/  # super-admin dashboard: tenants, Twilio numbers, monitoring, spam numbers
  shared/
    api/          # HTTP client
    cache/        # API response caching
    config/       # app config, env, country lists
    session/      # auth/session handling
    components/   # shared UI components (e.g. ErrorBoundary)
    utils/        # retry helpers, etc.
```

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

## Environment variables

Create a `.env` file in the project root (see `.env.example` if present):

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://127.0.0.1:5001` |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Deployment (Vercel)

The project includes a `vercel.json` preconfigured for a Vite SPA (build command, output directory, and rewrites so client-side routing works).

1. Import the repo into Vercel (or run `vercel` via the CLI).
2. Set the `VITE_API_BASE_URL` environment variable in the Vercel project settings to your deployed backend URL (e.g. the Render URL of `Twilio-Multi-Tenant-Voice-Agent`).
3. Deploy.

Make sure the backend's CORS configuration allows the Vercel domain(s) you deploy to.
