# Script SQL per Wiki.js Integration

## Ordine Esecuzione

### Ambiente DEV Locale

1. **Crea database WikiJS** (OBBLIGATORIO):
   ```
   01_create_wikijs_database.sql
   ```

2. **OPZIONALE - Solo se vuoi utente dedicato**:
   ```
   02_create_wikijs_user.sql
   ```
   Poi modifica docker-compose.yml con:
   ```yaml
   DB_USER: wikijs_user
   DB_PASS: WikiJS_P@ssw0rd!2024
   ```

3. **Aggiungi pagina Documentazione al menu WebAppTEST** (OBBLIGATORIO):
   ```
   03_add_documentazione_page.sql
   ```

4. **Assegna permessi alla pagina Documentazione** (OBBLIGATORIO):
   ```
   04_add_documentazione_permissions.sql
   ```

### Ambiente PRODUZIONE

1. **Modifica script prima di eseguire**:
   - `01_create_wikijs_database.sql`:
     - Cambia path file database se diverso
     - Imposta RECOVERY FULL invece di SIMPLE

2. **Esegui su SQL Server Produzione**:
   ```
   01_create_wikijs_database.sql
   02_create_wikijs_user.sql (raccomandato in prod)
   ```

## Verifica

```sql
-- Controlla database creato
SELECT name, database_id, create_date
FROM sys.databases
WHERE name = 'WikiJS'

-- Controlla dimensioni
EXEC sp_spaceused
```

## Backup

```sql
-- Backup database WikiJS
BACKUP DATABASE [WikiJS]
TO DISK = 'C:\Backup\WikiJS.bak'
WITH FORMAT, INIT, COMPRESSION
```

## Restore (migrazione dev → prod)

```sql
RESTORE DATABASE [WikiJS]
FROM DISK = '\\server\backup\WikiJS.bak'
WITH REPLACE
```
