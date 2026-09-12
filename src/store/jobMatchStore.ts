import type { Candidate, Job } from "../types";

export interface JobMatchStore {
  createCandidate(candidate: Candidate): Candidate;
  getCandidate(id: string): Candidate | undefined;
  getAllCandidates(): Candidate[];

  createJob(job: Job): Job;
  getJob(id: string): Job | undefined;
  getAllJobs(): Job[];
}
