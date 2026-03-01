# Estágio 1: Build (Compilação do React)
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência primeiro para otimizar cache
COPY package.json ./

# Instala dependências (usando npm como padrão do package.json)
RUN npm install

# Copia o restante do código
COPY . .

# Executa o build do Vite (gera a pasta /dist)
RUN npm run build

# Estágio 2: Produção (Servidor Web)
FROM nginx:stable-alpine

# Limpa configurações padrões do Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia apenas os arquivos compilados do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx para a pasta correta
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]