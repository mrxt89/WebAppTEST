# Immagine di base
FROM node:20-alpine

# Crea la directory dell'applicazione
WORKDIR /usr/src/app

# Crea directory SSL
RUN mkdir -p /usr/src/app/ssl

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Esponi le porte HTTP e HTTPS
EXPOSE 5173
EXPOSE 5174

# Imposta le variabili d'ambiente per Vite
ENV VITE_WATCH_POLL=1000
ENV CHOKIDAR_USEPOLLING=true
ENV VITE_USE_HTTPS=true

# Comando per avviare l'applicazione in development
CMD ["npm", "run", "dev", "--", "--host"]