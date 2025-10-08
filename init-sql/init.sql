-- Tabella: clienti
CREATE TABLE IF NOT EXISTS clienti (
  id_cliente          INTEGER PRIMARY KEY,
  nome                VARCHAR(100) NOT NULL,
  cognome             VARCHAR(100) NOT NULL,
  email               VARCHAR(100) UNIQUE,
  telefono            VARCHAR(15),
  indirizzo           VARCHAR(255),
  citta               VARCHAR(100),
  cap                 CHAR(5),
  paese               VARCHAR(50) DEFAULT 'Italia',
  data_registrazione  DATE NOT NULL
);

-- Tabella: prodotti
CREATE TABLE IF NOT EXISTS prodotti (
  id_prodotto     INTEGER PRIMARY KEY,
  nome_prodotto   VARCHAR(100) NOT NULL,
  categoria       VARCHAR(50) NOT NULL,
  prezzo          NUMERIC(12,2) NOT NULL CHECK (prezzo >= 0),
  disponibilita   INTEGER NOT NULL DEFAULT 0
);

-- Tabella: ordini
CREATE TABLE IF NOT EXISTS ordini (
  id_ordine     INTEGER PRIMARY KEY,
  id_cliente    INTEGER NOT NULL REFERENCES clienti(id_cliente),
  data_ordine   DATE NOT NULL,
  stato         VARCHAR(50) NOT NULL CHECK (stato IN ('in elaborazione','spedito','consegnato','annullato')),
  totale        NUMERIC(14,2) NOT NULL
);

-- Tabella: dettagli_ordini
CREATE TABLE IF NOT EXISTS dettagli_ordini (
  id_dettaglio      INTEGER PRIMARY KEY,
  id_ordine         INTEGER NOT NULL REFERENCES ordini(id_ordine) ON DELETE CASCADE,
  id_prodotto       INTEGER NOT NULL REFERENCES prodotti(id_prodotto),
  qta               INTEGER NOT NULL,
  prezzo_unitario   NUMERIC(12,2) NOT NULL
);

-- Indici utili
CREATE INDEX IF NOT EXISTS idx_ordini_data ON ordini (data_ordine);
CREATE INDEX IF NOT EXISTS idx_ordini_stato ON ordini (stato);
CREATE INDEX IF NOT EXISTS idx_dettagli_ordine ON dettagli_ordini (id_ordine);
CREATE INDEX IF NOT EXISTS idx_dettagli_prodotto ON dettagli_ordini (id_prodotto);
CREATE INDEX IF NOT EXISTS idx_prodotti_categoria ON prodotti (categoria);
CREATE INDEX IF NOT EXISTS idx_clienti_datareg ON clienti (data_registrazione);
