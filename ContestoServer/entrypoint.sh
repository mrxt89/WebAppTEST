#!/bin/sh
set -e

# Crea directory per il mount point
mkdir -p /mnt/smb_share

echo "Tentativo di montare condivisione SMB..."
# Prova diverse varianti di montaggio SMB
mount -t cifs //192.168.42.121/crite /mnt/smb_share -o username=rosset,password=OraetLabora25-!,domain=crite.locale,vers=3.0,dir_mode=0777,file_mode=0777

if [ $? -ne 0 ]; then
  echo "Provo con SMB 2.1..."
  mount -t cifs //192.168.42.121/crite /mnt/smb_share -o username=rosset,password=OraetLabora25-!,domain=crite.locale,vers=2.1,dir_mode=0777,file_mode=0777
fi

if [ $? -ne 0 ]; then
  echo "Provo senza dominio..."
  mount -t cifs //192.168.42.121/crite /mnt/smb_share -o username=rosset,password=OraetLabora25-!,vers=3.0,dir_mode=0777,file_mode=0777
fi

# Verifica se il montaggio è riuscito e imposta le variabili di ambiente
if [ -d "/mnt/smb_share/GestDoc2/WebApp" ]; then
  echo "Montaggio riuscito, imposto la variabile d'ambiente REMOTE_STORAGE_PATH"
  export REMOTE_STORAGE_PATH=/mnt/smb_share/GestDoc2/WebApp
  export STORAGE_TYPE=remote
  export REMOTE_STORAGE_TYPE=mounted
  echo "Usando storage remoto in: $REMOTE_STORAGE_PATH"
else
  echo "Montaggio SMB fallito, uso storage locale"
  export STORAGE_TYPE=local
  echo "Usando storage locale"
fi

# Verifica certificati SSL
if [ -f "/usr/src/app/ssl/certificato.pem" ] && [ -f "/usr/src/app/ssl/chiave.pem" ]; then
  echo "Certificati SSL trovati, abilito HTTPS"
  export USE_HTTPS=true
else
  echo "Certificati SSL non trovati, HTTPS disabilitato"
  export USE_HTTPS=false
fi

# Avvia l'applicazione
exec node server.js