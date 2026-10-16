import cassandra from "cassandra-driver";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";

const MIGRATIONS_DIR = path.join(import.meta.dir, "../../../migrations");

const client = new cassandra.Client({
  contactPoints: env.CASSANDRA_CONTACT_POINTS,
  localDataCenter: env.CASSANDRA_LOCAL_DATA_CENTER,
});

async function run() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".cql"))
    .sort();

  await client.connect();

  for (const file of files) {
    const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf-8");
    const statements = content
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await client.execute(statement);
    }

    console.log(`Applied migration: ${file}`);
  }

  await client.shutdown();
  console.log("All migrations applied.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
