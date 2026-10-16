import cassandra from "cassandra-driver";
import { env } from "../../config/env";

export const cassandraClient = new cassandra.Client({
  contactPoints: env.CASSANDRA_CONTACT_POINTS,
  localDataCenter: env.CASSANDRA_LOCAL_DATA_CENTER,
  keyspace: env.CASSANDRA_KEYSPACE,
});
