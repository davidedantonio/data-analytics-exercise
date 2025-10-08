#!/usr/bin/env python3
"""
Import semplice CSV -> PostgreSQL con COPY.
- Non usa variabili d'ambiente.
- Presuppone che i CSV abbiano l'ordine colonne dei file generati all'inizio:
  clienti:  id_cliente,nome,cognome,email,telefono,indirizzo, città, CAP, paese, data_registrazione
  prodotti: id_prodotto,nome_prodotto,categoria,prezzo, disponibilità
  ordini:   id_ordine,id_cliente,data_ordine,stato,totale
  dettagli: id_dettaglio,id_ordine,id_prodotto, quantità, prezzo_unitario

Mappa sullo schema target con colonne:
  clienti(citta, cap), prodotti(disponibilita), dettagli_ordini(qta)
"""

import os
import sys

import psycopg

# --- Config connessione (modifica qui se serve) ---
PG_HOST = "localhost"
PG_PORT = 5432
PG_DB = "ecommerce"
PG_USER = "postgres"
PG_PASS = "postgres"
SCHEMA = "public"  # metti "ecommerce" se le tabelle sono lì

# --- Percorso CSV (cartella che contiene i 4 file) ---
if len(sys.argv) != 2:
    print("Uso: python python_import_psycopg3.py /percorso/cartella_csv")
    sys.exit(1)

CSV_DIR = sys.argv[1]
join = os.path.join

IMPORTS = {
    "clienti.csv": (
        "clienti",
        [
            "id_cliente",
            "nome",
            "cognome",
            "email",
            "telefono",
            "indirizzo",
            "citta",
            "cap",
            "paese",
            "data_registrazione",
        ],
    ),
    "prodotti.csv": (
        "prodotti",
        ["id_prodotto", "nome_prodotto", "categoria", "prezzo", "disponibilita"],
    ),
    "ordini.csv": (
        "ordini",
        ["id_ordine", "id_cliente", "data_ordine", "stato", "totale"],
    ),
    "dettagli_ordini.csv": (
        "dettagli_ordini",
        ["id_dettaglio", "id_ordine", "id_prodotto", "qta", "prezzo_unitario"],
    ),
}


def copy_file(cur, path, table, columns):
    fq = f"{SCHEMA}.{table}" if SCHEMA else table
    cols = ", ".join(columns)
    sql = f"COPY {fq} ({cols}) FROM STDIN WITH (FORMAT csv, HEADER true)"
    # psycopg v3: usare cur.copy(...)
    with open(path, "rb") as f, cur.copy(sql) as cp:
        # stream tutto il file (va bene per CSV di qualche MB)
        cp.write(f.read())


def main():
    dsn = f"host={PG_HOST} port={PG_PORT} dbname={PG_DB} user={PG_USER} password={PG_PASS}"
    # in psycopg v3, il contesto della connessione gestisce commit/rollback automatici
    with psycopg.connect(dsn) as conn:
        try:
            with conn.cursor() as cur:
                for fname, (table, cols) in IMPORTS.items():
                    path = join(CSV_DIR, fname)
                    if not os.path.isfile(path):
                        raise FileNotFoundError(path)
                    print(f"-> Import {path} -> {SCHEMA}.{table}")
                    copy_file(cur, path, table, cols)
            # se non eccezioni, commit implicito all'uscita del `with conn:`
            print("✓ Import completato")
        except Exception as e:
            # se si verifica un'eccezione nel blocco, psycopg v3 esegue rollback automatico
            print("✗ Errore import, rollback:", e)
            raise


if __name__ == "__main__":
    import os  # per os.path.isfile nella main

    main()
