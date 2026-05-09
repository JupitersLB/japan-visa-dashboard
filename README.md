# Japan Visa Dashboard

Next.js frontend for the Japan visa prediction dashboard.

The browser talks to same-origin Next API routes under `/api/*`. Those routes proxy to the FastAPI backend. Locally this defaults to `http://127.0.0.1:8000`; in Cloud Run the frontend service uses its service identity to call the private backend.

The proxy applies bounded in-memory caching and per-client rate limiting before it calls the backend. This is intentionally lightweight: it reduces accidental or casual abuse without adding another paid service.

## Commands

Run commands through Nix:

```bash
nix develop
make help
```

Common commands:

```bash
make deps
make dev
make check
```

## Local Backend

Run the backend separately, then start the frontend:

```bash
BACKEND_BASE_URL=http://127.0.0.1:8000 make dev
```

## CI/CD

Pushes and pull requests run frontend checks.

Deployments run only from version tags matching `v*`. The deploy workflow installs dependencies, runs checks, authenticates to Google Cloud, decrypts deployment secrets with SOPS, builds the Docker image using the tag name, pushes it, and deploys it to Cloud Run.

## Proxy Controls

Optional runtime settings:

- `FRONTEND_PROXY_RATE_LIMIT`: requests per client per route window. Default: `60`.
- `FRONTEND_PROXY_RATE_LIMIT_WINDOW_SECONDS`: rate limit window. Default: `60`.
- `META_LATEST_PROXY_CACHE_SECONDS`: cache TTL for `/api/meta/latest`, in seconds. Default: `604800` / one week.
- `PREDICTIONS_PROXY_CACHE_SECONDS`: cache TTL for `/api/predictions`, in seconds. Default: `604800` / one week.
- `BACKEND_PROXY_CACHE_MAX_ENTRIES`: maximum in-memory backend response cache entries per instance. Default: `500`.

The backend data updates monthly, so one-week cache defaults keep repeat queries cheap while still limiting stale responses after a fresh import.
