import { createServer } from "./src/server";

const server = createServer();

console.log(`Server listening on port ${server.port}`);
