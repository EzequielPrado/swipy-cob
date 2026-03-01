# Estágio de Build
FROM node:20-alpine AS build

WORKDIR /app

# Copia os arquivos de dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Variáveis de ambiente necessárias no momento do build (Vite)
# Elas devem ser passadas no Coolify como Build Arguments ou Environments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_APP_URL=$VITE_APP_URL

# Gera a build de produção
RUN npm run build

# Estágio de Produção (Servidor Web)
FROM nginx:stable-alpine

# Copia a build para o diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx para suportar React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]