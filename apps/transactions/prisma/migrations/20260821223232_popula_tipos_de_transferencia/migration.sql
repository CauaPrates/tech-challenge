-- Tipos de transferencia sao dado de referencia sem o qual o esquema nao funciona: uma
-- transacao nao pode ser criada sem um type_id valido. Por isso vao em migration versionada, e
-- nao em script de seed avulso, garantindo que qualquer ambiente sobe consistente.
INSERT INTO "transaction_type" ("id", "name") VALUES
  (1, 'transferencia'),
  (2, 'pagamento'),
  (3, 'deposito')
ON CONFLICT ("id") DO NOTHING;
