# Dockerfile para Implantação Online do Agente Comercial de IA
FROM node:20-alpine

WORKDIR /app

# Copia dependências e instala
COPY package*.json ./
RUN npm install

# Copia o código-fonte
COPY . .

# Compila o TypeScript
RUN npm run build

# Expõe a porta 3000
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Executa o aplicativo
CMD ["npm", "start"]
