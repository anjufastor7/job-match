import express from "express";

import { InMemoryJobMatchStore } from "./store/inMemoryJobMatchStore";
import { createController } from "./controllers/controller";
import { createRoutes } from "./routes/route";

const app = express();

app.use(express.json());

const store = new InMemoryJobMatchStore();

const controller = createController(store);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(createRoutes(controller));

export default app;
