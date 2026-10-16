import Redis from "ioredis";
import { env } from "../../config/env";

export const redisClient = new Redis(env.REDIS_URL);

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});
