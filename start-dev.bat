@echo off
echo.
echo === AMBIENTE DI TEST ===
echo.

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
echo Frontend: http://10.0.0.129:5174
echo Backend:  http://10.0.0.129:3001
echo Database: WebAppTEST
echo.
echo Per vedere i log: docker-compose logs -f
echo Per arrestare: docker-compose down
echo.

timeout /t 5