.PHONY: help env-smoke deps dev app-build standalone-assets image-build sourcemap-image-build runtime-sourcemaps-check start lint test-unit format e2e e2e-prod e2e-har-record e2e-har-update e2e-har-record-one e2e-har-update-one e2e-install image-push push clean registry-prune registry-prune-apply secrets service-deploy deploy sourcemaps extract-sourcemaps check version-check changelog release_type hotfix release

PROJECT_ID ?= japan-visa-predictions
SERVICE_NAME ?= jp-visa-front
REGION ?= us-central1
IMAGE_TAG ?= latest
IMAGE_REPOSITORY ?= gcr.io/$(PROJECT_ID)/$(SERVICE_NAME)
IMAGE ?= $(IMAGE_REPOSITORY):$(IMAGE_TAG)
SOURCEMAP_IMAGE ?= $(IMAGE_REPOSITORY):$(IMAGE_TAG)-sourcemaps
ROLLBAR_CODE_VERSION ?= $(shell git rev-parse HEAD)
MAX_INSTANCES ?= 2
MEMORY ?= 512Mi
CONCURRENCY ?= 20
CASSETTE ?=
E2E_HAR_CASSETTES := prediction-default prediction-osaka-extension
DEV_ENV_SECRET ?= secrets/.env.development.enc
TEST_ENV_SECRET ?= secrets/.env.test.enc
PRODUCTION_ENV_SECRET ?= secrets/.env.production.enc
DEV_ENV_FILE ?= .env.development
TEST_ENV_FILE ?= .env.test
PRODUCTION_ENV_FILE ?= .env.production

help:
	@printf "Frontend commands:\n"
	@printf "  env-smoke  Verify frontend toolchain availability.\n"
	@printf "  deps       Install JavaScript dependencies from pnpm-lock.yaml.\n"
	@printf "  dev        Start the Next.js dev server.\n"
	@printf "  app-build  Build the Next.js application.\n"
	@printf "  image-build Build the frontend Docker image locally.\n"
	@printf "  image-push Push the frontend Docker image.\n"
	@printf "  runtime-sourcemaps-check Verify the runtime image does not contain public source maps.\n"
	@printf "  registry-prune Preview registry image cleanup.\n"
	@printf "  registry-prune-apply Delete old registry images after previewing cleanup.\n"
	@printf "  start      Start the built Next.js app.\n"
	@printf "  lint       Run frontend lint checks.\n"
	@printf "  test-unit  Run focused unit tests.\n"
	@printf "  e2e        Run Playwright browser tests with mocked and HAR-backed API responses.\n"
	@printf "  e2e-prod   Build, then run Playwright tests against standalone output.\n"
	@printf "  e2e-har-record Record all missing minimal Playwright API HAR cassettes.\n"
	@printf "  e2e-har-update Update all existing minimal Playwright API HAR cassettes.\n"
	@printf "  e2e-har-record-one CASSETTE=name Record one missing API HAR cassette.\n"
	@printf "  e2e-har-update-one CASSETTE=name Update one existing API HAR cassette.\n"
	@printf "  format     Format frontend files.\n"
	@printf "  version-check Verify VERSION, package.json, and release tag consistency.\n"
	@printf "  secrets    Decrypt frontend env files from secrets/.\n"
	@printf "  service-deploy Deploy the public Cloud Run frontend service.\n"
	@printf "  deploy     Build, push, and deploy the Cloud Run frontend service.\n"
	@printf "  hotfix     Bump patch version, update changelog, commit, tag, and push.\n"
	@printf "  release    Bump minor version, update changelog, commit, tag, and push.\n"
	@printf "  check      Run env-smoke, lint, and production app build.\n"

env-smoke:
	@node --version
	@pnpm --version
	@gcloud --version | sed -n '1p'
	@sops --version

deps:
	pnpm install --frozen-lockfile

dev:
	pnpm dev

start:
	pnpm start

lint:
	pnpm lint

test-unit:
	pnpm test:unit

e2e:
	pnpm e2e

e2e-prod: standalone-assets
	HOSTNAME=127.0.0.1 PORT=$${PLAYWRIGHT_PORT:-3100} PLAYWRIGHT_WEB_SERVER_COMMAND="pnpm start" pnpm e2e

e2e-har-record:
	@mkdir -p tests/e2e/hars
	@test -f "$(TEST_ENV_FILE)" || (printf "$(TEST_ENV_FILE) is missing. Run make secrets first.\n" && exit 1)
	@dotenv_path="$(TEST_ENV_FILE)"; \
	for cassette in $(E2E_HAR_CASSETTES); do \
		if [ -f "tests/e2e/hars/$$cassette.har" ]; then \
			printf "Skipping existing cassette tests/e2e/hars/$$cassette.har\n"; \
			continue; \
		fi; \
		printf "Recording tests/e2e/hars/$$cassette.har\n"; \
		DOTENV_CONFIG_PATH="$$dotenv_path" PLAYWRIGHT_HAR_MODE=record PLAYWRIGHT_HAR_NAME="$$cassette" pnpm exec playwright test --grep "@har:$$cassette" --workers=1 || exit $$?; \
	done

e2e-har-update:
	@mkdir -p tests/e2e/hars
	@test -f "$(TEST_ENV_FILE)" || (printf "$(TEST_ENV_FILE) is missing. Run make secrets first.\n" && exit 1)
	@dotenv_path="$(TEST_ENV_FILE)"; \
	for cassette in $(E2E_HAR_CASSETTES); do \
		if [ ! -f "tests/e2e/hars/$$cassette.har" ]; then \
			printf "Skipping missing cassette tests/e2e/hars/$$cassette.har\n"; \
			continue; \
		fi; \
		printf "Updating tests/e2e/hars/$$cassette.har\n"; \
		DOTENV_CONFIG_PATH="$$dotenv_path" PLAYWRIGHT_HAR_MODE=update PLAYWRIGHT_HAR_NAME="$$cassette" pnpm exec playwright test --grep "@har:$$cassette" --workers=1 || exit $$?; \
	done

e2e-har-record-one:
	@test -n "$(CASSETTE)" || (printf "CASSETTE is required. Example: make e2e-har-record-one CASSETTE=prediction-default\n" && exit 1)
	@mkdir -p tests/e2e/hars
	@test -f "$(TEST_ENV_FILE)" || (printf "$(TEST_ENV_FILE) is missing. Run make secrets first.\n" && exit 1)
	@test ! -f "tests/e2e/hars/$(CASSETTE).har" || (printf "tests/e2e/hars/$(CASSETTE).har already exists. Use e2e-har-update-one to refresh it.\n" && exit 1)
	DOTENV_CONFIG_PATH="$(TEST_ENV_FILE)" PLAYWRIGHT_HAR_MODE=record PLAYWRIGHT_HAR_NAME="$(CASSETTE)" pnpm exec playwright test --grep "@har:$(CASSETTE)" --workers=1

e2e-har-update-one:
	@test -n "$(CASSETTE)" || (printf "CASSETTE is required. Example: make e2e-har-update-one CASSETTE=prediction-default\n" && exit 1)
	@test -f "$(TEST_ENV_FILE)" || (printf "$(TEST_ENV_FILE) is missing. Run make secrets first.\n" && exit 1)
	@test -f "tests/e2e/hars/$(CASSETTE).har" || (printf "tests/e2e/hars/$(CASSETTE).har does not exist. Use e2e-har-record-one to create it.\n" && exit 1)
	DOTENV_CONFIG_PATH="$(TEST_ENV_FILE)" PLAYWRIGHT_HAR_MODE=update PLAYWRIGHT_HAR_NAME="$(CASSETTE)" pnpm exec playwright test --grep "@har:$(CASSETTE)" --workers=1

e2e-install:
	pnpm e2e:install

format:
	pnpm format

app-build:
	pnpm build

standalone-assets: app-build
	mkdir -p .next/standalone/.next
	rm -rf .next/standalone/.next/static .next/standalone/public
	cp -R .next/static .next/standalone/.next/static
	cp -R public .next/standalone/public

check: env-smoke version-check lint test-unit app-build

version-check:
	node scripts/release-version.mjs validate

changelog:
	node scripts/release-version.mjs changelog

release_type:
	@test -n "$(type)" || (printf "type is required. Use type=patch, type=minor, or type=major\n" && exit 1)
	node scripts/release-version.mjs bump $(type)
	$(MAKE) changelog
	git add CHANGELOG.md VERSION package.json
	git commit -m "Changelog updated for $$(tr -d '\"' < VERSION)" CHANGELOG.md VERSION package.json
	git tag -a "$$(tr -d '\"' < VERSION)" -m "$$(tr -d '\"' < VERSION)"
	git push --follow-tags

hotfix:
	$(MAKE) release_type type=patch

release:
	$(MAKE) release_type type=minor

secrets:
	sops -d "$(DEV_ENV_SECRET)" > "$(DEV_ENV_FILE)"
	sops -d "$(TEST_ENV_SECRET)" > "$(TEST_ENV_FILE)"
	sops -d "$(PRODUCTION_ENV_SECRET)" > "$(PRODUCTION_ENV_FILE)"

extract-sourcemaps:
	$(MAKE) sourcemap-image-build
	rm -rf ./local-sourcemaps
	mkdir -p ./local-sourcemaps
	@container_id=$$(docker create $(SOURCEMAP_IMAGE)); \
	trap 'docker rm -f "$$container_id" >/dev/null' EXIT; \
	docker cp "$$container_id":/sourcemaps/static ./local-sourcemaps/static

sourcemaps: extract-sourcemaps
	@test -f "$(PRODUCTION_ENV_FILE)" || (printf "$(PRODUCTION_ENV_FILE) is missing. Run make secrets first.\n" && exit 1)
	DOTENV_CONFIG_PATH="$(PRODUCTION_ENV_FILE)" ROLLBAR_CODE_VERSION="$(ROLLBAR_CODE_VERSION)" node scripts/upload-sourcemaps.mjs --source-root ./local-sourcemaps/static
	# Clean up only after successfully sending sourcemaps
	rm -rf ./local-sourcemaps

image-build: secrets
	DOCKER_BUILDKIT=1 docker build --secret id=frontend_env,src="$(PRODUCTION_ENV_FILE)" --build-arg ROLLBAR_CODE_VERSION="$(ROLLBAR_CODE_VERSION)" -t $(IMAGE) .

sourcemap-image-build: secrets
	DOCKER_BUILDKIT=1 docker build --target sourcemaps --secret id=frontend_env,src="$(PRODUCTION_ENV_FILE)" --build-arg ROLLBAR_CODE_VERSION="$(ROLLBAR_CODE_VERSION)" -t $(SOURCEMAP_IMAGE) .

runtime-sourcemaps-check: image-build
	docker run --rm --entrypoint sh $(IMAGE) -c 'if find /app/.next -type f -name "*.map" | grep -q .; then find /app/.next -type f -name "*.map"; exit 1; fi'

build: image-build

image-push: image-build sourcemaps
	docker push $(IMAGE)

push: image-push

registry-prune:
	node scripts/prune-registry-images.mjs --image-repository=$(IMAGE_REPOSITORY)

registry-prune-apply:
	DRY_RUN=false node scripts/prune-registry-images.mjs --image-repository=$(IMAGE_REPOSITORY)

service-deploy:
	@test -f "$(PRODUCTION_ENV_FILE)" || (printf "$(PRODUCTION_ENV_FILE) is missing. Run make secrets first.\n" && exit 1)
	@set -a; . "$(PRODUCTION_ENV_FILE)"; set +a; \
	test -n "$$BACKEND_BASE_URL" || (printf "BACKEND_BASE_URL is required\n" && exit 1); \
	env_vars="ENVIRONMENT=production,OPTIMIZE_MEMORY=true,NODE_OPTIONS=--max-old-space-size=1024,BACKEND_BASE_URL=$$BACKEND_BASE_URL,BACKEND_AUTH_MODE=google"; \
	if [ -n "$$NEXT_PUBLIC_BASE_URL" ]; then env_vars="$$env_vars,NEXT_PUBLIC_BASE_URL=$$NEXT_PUBLIC_BASE_URL"; fi; \
	if [ -n "$$NEXT_PUBLIC_GA_ID" ]; then env_vars="$$env_vars,NEXT_PUBLIC_GA_ID=$$NEXT_PUBLIC_GA_ID"; fi; \
	if [ -n "$$NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN" ]; then env_vars="$$env_vars,NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN=$$NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN"; fi; \
	if [ -n "$$ROLLBAR_SERVER_TOKEN" ]; then env_vars="$$env_vars,ROLLBAR_SERVER_TOKEN=$$ROLLBAR_SERVER_TOKEN"; fi; \
	if [ -n "$$NEW_RELIC_APP_NAME" ]; then env_vars="$$env_vars,NEW_RELIC_APP_NAME=$$NEW_RELIC_APP_NAME"; fi; \
	if [ -n "$$NEW_RELIC_LICENSE_KEY" ]; then env_vars="$$env_vars,NEW_RELIC_LICENSE_KEY=$$NEW_RELIC_LICENSE_KEY"; fi; \
	gcloud run deploy $(SERVICE_NAME) \
		--project $(PROJECT_ID) \
		--region $(REGION) \
		--image $(IMAGE) \
		--platform managed \
		--allow-unauthenticated \
		--memory $(MEMORY) \
		--concurrency $(CONCURRENCY) \
		--max-instances $(MAX_INSTANCES) \
		--update-env-vars "$$env_vars"

deploy: image-push service-deploy
	gcloud run services update-traffic $(SERVICE_NAME) --to-latest --region $(REGION) \
		--project $(PROJECT_ID)

clean:
	docker system prune -f
