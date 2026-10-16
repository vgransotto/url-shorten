import { ValidationError } from "./validation-error";

type Handler = (req: Request) => Promise<Response>;

export function withErrorHandling(handler: Handler): Handler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof ValidationError) {
        return Response.json({ error: "Validation failed", issues: err.issues }, { status: 400 });
      }

      console.error(err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
