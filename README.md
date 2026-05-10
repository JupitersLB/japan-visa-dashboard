# Japan Visa Dashboard

Next.js frontend for the Japan visa prediction dashboard.

The browser talks to same-origin Next API routes under `/api/*`. Those routes proxy to the FastAPI backend. Local development defaults to `http://127.0.0.1:8000`; production Cloud Run deployments set `BACKEND_BASE_URL` from the encrypted deployment environment and use the frontend service identity to call the private backend.

The proxy applies bounded in-memory caching and per-client rate limiting before it calls the backend. This is intentionally lightweight: it reduces accidental or casual abuse without adding another paid service.

The Cloud Run deploy target caps frontend scale with `MAX_INSTANCES` and `CONCURRENCY`. Keep a GCP budget alert on the project because the in-memory limiter is per instance and should not be treated as the hard cost-control boundary.

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

If `BACKEND_BASE_URL` is omitted outside production, the proxy uses the local backend default. In Cloud Run, or when `ENVIRONMENT=production`, the proxy fails fast when `BACKEND_BASE_URL` is missing.

## CI/CD

Pushes and pull requests run frontend checks.

Deployments run only from version tags matching `v*`. The deploy workflow installs dependencies, runs checks, authenticates to Google Cloud, decrypts deployment secrets with SOPS, builds the Docker image using the tag name, pushes it, and deploys it to Cloud Run.

Release tags are managed from `VERSION`. Use `make hotfix` for a patch release and `make release` for a minor release. Both targets bump `VERSION`, sync `package.json`, update `CHANGELOG.md`, create an annotated tag, and push the branch with tags. CI runs `make version-check`; tag deploys fail if the pushed tag does not match `VERSION`.

`make service-deploy` reads `BACKEND_BASE_URL` from the decrypted `.env` file and writes it to the frontend Cloud Run service alongside `ENVIRONMENT=production` and `BACKEND_AUTH_MODE=google`.

`make image-build` also runs `make secrets`, but passes the decrypted `.env` into Docker as a BuildKit secret for `next build`. The file is ignored by the Docker build context and is not copied into the runtime image. Production-only server values are set as Cloud Run runtime environment variables during `make service-deploy`.

## Proxy Controls

Optional runtime settings:

- `FRONTEND_PROXY_RATE_LIMIT`: requests per client per route window. Default: `60`.
- `FRONTEND_PROXY_RATE_LIMIT_WINDOW_SECONDS`: rate limit window. Default: `60`.
- `FRONTEND_PROXY_RATE_LIMIT_MAX_BUCKETS`: maximum in-memory rate limit buckets per instance before oldest buckets are pruned. Default: `10000`.
- `META_LATEST_PROXY_CACHE_SECONDS`: cache TTL for `/api/meta/latest`, in seconds. Default: `604800` / one week.
- `PREDICTIONS_PROXY_CACHE_SECONDS`: cache TTL for `/api/predictions`, in seconds. Default: `604800` / one week.
- `BACKEND_PROXY_CACHE_MAX_ENTRIES`: maximum in-memory backend response cache entries per instance. Default: `500`.

The backend data updates monthly, so one-week cache defaults keep repeat queries cheap while still limiting stale responses after a fresh import.
