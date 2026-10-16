import { z } from "zod";

export const shortenBodySchema = z.object({
  url: z.string().url(),
});

export type ShortenBody = z.infer<typeof shortenBodySchema>;
