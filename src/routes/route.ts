import { Router } from "express";
import type { Controller } from "../controllers/controller";

export function createRoutes(controller: Controller) {
  const router = Router();

  router.post("/candidates", controller.createCandidate);
  router.post("/jobs", controller.createJob);

  router.get(
    "/candidates/:id/recommendations",
    controller.getCandidateRecommendations,
  );

  router.get("/jobs/:id/recommendations", controller.getJobRecommendations);

  return router;
}
