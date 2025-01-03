# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build && rm -rf .next/cache

# Stage 2: Production-ready Image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /build/package.json /build/yarn.lock ./

# Install production dependencies only, and clean npm cache
RUN yarn install --frozen-lockfile --production && yarn cache clean && rm -rf /root/.npm

# Copy the built application and necessary files
COPY --from=builder /build/.next .next
COPY --from=builder /build/public public
COPY --from=builder /build/next.config.ts next.config.ts
COPY --from=builder /build/data data
COPY --from=builder /build/utils utils

ENV NODE_ENV=production

EXPOSE 3000

CMD ["yarn", "start"]
