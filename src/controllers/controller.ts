import { Request, Response } from "express";
import { randomUUID } from "crypto";

import { candidateSchema, jobSchema, weightSchema } from "../validation";

import { DEFAULT_WEIGHTS, normalizeWeights } from "../config";

import { scoreJob } from "../scoring/scorer";

import type { JobMatchStore } from "../store/jobMatchStore";
import type { Weights } from "../types";

function getLimit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }

  return Math.min(Math.floor(parsed), 100);
}

function getWeights(query: Record<string, unknown>): Weights {
  const result = weightSchema.safeParse(query);

  if (!result.success) {
    return DEFAULT_WEIGHTS;
  }

  return normalizeWeights({
    skills: result.data.wSkills ?? DEFAULT_WEIGHTS.skills,
    experience: result.data.wExperience ?? DEFAULT_WEIGHTS.experience,
    location: result.data.wLocation ?? DEFAULT_WEIGHTS.location,
    salary: result.data.wSalary ?? DEFAULT_WEIGHTS.salary,
  });
}

export function createController(store: JobMatchStore) {
  function createCandidate(req: Request, res: Response) {
    const result = candidateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Invalid candidate",
        details: result.error.flatten(),
      });
    }

    const candidate = {
      id: randomUUID(),
      ...result.data,
    };

    store.createCandidate(candidate);

    return res.status(201).json(candidate);
  }

  function createJob(req: Request, res: Response) {
    const result = jobSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Invalid job",
        details: result.error.flatten(),
      });
    }

    const job = {
      id: randomUUID(),
      ...result.data,
    };

    store.createJob(job);

    return res.status(201).json(job);
  }

  function getCandidateRecommendations(req: Request, res: Response) {
    const candidateId = String(req.params.id);

    const candidate = store.getCandidate(candidateId);

    if (!candidate) {
      return res.status(404).json({
        error: "Candidate not found",
      });
    }

    const limit = getLimit(req.query.limit);
    const weights = getWeights(req.query);

    const recommendations = store
      .getAllJobs()
      .map((job) => {
        const result = scoreJob(candidate, job, weights);

        if (!result) {
          return null;
        }

        return {
          job,
          score: result.score,
          breakdown: result.breakdown,
        };
      })
      .filter((recommendation) => recommendation !== null)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.job.id.localeCompare(b.job.id);
      })
      .slice(0, limit);

    return res.json({
      candidateId: candidate.id,
      recommendations,
    });
  }

  function getJobRecommendations(req: Request, res: Response) {
    const jobId = String(req.params.id);

    const job = store.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    const limit = getLimit(req.query.limit);
    const weights = getWeights(req.query);

    const recommendations = store
      .getAllCandidates()
      .map((candidate) => {
        const result = scoreJob(candidate, job, weights);

        if (!result) {
          return null;
        }

        return {
          candidate,
          score: result.score,
          breakdown: result.breakdown,
        };
      })
      .filter((recommendation) => recommendation !== null)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.candidate.id.localeCompare(b.candidate.id);
      })
      .slice(0, limit);

    return res.json({
      jobId: job.id,
      recommendations,
    });
  }
  function getAllJobs(req: Request, res: Response) {
    const jobs = store.getAllJobs();

    return res.json(jobs);
  }

  return {
    createCandidate,
    createJob,
    getCandidateRecommendations,
    getJobRecommendations,
    getAllJobs,
  };
}

export type Controller = ReturnType<typeof createController>;
