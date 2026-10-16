function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3000),

  SECRET_KEY: required("SECRET_KEY"),

  REDIS_URL: required("REDIS_URL"),

  CASSANDRA_CONTACT_POINTS: (process.env.CASSANDRA_CONTACT_POINTS ?? "127.0.0.1").split(","),
  CASSANDRA_LOCAL_DATA_CENTER: process.env.CASSANDRA_LOCAL_DATA_CENTER ?? "datacenter1",
  CASSANDRA_KEYSPACE: process.env.CASSANDRA_KEYSPACE ?? "my_keyspace",
};
