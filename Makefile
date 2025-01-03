.PHONY: build push clean secrets deploy sourcemaps extract-sourcemaps

# Variables
PROJECT_ID=japan-visa-predictions
SERVICE_NAME=jp-visa-front
REGION=us-central1
IMAGE=gcr.io/$(PROJECT_ID)/$(SERVICE_NAME):latest

secrets:
	sops -d secrets/.env.enc > .env
	sops -d secrets/immigration_data.enc.json > data/immigration_data.json

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

build: secrets
	cp .env .env.docker
	docker build -t $(IMAGE) .

push: build sourcemaps
	docker push $(IMAGE)

deploy: push
	# Deploy the Docker image to Google Cloud Run
	gcloud beta run deploy $(SERVICE_NAME) --image $(IMAGE) \
		--platform managed --project $(PROJECT_ID) --region $(REGION) \
		--set-env-vars=OPTIMIZE_MEMORY=true,NODE_OPTIONS="--max-old-space-size=1024" \
		--max-instances 2 --min-instances 0 --memory 512M --concurrency 20 --allow-unauthenticated

	# Update traffic to the latest revision
	gcloud run services update-traffic $(SERVICE_NAME) --to-latest --region $(REGION) \
		--project $(PROJECT_ID)

clean:
	docker system prune -f
