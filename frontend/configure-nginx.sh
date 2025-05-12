#!/bin/sh

# Script di configurazione per Nginx che sostituisce le variabili nel template

# Variabili di default
HOST_IP=${HOST_IP:-10.0.0.129}
HOST_DOMAIN=${HOST_DOMAIN:-localhost}
API_HTTPS_PORT=${API_HTTPS_PORT:-3443}

echo "Configuring Nginx with:"
echo "HOST_IP = $HOST_IP"
echo "HOST_DOMAIN = $HOST_DOMAIN"
echo "API_HTTPS_PORT = $API_HTTPS_PORT"

# Sostituisci variabili nel template
cat /etc/nginx/nginx.conf.template | \
  sed "s/\${HOST_IP}/$HOST_IP/g" | \
  sed "s/\${HOST_DOMAIN}/$HOST_DOMAIN/g" | \
  sed "s/\${API_HTTPS_PORT}/$API_HTTPS_PORT/g" > /etc/nginx/conf.d/default.conf

echo "Nginx configuration completed."

# Avvia Nginx
exec nginx -g "daemon off;"