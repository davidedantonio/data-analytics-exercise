# Traccia

L’obiettivo è **importare dati CSV in PostgreSQL** (usando **Node.js** oppure **Python**) e realizzare una **dashboard Grafana** con alcune viste e pannelli indicati.

## Installazione di PostgreSQL e Grafana

All'interno del progetto trovate un file `docker-compose.yml` che vi permette di avviare facilmente sia PostgreSQL che Grafana utilizzando Docker.
Assicuratevi di avere Docker e Docker Compose installati sul vostro sistema.

Per avviare i servizi, eseguite il seguente comando nella directory del progetto:

```bash
docker-compose up -d
```

Questo comando avvierà PostgreSQL e Grafana in background. Grafana sarà accessibile all'indirizzo `http://localhost:3000` (le credenziali di default sono `admin`/`admin`).
PostgreSQL sarà accessibile sulla porta `5432` con l'utente `postgres` e la password `example`.

# Obiettivo 1: Importare dati CSV in PostgreSQL

## Passo 1: Preparare il database

Prima di importare i dati, saranno necessari alcuni passaggi preliminari:

1. **Creare un database**: Accedete a PostgreSQL e create un nuovo database per i vostri dati.

   ```sql
   CREATE DATABASE ecommerce;
   ```

2. **Creare le tabelle**: Create le tabelle necessarie per ospitare i dati CSV. Ecco un esempio di schema per una tabella `ordini`:
   ```sql
   CREATE TABLE ordini (
       id_ordine SERIAL PRIMARY KEY,
       id_cliente INTEGER NOT NULL REFERENCES clienti(id_cliente),
       data_ordine TIMESTAMP,
       totale DECIMAL(10, 2),
       stato VARCHAR(50)
   );
   ```

## Passo 2: Importare i dati CSV

Potete utilizzare Node.js o Python per importare i dati CSV in PostgreSQL. Ecco un esempio di come farlo con entrambi i linguaggi.

### Opzione 1: Usare Node.js

1. Installate le dipendenze necessarie:
   ```bash
   npm install pg csv-parser
   ```
2. Create uno script `import.js`:

   ```javascript
   const fs = require("fs");
   const { Client } = require("pg");
   const csv = require("csv-parser");

   const client = new Client({
     user: "postgres",
     host: "localhost",
     database: "ecommerce",
     password: "example",
     port: 5432,
   });

   client.connect();

   fs.createReadStream("ordini.csv")
     .pipe(csv())
     .on("data", async (row) => {
       const query =
         "INSERT INTO ordini (id_ordine, id_cliente, data_ordine, totale, stato) VALUES ($1, $2, $3, $4, $5)";
       const values = [
         row.id_ordine,
         row.id_cliente,
         row.data_ordine,
         row.totale,
         row.stato,
       ];
       await client.query(query, values);
     })
     .on("end", () => {
       console.log("CSV file successfully processed");
       client.end();
     });
   ```

3. Eseguite lo script:
   ```bash
   node import.js
   ```

### Opzione 2: Usare Python

1. Installate le dipendenze necessarie:
   ```bash
   pip install "psycopg[binary]"
   ```
2. Create uno script `python_import.py`:

   ```python
   import pandas as pd
   import psycopg2

   # Connessione a PostgreSQL
   conn = psycopg2.connect(
        dbname="ecommerce",
        user="postgres",
           password="example",
           host="localhost",
           port="5432"
   )
   cursor = conn.cursor()
   # Caricamento del file CSV
   df = pd.read_csv('ordini.csv')
   # Inserimento dei dati nella tabella
   for index, row in df.iterrows():
       cursor.execute(
           "INSERT INTO ordini (id_ordine, id_cliente, data_ordine, totale, stato) VALUES (%s, %s, %s, %s, %s)",
           (row['id_ordine'], row['id_cliente'], row['data_ordine'], row['totale'], row['stato'])
       )
   conn.commit()
   cursor.close()
   conn.close()
   ```

3. Eseguite lo script:
   ```bash
   python python import.py ./files
   ```

# Obiettivo 2: Creare una dashboard Grafana

## Passo 1: Configurare PostgreSQL come fonte dati in Grafana

1. Accedete a Grafana all'indirizzo `http://localhost:3000`.
2. Andate su **Configuration** > **Data Sources** e cliccate su **Add data source**.
3. Selezionate **PostgreSQL**.
4. Compilate i campi con le informazioni del vostro database PostgreSQL:
   - Host: `host.docker.internal:5432` (se state usando Docker su Windows o Mac)
   - Database: `ecommerce`
   - User: `postgres`
   - Password: `example`
5. Cliccate su **Save & Test** per verificare la connessione.

## Passo 2: Creare la dashboard

1. Andate su **Create** > **Dashboard**.
2. Cliccate su **Add new panel**.
3. Selezionate la fonte dati PostgreSQL.
4. Scrivete una query SQL per visualizzare i dati desiderati. Ecco alcuni esempi di query:
   - Numero totale di ordini:
     ```sql
     SELECT COUNT(*) AS totale_ordini FROM ordini;
     ```
   - Totale delle vendite per mese:
     ```sql
     SELECT DATE_TRUNC('month', data_ordine) AS mese, SUM(totale) AS totale_vendite
     FROM ordini
     GROUP BY mese
     ORDER BY mese;
     ```
   - Numero di ordini per stato:
     ```sql
     SELECT stato, COUNT(*) AS numero_ordini
     FROM ordini
     GROUP BY stato;
     ```
5. Configurate il tipo di visualizzazione (grafico a barre, grafico a linee, tabella, ecc.) in base ai dati che state visualizzando.
6. Salvate il pannello e ripetete i passaggi per aggiungere altri pannelli alla dashboard.
7. Una volta completata la dashboard, cliccate su **Save dashboard** e datele un nome.

# Conclusione

Avete ora importato con successo i dati CSV in PostgreSQL e creato una dashboard Grafana per visualizzare i dati.
Potete continuare a personalizzare la vostra dashboard aggiungendo ulteriori pannelli e visualizzazioni in base alle vostre esigenze.
