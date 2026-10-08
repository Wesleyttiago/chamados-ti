import { spawn } from "node:child_process";
import { createDatabase } from "../server/database.js";
import { createApp } from "../server/app.js";

const database = createDatabase();
const api = createApp(database);
api.listen(3001, "127.0.0.1", () => {
  console.log("API com SQLite: http://127.0.0.1:3001/api");
  const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
    env: { ...process.env, VITE_API_URL: "http://127.0.0.1:3001/api" },
  });
  function stop() {
    vite.kill("SIGTERM");
    api.close(() => {
      database.close();
      process.exit(0);
    });
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  vite.on("exit", (code) => {
    api.close(() => {
      database.close();
      process.exit(code || 0);
    });
  });
});
