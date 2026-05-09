.PHONY: help env-smoke deps dev app-build image-build start lint format image-push push clean secrets service-deploy deploy sourcemaps extract-sourcemaps check

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
	@printf "  start      Start the built Next.js app.\n"
	@printf "  lint       Run frontend lint checks.\n"
	@printf "  format     Format frontend files.\n"
	@printf "  secrets    Decrypt local frontend secrets.\n"
	@printf "  service-deploy Deploy the public Cloud Run frontend service.\n"
	@printf "  deploy     Build, push, and deploy the Cloud Run frontend service.\n"
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

format:
	yarn format

app-build:
	yarn build

check: env-smoke lint app-build

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
	cp .env .env.docker
	docker build -t $(IMAGE) .

build: image-build

image-push: image-build sourcemaps
	docker push $(IMAGE)

push: image-push

service-deploy:
	gcloud run deploy $(SERVICE_NAME) \
		--project $(PROJECT_ID) \
		--region $(REGION) \
		--image $(IMAGE) \
		--platform managed \
		--allow-unauthenticated \
		--memory $(MEMORY) \
		--concurrency $(CONCURRENCY) \
		--max-instances $(MAX_INSTANCES) \
		--update-env-vars OPTIMIZE_MEMORY=true,NODE_OPTIONS="--max-old-space-size=1024"

deploy: image-push service-deploy
	gcloud run services update-traffic $(SERVICE_NAME) --to-latest --region $(REGION) \
		--project $(PROJECT_ID)

clean:
	docker system prune -f
