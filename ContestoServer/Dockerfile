# Dockerfile del backend
FROM node:20-alpine

# Installa cifs-utils per supporto SMB e altre dipendenze utili
RUN apk add --no-cache cifs-utils samba-client curl openssl

WORKDIR /usr/src/app

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install
RUN npm install smb2 --save

# Crea le directory per gli upload, per il mount point e per i certificati SSL
RUN mkdir -p /usr/src/app/uploads/projects/tasks \
    && mkdir -p /usr/src/app/uploads/notifications \
    && mkdir -p /usr/src/app/temp/uploads \
    && mkdir -p /mnt/smb_share \
    && mkdir -p /usr/src/app/ssl

# Imposta i permessi corretti per le cartelle
RUN chmod -R 777 /usr/src/app/uploads \
    && chmod -R 777 /usr/src/app/temp \
    && chmod -R 777 /mnt/smb_share \
    && chmod -R 755 /usr/src/app/ssl

# Copia il resto dei file
COPY . .

# Copia lo script di entrypoint e rendilo eseguibile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copia il file .env.production se in ambiente di produzione
COPY .env.production .env

EXPOSE 3000
EXPOSE 3443

CMD ["/entrypoint.sh"]