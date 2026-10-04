import { initBotId } from "botid/client/core";

// Vercel BotID — invisible bot check attached to the public booking
// submit. The server side is checkBotId() in
// src/app/api/public/booking/route.ts; both lists must match.
initBotId({
  protect: [{ path: "/api/public/booking", method: "POST" }],
});
