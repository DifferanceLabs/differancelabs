import { app } from "../server/app.js";

// Use Vercel's Web Standard handler so JSON and photo bodies remain Web streams.
// The standalone Node listener is only needed by the local development server.
export default {
  fetch(request: Request) {
    return app.fetch(request);
  },
};
