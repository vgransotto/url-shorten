import { parseBody } from "../../shared/http/parse-body";
import { shortenBodySchema } from "./shorts.dto";
import { shortsService } from "./shorts.service";

async function shorten(req: Request): Promise<Response> {
  const { url } = await parseBody(req, shortenBodySchema);

  const id = await shortsService.createShort(url);

  return Response.json({ id, originalUrl: url }, { status: 201 });
}

async function getShortenedUrl(req: Request): Promise<Response> {
  const urlId = req.url.split("/").pop() as string;

  const redirectUrl = await shortsService.getUrl(urlId);

  if (!redirectUrl) {
    return Response.json({ error: "URL not found" }, { status: 404 });
  }

  return Response.json(
    {
      url: redirectUrl,
    },
    { status: 302, headers: { Location: redirectUrl } },
  );
}

export const shortsController = {
  shorten,
  getShortenedUrl,
};
