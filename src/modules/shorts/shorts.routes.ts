import { withErrorHandling } from "../../shared/http/with-error-handling";
import { shortsController } from "./shorts.controller";

export const shortsRoutes = {
  "/shorten": {
    POST: withErrorHandling(shortsController.shorten),
  },
  "/short/:id": {
    GET: withErrorHandling(shortsController.getShortenedUrl),
  },
};
