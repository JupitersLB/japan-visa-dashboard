# syntax=docker/dockerfile:1.7

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /build

ARG ROLLBAR_CODE_VERSION
ENV NEXT_PUBLIC_ROLLBAR_CODE_VERSION=$ROLLBAR_CODE_VERSION

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN --mount=type=secret,id=frontend_env,target=/build/.env \
    yarn build && rm -rf .next/cache

FROM node:20-alpine AS sourcemaps

WORKDIR /sourcemaps

COPY --from=builder /build/.next/static static

# Stage 2: Production-ready Image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /build/package.json /build/yarn.lock ./

# Install production dependencies only, and clean npm cache
RUN yarn install --frozen-lockfile --production && yarn cache clean && rm -rf /root/.npm

# Copy the built application and necessary files
COPY --from=builder /build/utils utils
COPY --from=builder /build/public public
COPY --from=builder /build/.next .next
COPY --from=builder /build/next.config.ts next.config.ts
COPY --from=builder /build/newrelic.js newrelic.js

RUN mkdir -p .next/standalone/.next \
    && rm -rf .next/standalone/.next/static .next/standalone/public \
    && cp -R .next/static .next/standalone/.next/static \
    && cp -R public .next/standalone/public \
    && find .next -type f -name '*.map' -exec rm -f {} \; \
    && ! find .next -type f -name '*.map' | grep -q .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["yarn", "start"]
