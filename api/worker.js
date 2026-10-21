const ALLOWED_ORIGIN = "https://ekanshdubey.github.io";
const MODEL = "gemini-2.5-flash";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    const url = new URL(request.url);
    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed." }, 403, cors);
    }
    if (request.method !== "POST" || !["/api/plan", "/api/revise"].includes(url.pathname)) {
      return json({ error: "Use POST /api/plan or POST /api/revise." }, 404, cors);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "Gemini API key is not configured on the backend yet." }, 503, cors);
    }
    let input;
    try { input = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400, cors); }

    const revise = url.pathname === "/api/revise";
    const prompt = revise
      ? `You are Wayfare, a practical travel-planning assistant. Revise the user's existing itinerary according to their request. Preserve useful existing details, avoid inventing confirmed opening hours or live availability, and return only valid JSON matching the schema below. User change request: ${String(input.request || "").slice(0, 2000)}\nExisting itinerary: ${JSON.stringify(input.itinerary || {}).slice(0, 14000)}`
      : `You are Wayfare, an expert travel planner. Build a realistic, well-paced itinerary using the preferences below. Do not claim live prices, reservations, or opening hours are verified. Group nearby places together, include travel-time estimates only as approximate, balance activity and rest, and respect budget/interests. User preferences: ${JSON.stringify({
          destination: String(input.destination || "").slice(0, 160),
          startDate: String(input.startDate || "").slice(0, 30),
          endDate: String(input.endDate || "").slice(0, 30),
          budget: String(input.budget || "").slice(0, 100),
          travelers: String(input.travelers || "2").slice(0, 20),
          interests: String(input.interests || "").slice(0, 500),
          pace: String(input.pace || "balanced").slice(0, 40),
          notes: String(input.notes || "").slice(0, 1000)
        })}`;
    const schema = {
      tripTitle: "string",
      destination: "string",
      summary: "string",
      estimatedBudget: "string",
      days: [{
        day: "number",
        date: "string",
        title: "string",
        activities: [{
          time: "string",
          name: "string",
          category: "string",
          description: "string",
          area: "string",
          estimatedCost: "string",
          travelTip: "string"
        }]
      }],
      practicalTips: ["string"],
      assumptions: ["string"]
    };
    const fullPrompt = prompt + "\nReturn a JSON object matching this shape: " + JSON.stringify(schema);
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + encodeURIComponent(env.GEMINI_API_KEY), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        return json({ error: payload?.error?.message || "Gemini request failed." }, response.status === 429 ? 429 : 502, cors);
      }
      const text = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("");
      if (!text) return json({ error: "Gemini returned an empty response. Try again." }, 502, cors);
      let itinerary;
      try { itinerary = JSON.parse(text); } catch { return json({ error: "Gemini returned an unreadable itinerary. Please retry." }, 502, cors); }
      return json({ itinerary, model: MODEL }, 200, cors);
    } catch {
      return json({ error: "Could not reach Gemini. Check the backend deployment and try again." }, 502, cors);
    }
  }
};

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}
