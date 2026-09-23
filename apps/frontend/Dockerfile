# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY libs/shared/package.json ./libs/shared/
RUN npm ci --workspace=apps/frontend --include-workspace-root=false || npm install --workspace=apps/frontend
COPY tsconfig.base.json ./
COPY libs/shared ./libs/shared
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build -- --configuration production

# ---------- runner ----------
FROM nginx:1.27-alpine AS runner
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
