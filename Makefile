.PHONY: build push clean

# Variables
PROJECT_ID=japan-visa-predictions
SERVICE_NAME=jp-visa-front

build:
	# Build the Docker image
	docker build -t gcr.io/$(PROJECT_ID)/$(SERVICE_NAME):latest .

push:
	# Push the Docker image to Google Container Registry
	docker push gcr.io/$(PROJECT_ID)/$(SERVICE_NAME):latest

clean:
	# Clean up unused Docker images and resources
	docker system prune -f
