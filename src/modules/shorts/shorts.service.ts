import { redisClient } from "../../infra/redis/client";
import { generateId } from "../../shared/id-generator";
import { shortsRepository } from "./shorts.repository";

async function createShort(originalUrl: string): Promise<string> {
  const sequence = await redisClient.incr("last_id");
  const id = generateId(sequence);

  await shortsRepository.insertShort(id, originalUrl);

  return id;
}

async function getUrl(id: string): Promise<string | null> {
  const cachedUrl = await redisClient.get(id);

  if (cachedUrl) {
    return cachedUrl;
  }

  const redirectUrl = await shortsRepository.getOriginalUrl(id);

  if (redirectUrl) {
    await redisClient.set(id, redirectUrl);
  }

  return redirectUrl;
}

export const shortsService = {
  createShort,
  getUrl,
};
