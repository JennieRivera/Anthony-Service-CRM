import { initBotId } from "botid/client/core";

// Vercel BotID — invisible bot check attached to the public booking
// submit and to Diamante Conecta 360's "Join" and "Sign in with my email"
// (the endpoints that send email codes). The server side is checkBotId()
// in each of those routes; both lists must match.
initBotId({
  protect: [
    { path: "/api/public/booking", method: "POST" },
    { path: "/api/conecta/apply", method: "POST" },
    { path: "/api/partners/email-login/start", method: "POST" },
  ],
});
