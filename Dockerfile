# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instala o pnpm
RUN npm install -g pnpm

# Copia os arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instala dependências com pnpm (resolve conflitos automaticamente)
RUN pnpm install --frozen-lockfile

# Copia o restante do projeto
COPY . .

# Faz o build do Vite
RUN pnpm run build

# Stage 2: Serve com Nginx
FROM nginx:stable-alpine

RUN rm -rf /etc/nginx/conf.d/*

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
