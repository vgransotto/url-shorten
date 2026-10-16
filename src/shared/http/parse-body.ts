import type { z } from "zod";
import { ValidationError } from "./validation-error";

export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;

  try {
    json = await req.json();
  } catch {
    throw new ValidationError([{ path: "body", message: "Invalid JSON body" }]);
  }

  const result = schema.safeParse(json);

  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join(".") || "body",
        message: issue.message,
      })),
    );
  }

  return result.data;
}
