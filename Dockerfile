FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM node:22-alpine AS api
RUN corepack enable
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh","-c","DATABASE_URL=file:./dev.db pnpm db:push && DATABASE_URL=file:/app/apps/api/prisma/dev.db pnpm --filter @shopee/api start:prod"]

FROM nginx:1.27-alpine AS web
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
