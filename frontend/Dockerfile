# Immagine di base
FROM node:20-alpine

# Crea la directory dell'applicazione
WORKDIR /usr/src/app

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Esponi la porta di Vite
EXPOSE 5174

# Imposta le variabili d'ambiente per Vite
ENV VITE_WATCH_POLL=1000
ENV CHOKIDAR_USEPOLLING=true

# Comando per avviare l'applicazione in development
CMD ["npm", "run", "dev", "--", "--host"]