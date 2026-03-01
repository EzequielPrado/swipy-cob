# Estágio de Build
FROM node:20-alpine AS build

WORKDIR /app

# Instala as dependências
COPY package*.json ./
RUN npm install

# Copia o código e gera o build
COPY . .
RUN npm run build

# Estágio de Produção
FROM nginx:stable-alpine

# Copia o build do estágio anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx para suportar rotas de SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]