import { env } from "./config/env";
import { shortsRoutes } from "./modules/shorts/shorts.routes";

export function createServer() {
  return Bun.serve({
    port: env.PORT,
    routes: {
      ...shortsRoutes,
    },
  });
}
