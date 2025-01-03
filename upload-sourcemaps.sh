#!/usr/bin/env bash

# Load environment variables from .env, ignoring comments
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found."
    exit 1
fi

# Ensure required variables are set
if [ -z "$ROLLBAR_SERVER_TOKEN" ] || [ -z "$BASE_URL" ]; then
    echo "Error: ROLLBAR_SERVER_TOKEN or BASE_URL not set in .env."
    exit 1
fi

# Get the current Git commit hash for versioning
VERSION=$(git rev-parse HEAD)

# Check if sourcemaps directory exists
if [ ! -d "./local-sourcemaps" ]; then
    echo "Error: Sourcemaps directory ./local-sourcemaps not found."
    exit 1
fi

# Upload sourcemaps to Rollbar
echo "Uploading sourcemaps to Rollbar..."
find ./local-sourcemaps -name '*.map' | while read -r sourcemap; do
    MINIFIED_URL="${BASE_URL}/_next/static/chunks/$(basename "$sourcemap" .map)"
    echo "Uploading $sourcemap for $MINIFIED_URL..."
    curl --request POST \
        --url https://api.rollbar.com/api/1/sourcemap \
        --form access_token="$ROLLBAR_SERVER_TOKEN" \
        --form version="$VERSION" \
        --form minified_url="$MINIFIED_URL" \
        --form source_map=@"$sourcemap"
done
