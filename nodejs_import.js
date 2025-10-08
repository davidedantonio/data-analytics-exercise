#!/usr/bin/env node
/**
 * Import CSV -> PostgreSQL con for await + csv-parser
 * Tabelle: clienti, prodotti, ordini, dettagli_ordini
 * Mappature header CSV originali -> schema target:
 *   - clienti:   "città" -> citta, "CAP" -> cap
 *   - prodotti:  "disponibilità" -> disponibilita
 *   - dettagli:  "quantità" -> qta
 *   - ordini:    identico
 *
 * NOTE:
 *  - Inserisce riga-per-riga con INSERT parametrizzato (didattico).
 *  - Assumi tabelle già create e vuote (niente UPSERT).
 */

import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { Client } from "pg";

// ====== CONFIG CONNESSIONE (modifica qui) ======
const PGHOST = "localhost";
const PGPORT = 5432;
const PGDATABASE = "ecommerce";
const PGUSER = "postgres";
const PGPASSWORD = "postgres";
const PGSCHEMA = "public"; // usa 'ecommerce' se hai creato quello

// ====== HELPER ======
function parseIntSafe(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
}
function parseFloatSafe(v) {
  if (v === undefined || v === null || v === "") return null;
  // sostieni eventuale separatore decimale con virgola
  const s = String(v).replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function strOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}
function padCap5(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  return s.slice(0, 5).padStart(5, "0");
}
function table(name) {
  return PGSCHEMA ? `${PGSCHEMA}.${name}` : name;
}

// ====== 1) CLIENTI ======
async function importClienti(client, csvDir) {
  const file = path.join(csvDir, "clienti.csv");
  console.log(`-> Import clienti da ${file}`);
  const query = `
    INSERT INTO ${table("clienti")}
    (id_cliente, nome, cognome, email, telefono, indirizzo, citta, cap, paese, data_registrazione)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `;
  const stream = fs.createReadStream(file).pipe(csv());

  let count = 0;
  for await (const row of stream) {
    // Header CSV originali: id_cliente, nome, cognome, email, telefono, indirizzo, città, CAP, paese, data_registrazione
    await client.query(query, [
      parseIntSafe(row.id_cliente),
      strOrNull(row.nome),
      strOrNull(row.cognome),
      strOrNull(row.email),
      strOrNull(row.telefono),
      strOrNull(row.indirizzo),
      strOrNull(row["città"]), // mappa "città" -> citta
      padCap5(row["CAP"]), // mappa "CAP"   -> cap (CHAR(5))
      strOrNull(row.paese) ?? "Italia",
      strOrNull(row.data_registrazione), // YYYY-MM-DD
    ]);
    count++;
  }
  console.log(`   ✓ clienti inseriti: ${count}`);
}

// ====== 2) PRODOTTI ======
async function importProdotti(client, csvDir) {
  const file = path.join(csvDir, "prodotti.csv");
  console.log(`-> Import prodotti da ${file}`);
  const query = `
    INSERT INTO ${table("prodotti")}
    (id_prodotto, nome_prodotto, categoria, prezzo, disponibilita)
    VALUES ($1,$2,$3,$4,$5)
  `;
  const stream = fs.createReadStream(file).pipe(csv());

  let count = 0;
  for await (const row of stream) {
    // Header CSV originali: id_prodotto, nome_prodotto, categoria, prezzo, disponibilità
    await client.query(query, [
      parseIntSafe(row.id_prodotto),
      strOrNull(row.nome_prodotto),
      strOrNull(row.categoria),
      parseFloatSafe(row.prezzo),
      parseIntSafe(row["disponibilità"]), // mappa -> disponibilita
    ]);
    count++;
  }
  console.log(`   ✓ prodotti inseriti: ${count}`);
}

// ====== 3) ORDINI ======
async function importOrdini(client, csvDir) {
  const file = path.join(csvDir, "ordini.csv");
  console.log(`-> Import ordini da ${file}`);
  const query = `
    INSERT INTO ${table("ordini")}
    (id_ordine, id_cliente, data_ordine, stato, totale)
    VALUES ($1,$2,$3,$4,$5)
  `;
  const stream = fs.createReadStream(file).pipe(csv());

  let count = 0;
  for await (const row of stream) {
    // Header CSV originali: id_ordine, id_cliente, data_ordine, stato, totale
    await client.query(query, [
      parseIntSafe(row.id_ordine),
      parseIntSafe(row.id_cliente),
      strOrNull(row.data_ordine), // YYYY-MM-DD
      strOrNull(row.stato),
      parseFloatSafe(row.totale),
    ]);
    count++;
  }
  console.log(`   ✓ ordini inseriti: ${count}`);
}

// ====== 4) DETTAGLI ORDINI ======
async function importDettagliOrdini(client, csvDir) {
  const file = path.join(csvDir, "dettagli_ordini.csv");
  console.log(`-> Import dettagli_ordini da ${file}`);
  const query = `
    INSERT INTO ${table("dettagli_ordini")}
    (id_dettaglio, id_ordine, id_prodotto, qta, prezzo_unitario)
    VALUES ($1,$2,$3,$4,$5)
  `;
  const stream = fs.createReadStream(file).pipe(csv());

  let count = 0;
  for await (const row of stream) {
    // Header CSV originali: id_dettaglio, id_ordine, id_prodotto, quantità, prezzo_unitario
    await client.query(query, [
      parseIntSafe(row.id_dettaglio),
      parseIntSafe(row.id_ordine),
      parseIntSafe(row.id_prodotto),
      parseIntSafe(row["quantità"]), // mappa -> qta
      parseFloatSafe(row.prezzo_unitario),
    ]);
    count++;
  }
  console.log(`   ✓ dettagli_ordini inseriti: ${count}`);
}

// ====== MAIN ======
(async () => {
  if (process.argv.length !== 3) {
    console.error("Uso: node import_forawait.js /percorso/cartella_csv");
    process.exit(1);
  }
  const csvDir = process.argv[2];

  const client = new Client({
    host: PGHOST,
    port: PGPORT,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
  });

  try {
    await client.connect();
    await client.query("BEGIN");
    await importClienti(client, csvDir);
    await importProdotti(client, csvDir);
    await importOrdini(client, csvDir);
    await importDettagliOrdini(client, csvDir);
    await client.query("COMMIT");
    console.log("✓ Import completato");
  } catch (err) {
    console.error("✗ Errore import, rollback:", err.message);
    try {
      await client.query("ROLLBACK");
    } catch {}
    process.exit(1);
  } finally {
    await client.end();
  }
})();
