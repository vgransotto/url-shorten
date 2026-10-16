import { cassandraClient } from "../../infra/cassandra/client";

async function insertShort(id: string, originalUrl: string): Promise<void> {
  await cassandraClient.execute(
    "INSERT INTO shorts (id, original_url, created_at) VALUES (?, ?, toTimestamp(now()))",
    [id, originalUrl],
    { prepare: true },
  );
}

async function getOriginalUrl(id: string): Promise<string | null> {
  const result = await cassandraClient.execute(
    "SELECT original_url FROM shorts WHERE id = ?",
    [id],
    { prepare: true },
  );

  if (result.rowLength === 0) {
    return null;
  }

  return result.rows[0]!.original_url;
}

export const shortsRepository = {
  insertShort,
  getOriginalUrl,
};
