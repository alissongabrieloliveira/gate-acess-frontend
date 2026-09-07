# Build de produção — não é usado no dia a dia de desenvolvimento (isso
# continua sendo `npm run dev`, com hot-reload). Serve pro CI validar o
# build final e pra um eventual deploy.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
