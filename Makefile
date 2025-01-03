.PHONY: build push clean secrets deploy

# Variables
PROJECT_ID=japan-visa-predictions
SERVICE_NAME=jp-visa-front
REGION=us-central1 
IMAGE=gcr.io/$(PROJECT_ID)/$(SERVICE_NAME):latest

secrets:
	sops -d secrets/.env.enc > .env
	sops -d secrets/immigration_data.enc.json > data/immigration_data.json

build: secrets
	docker build -t $(IMAGE) .

push: build
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