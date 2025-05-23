@echo off
echo.
echo === AMBIENTE DI TEST ===
echo.

rem Verifica la presenza delle cartelle SSL
if not exist ssl (
  echo Creazione directory SSL nella root...
  mkdir ssl
  echo La cartella SSL è stata creata a livello di progetto.
  echo.
)

if not exist backend\ssl (
  echo Creazione directory SSL nel backend...
  mkdir backend\ssl
  echo La cartella SSL è stata creata nel backend.
  echo.
)

if not exist frontend\ssl (
  echo Creazione directory SSL nel frontend...
  mkdir frontend\ssl
  echo La cartella SSL è stata creata nel frontend.
  echo.
)

rem Verifica la presenza dei certificati
if not exist ssl\key.pem (
  echo ATTENZIONE: Certificato SSL key.pem non trovato nella root
  echo È necessario generare o copiare i certificati SSL.
  echo.
) else (
  rem Se esistono certificati nella root ma non nelle cartelle specifiche, copia i certificati
  if not exist backend\ssl\key.pem (
    echo Copia dei certificati dalla root al backend...
    copy ssl\key.pem backend\ssl\key.pem
    copy ssl\cert.pem backend\ssl\cert.pem
    echo Certificati copiati nel backend.
    echo.
  )
  
  if not exist frontend\ssl\key.pem (
    echo Copia dei certificati dalla root al frontend...
    copy ssl\key.pem frontend\ssl\key.pem
    copy ssl\cert.pem frontend\ssl\cert.pem
    echo Certificati copiati nel frontend.
    echo.
  )
)

rem Controlla se i certificati sono presenti almeno nel backend
if not exist backend\ssl\key.pem (
  echo ATTENZIONE: Certificati SSL non trovati nel backend!
  echo È necessario generare o copiare i certificati SSL prima di continuare.
  echo Puoi eseguire generate-ssl-certs.bat per generare certificati autofirmati.
  echo.
  pause
  exit /b 1
)

echo Arresto ambiente di sviluppo...
docker-compose down --remove-orphans

echo.
echo Pulizia ambiente Docker...
echo - Rimozione container non utilizzati...
docker container prune -f
echo - Rimozione immagini non utilizzate...
docker image prune -a -f
echo - Pulizia cache del sistema...
docker system prune -f --volumes

echo.
echo Ricostruzione immagini...
docker-compose build --no-cache

echo.
echo Avvio container di test...
docker-compose up -d

echo.
echo === AMBIENTE DI TEST AVVIATO ===
echo Frontend: https://localhost:5173 (HTTPS)
echo Frontend: http://localhost:5174 (HTTP - solo per compatibilità)
echo Backend:  https://localhost:3443 (HTTPS)
echo Backend:  http://localhost:3001 (HTTP - solo per compatibilità)
echo Database: WebAppTEST
echo.
echo NOTA: Al primo accesso ai servizi HTTPS, potresti dover accettare il certificato
echo       autofirmato nel tuo browser.
echo.
echo Per vedere i log: docker-compose logs -f
echo Per arrestare: docker-compose down
echo.

timeout /t 10