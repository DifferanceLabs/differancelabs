import { app } from "../server/app.js";

// Use Vercel's Web Standard handler so JSON and photo bodies remain Web streams.
// The standalone Node listener is only needed by the local development server.
export default {
  fetch(request: Request) {
    // Vercel adds the named :path* rewrite capture to the query string.
    // Remove only that transport parameter before strict application validation.
    const url = new URL(request.url);
    url.searchParams.delete("path");
    return app.fetch(
      url.href === request.url ? request : new Request(url, request),
    );
  },
};
