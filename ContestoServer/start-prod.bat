@echo off
echo.
echo === AMBIENTE DI PRODUZIONE - ERPSRVDOC01 ===
echo.
echo ATTENZIONE: Stai operando sull'ambiente di PRODUZIONE!
echo.
echo Premi CTRL+C per annullare o qualsiasi altro tasto per continuare...
pause > nul

echo.
echo Arresto ambiente di produzione...
docker-compose -f docker-compose.prod.yml down --remove-orphans

echo.
echo Pulizia ambiente Docker...
echo - Rimozione container non utilizzati...
docker container prune -f
echo - Rimozione immagini non utilizzate...
docker image prune -a -f
echo - Pulizia cache del sistema...
docker system prune -f --volumes

echo.
echo Backup dei volumi di produzione...
if not exist "backups" mkdir backups
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set backupdate=%%c-%%a-%%b
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set backuptime=%%a%%b
)
docker run --rm -v webapp_data:/data -v %cd%/backups:/backup alpine tar -czf /backup/backup_%backupdate%_%backuptime%.tar.gz /data

echo.
echo Verifica della directory SSL...
if not exist "ssl" (
    echo Creazione directory SSL...
    mkdir ssl
    echo ATTENZIONE: Copiare i certificati SSL nella cartella 'ssl' prima di procedere.
    echo I file devono essere nominati 'certificato.pem' e 'chiave.pem'
    pause
)

echo.
echo Verifica entrypoint.sh
if exist ".\backend\entrypoint.sh" (
    echo - Verifico permessi di entrypoint.sh
    attrib -R .\backend\entrypoint.sh
) else (
    echo - Creazione file entrypoint.sh
    echo #!/bin/sh > .\backend\entrypoint.sh
    echo set -e >> .\backend\entrypoint.sh
    echo. >> .\backend\entrypoint.sh
    echo # Crea directory per il mount point >> .\backend\entrypoint.sh
    echo mkdir -p /mnt/smb_share >> .\backend\entrypoint.sh
    echo. >> .\backend\entrypoint.sh
    echo echo "Tentativo di montare condivisione SMB..." >> .\backend\entrypoint.sh
    echo mount -t cifs //192.168.42.121/crite /mnt/smb_share -o username=rosset,password=OraetLabora25-!,domain=crite.locale,vers=3.0 >> .\backend\entrypoint.sh
    echo. >> .\backend\entrypoint.sh
    echo if [ $? -ne 0 ]; then >> .\backend\entrypoint.sh
    echo   echo "Trying SMB 2.1..." >> .\backend\entrypoint.sh
    echo   mount -t cifs //192.168.42.121/crite /mnt/smb_share -o username=rosset,password=OraetLabora25-!,domain=crite.locale,vers=2.1,dir_mode=0777,file_mode=0777 >> .\backend\entrypoint.sh
    echo fi >> .\backend\entrypoint.sh
    echo. >> .\backend\entrypoint.sh
    echo if [ $? -ne 0 ]; then >> .\backend\entrypoint.sh
    echo   echo "Trying without domain..." >> .\backend\entrypoint.sh
    echo   mount -t cifs //192.168.42.121/crite /mnt/smb_share -o username=rosset,password=OraetLabora25-!,vers=3.0,dir_mode=0777,file_mode=0777 >> .\backend\entrypoint.sh
    echo fi >> .\backend\entrypoint.sh
    echo. >> .\backend\entrypoint.sh
    echo if [ -d "/mnt/smb_share/GestDoc2/WebApp" ]; then >> .\backend\entrypoint.sh
    echo   echo "Mount successful, setting environment variable" >> .\backend\entrypoint.sh
    echo   export REMOTE_STORAGE_PATH=/mnt/smb_share/GestDoc2/WebApp >> .\backend\entrypoint.sh
    echo   export STORAGE_TYPE=remote >> .\backend\entrypoint.sh
    echo   export REMOTE_STORAGE_TYPE=mounted >> .\backend\entrypoint.sh
    echo   echo "Using remote storage at: $REMOTE_STORAGE_PATH" >> .\backend\entrypoint.sh
    echo else >> .\backend\entrypoint.sh
    echo   echo "SMB mount failed, using local storage" >> .\backend\entrypoint.sh
    echo   export STORAGE_TYPE=local >> .\backend\entrypoint.sh
    echo   echo "Using local storage" >> .\backend\entrypoint.sh
    echo fi >> .\backend\entrypoint.sh
    echo. >> .\backend\entrypoint.sh
    echo # Verifica certificati SSL >> .\backend\entrypoint.sh
    echo if [ -f "/usr/src/app/ssl/certificato.pem" ] && [ -f "/usr/src/app/ssl/chiave.pem" ]; then >> .\backend\entrypoint.sh
    echo   echo "Certificati SSL trovati, abilito HTTPS" >> .\backend\entrypoint.sh
    echo   export USE_HTTPS=true >> .\backend\entrypoint.sh
    echo else >> .\backend\entrypoint.sh
    echo   echo "Certificati SSL non trovati, HTTPS disabilitato" >> .\backend\entrypoint.sh
    echo   export USE_HTTPS=false >> .\backend\entrypoint.sh
    echo fi >> .\backend\entrypoint.sh
    echo. >> .\backend\entrypoint.sh
    echo # Avvia l'applicazione >> .\backend\entrypoint.sh
    echo exec node server.js >> .\backend\entrypoint.sh
)

echo.
echo Ricostruzione immagini di produzione...
docker-compose -f docker-compose.prod.yml build --no-cache

echo.
echo Avvio container di produzione...
docker-compose -f docker-compose.prod.yml up -d

echo.
echo === AMBIENTE DI PRODUZIONE AVVIATO ===
echo Frontend HTTP:  http://192.168.42.122
echo Frontend HTTPS: https://192.168.42.122
echo Frontend (alt): https://erpsrvdoc01
echo Backend HTTP:   http://192.168.42.122:3000
echo Backend HTTPS:  https://192.168.42.122:3443
echo Database: WebApp (192.168.42.117)
echo Storage:  \\192.168.42.121\crite\GestDoc2\WebApp
echo.
echo Per vedere i log: docker-compose -f docker-compose.prod.yml logs -f
echo Per arrestare: docker-compose -f docker-compose.prod.yml down
echo.

echo ATTENZIONE: L'ambiente di produzione è stato riavviato!
echo Un backup è stato creato nella cartella 'backups'
echo.

timeout /t 10