# Dockerfile del backend
FROM node:20-alpine

WORKDIR /usr/src/app

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Crea le directory per gli upload e per i certificati SSL
RUN mkdir -p /usr/src/app/uploads/projects/tasks && \
    mkdir -p /usr/src/app/temp/uploads && \
    mkdir -p /usr/src/app/ssl

# Imposta i permessi corretti per le cartelle di upload
RUN chmod -R 777 /usr/src/app/uploads && \
    chmod -R 777 /usr/src/app/temp && \
    chmod -R 755 /usr/src/app/ssl

# Copia il file .env.development
COPY .env.development .env

# Copia i certificati SSL se esistono
COPY ssl/ /usr/src/app/ssl/

# Esponi le porte HTTP e HTTPS
EXPOSE 3000
EXPOSE 3443

CMD ["node", "server.js"]