# Wayfare Gemini API (Cloudflare Worker)

This worker keeps the Gemini API key server-side. Do not put the key in the GitHub Pages frontend or commit it to this repository.

## Deploy

1. Create a Cloudflare account and install Wrangler (or use Cloudflare's dashboard to create a Worker).
2. Deploy `api/worker.js` as a Worker.
3. Set a Worker secret named `GEMINI_API_KEY` using your Google AI Studio key. With Wrangler: `npx wrangler secret put GEMINI_API_KEY`.
4. Set the Worker compatibility date to a current date.
5. Add the deployed Worker URL to the Wayfare frontend as its API base URL.
6. Keep the Worker CORS origin restricted to `https://ekanshdubey.github.io`.

Endpoints:
- `POST /api/plan` — create a new AI itinerary.
- `POST /api/revise` — revise an existing itinerary using a plain-English request.

Example plan payload:
```json
{
  "destination": "Prague",
  "startDate": "2026-12-21",
  "endDate": "2026-12-28",
  "budget": "moderate",
  "travelers": "2",
  "interests": "Christmas markets, local food, architecture",
  "pace": "balanced",
  "notes": "Prefer walking and trains"
}
```
