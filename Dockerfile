# Production image for the Virgool NestJS backend.
#
# Build:   docker build -t virgool-backend .
# Run:     docker run --rm -p 3000:3000 --env-file .env virgool-backend
#
# Runtime configuration comes exclusively from environment variables
# (see .env.example) — no .env file or secret is ever copied into the image.
# The database schema is created by the application's existing TypeORM
# `synchronize` behavior; migrations are a planned follow-up, not part of
# this image.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Runtime home for uploaded images served from `public/` (multer creates
# subdirectories on demand; the root must exist and be writable).
RUN mkdir -p /app/public/uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
