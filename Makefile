.PHONY: help env-smoke deps dev app-build standalone-assets image-build start lint format e2e e2e-prod e2e-install image-push push clean registry-prune registry-prune-apply secrets service-deploy deploy sourcemaps extract-sourcemaps check version-check changelog release_type hotfix release

PROJECT_ID ?= japan-visa-predictions
SERVICE_NAME ?= jp-visa-front
REGION ?= us-central1
IMAGE_TAG ?= latest
IMAGE_REPOSITORY ?= gcr.io/$(PROJECT_ID)/$(SERVICE_NAME)
IMAGE ?= $(IMAGE_REPOSITORY):$(IMAGE_TAG)
MAX_INSTANCES ?= 2
MEMORY ?= 512Mi
CONCURRENCY ?= 20

help:
	@printf "Frontend commands:\n"
	@printf "  env-smoke  Verify frontend toolchain availability.\n"
	@printf "  deps       Install JavaScript dependencies from yarn.lock.\n"
	@printf "  dev        Start the Next.js dev server.\n"
	@printf "  app-build  Build the Next.js application.\n"
	@printf "  image-build Build the frontend Docker image locally.\n"
	@printf "  image-push Push the frontend Docker image.\n"
	@printf "  registry-prune Preview registry image cleanup.\n"
	@printf "  registry-prune-apply Delete old registry images after previewing cleanup.\n"
	@printf "  start      Start the built Next.js app.\n"
	@printf "  lint       Run frontend lint checks.\n"
	@printf "  e2e        Run Playwright browser tests with mocked API responses.\n"
	@printf "  e2e-prod   Build, then run Playwright tests against standalone output.\n"
	@printf "  format     Format frontend files.\n"
	@printf "  version-check Verify VERSION, package.json, and release tag consistency.\n"
	@printf "  secrets    Decrypt local frontend secrets.\n"
	@printf "  service-deploy Deploy the public Cloud Run frontend service.\n"
	@printf "  deploy     Build, push, and deploy the Cloud Run frontend service.\n"
	@printf "  hotfix     Bump patch version, update changelog, commit, tag, and push.\n"
	@printf "  release    Bump minor version, update changelog, commit, tag, and push.\n"
	@printf "  check      Run env-smoke, lint, and production app build.\n"

env-smoke:
	@node --version
	@yarn --version
	@gcloud --version | sed -n '1p'
	@sops --version

deps:
	yarn install --frozen-lockfile

dev:
	yarn dev

start:
	yarn start

lint:
	yarn lint

e2e:
	yarn e2e

e2e-prod: standalone-assets
	HOSTNAME=127.0.0.1 PORT=$${PLAYWRIGHT_PORT:-3100} PLAYWRIGHT_WEB_SERVER_COMMAND="yarn start" yarn e2e

e2e-install:
	yarn e2e:install

format:
	yarn format

app-build:
	yarn build

standalone-assets: app-build
	mkdir -p .next/standalone/.next
	rm -rf .next/standalone/.next/static .next/standalone/public
	cp -R .next/static .next/standalone/.next/static
	cp -R public .next/standalone/public

check: env-smoke version-check lint app-build

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
	sops -d secrets/.env.enc > .env

extract-sourcemaps:
	# Create a temporary container from the built image
	docker create --name sourcemap-container $(IMAGE)
	# Copy the sourcemaps from the container to the local directory
	docker cp sourcemap-container:/app/.next/static/chunks ./local-sourcemaps
	# Remove the temporary container
	docker rm sourcemap-container

sourcemaps: extract-sourcemaps
	./upload-sourcemaps.sh
	# Clean up only after successfully sending sourcemaps
	rm -rf ./local-sourcemaps

image-build: secrets
	DOCKER_BUILDKIT=1 docker build --secret id=frontend_env,src=.env -t $(IMAGE) .

build: image-build

image-push: image-build sourcemaps
	docker push $(IMAGE)

push: image-push

registry-prune:
	node scripts/prune-registry-images.mjs --image-repository=$(IMAGE_REPOSITORY)

registry-prune-apply:
	DRY_RUN=false node scripts/prune-registry-images.mjs --image-repository=$(IMAGE_REPOSITORY)

service-deploy:
	@set -a; [ ! -f .env ] || . ./.env; set +a; \
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
