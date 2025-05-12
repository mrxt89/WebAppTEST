# Dockerfile del backend
FROM node:20-alpine

WORKDIR /usr/src/app

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Crea le directory per gli upload
RUN mkdir -p /usr/src/app/uploads/projects/tasks
RUN mkdir -p /usr/src/app/temp/uploads

# Imposta i permessi corretti per le cartelle di upload
RUN chmod -R 777 /usr/src/app/uploads && \
    chmod -R 777 /usr/src/app/temp

# Copia il file .env.development
COPY .env.development .env

EXPOSE 3000

CMD ["node", "server.js"]