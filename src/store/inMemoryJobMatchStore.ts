import type { Candidate, Job } from "../types";
import type { JobMatchStore } from "./jobMatchStore";

export class InMemoryJobMatchStore implements JobMatchStore {
  private candidates = new Map<string, Candidate>();
  private jobs = new Map<string, Job>();

  createCandidate(candidate: Candidate): Candidate {
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  getCandidate(id: string): Candidate | undefined {
    return this.candidates.get(id);
  }

  getAllCandidates(): Candidate[] {
    return Array.from(this.candidates.values());
  }

  createJob(job: Job): Job {
    this.jobs.set(job.id, job);
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }
}
