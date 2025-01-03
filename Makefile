.PHONY: build push clean secrets

# Variables
PROJECT_ID=japan-visa-predictions
SERVICE_NAME=jp-visa-front

secrets:
	sops -d secrets/.env.enc > .env
	sops -d secrets/immigration_data.enc.json > data/immigration_data.json

build: secrets
	docker build -t gcr.io/$(PROJECT_ID)/$(SERVICE_NAME):latest .

push:
	docker push gcr.io/$(PROJECT_ID)/$(SERVICE_NAME):latest

clean:
	docker system prune -f