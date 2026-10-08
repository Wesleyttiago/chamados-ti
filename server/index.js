import { createDatabase } from "./database.js";
import { createApp } from "./app.js";

const database = createDatabase(process.env.DB_PATH || "data/chamados.sqlite");
const server = createApp(database, {
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://127.0.0.1:5173",
});
const port = Number(process.env.PORT || 3001);
server.listen(port, "127.0.0.1", () =>
  console.log(`API com SQLite: http://127.0.0.1:${port}/api`),
);
function stop() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
