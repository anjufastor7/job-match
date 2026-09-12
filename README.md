# Job Match API

A small, transparent, rule-based job recommendation engine. Candidates and jobs are created via REST; recommendations are ranked by a 0–100 score with a per-dimension breakdown explaining exactly where the points came from.

- Stack: Node 20+, TypeScript, Express 5, zod, jest. Optional Postgres via `pg`.
- No ML, no auth, no UI — by design.

## Running locally

```bash
npm install
npm run dev          # ts-node, http://localhost:8080
npm test             # jest (scorer unit tests + one HTTP integration test)
npm run build && npm start   # compiled dist/
```

Storage is in-memory by default (data is lost on restart). Set `DATABASE_URL` to use Postgres instead — tables are created on startup. See [.env.example](.env.example).

## Running with Docker

```bash
docker compose up --build
# API on http://localhost:8080, Postgres on localhost:5432 (jobmatch/jobmatch)
```

`docker-compose.yml` starts Postgres 16 with a healthcheck and the API (multi-stage build, dev deps pruned) pointed at it.

## API

| Method | Path                              | Description                             |
| ------ | --------------------------------- | --------------------------------------- |
| `POST` | `/candidates`                     | Create a candidate profile              |
| `GET`  | `/candidates/:id`                 | Fetch a candidate                       |
| `GET`  | `/candidates/:id/recommendations` | Ranked jobs for a candidate             |
| `POST` | `/jobs`                           | Create a job posting                    |
| `GET`  | `/jobs/:id`                       | Fetch a job                             |
| `GET`  | `/jobs/:id/recommendations`       | **Bonus** — ranked candidates for a job |
| `GET`  | `/health`                         | Liveness                                |

Both recommendation endpoints accept:

| Query param                                      | Default          | Notes                                                                                                                                      |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `limit`                                          | `10`             | Top-N, 1–100                                                                                                                               |
| `wSkills`, `wExperience`, `wLocation`, `wSalary` | `50, 20, 15, 15` | **Bonus** — weight overrides. Any subset; missing ones use defaults; the set is normalised to sum to 100 so scores stay on the same scale. |

### Example

```bash
curl -s -X POST localhost:8080/candidates -H 'content-type: application/json' -d '{
  "name": "Ada", "skills": ["TypeScript", "Node"],
  "yearsOfExperience": 4, "location": "Berlin", "expectedSalary": 80000
}'

curl -s -X POST localhost:8080/jobs -H 'content-type: application/json' -d '{
  "title": "Backend Engineer",
  "requiredSkills": [{"name": "typescript", "level": "must"}, {"name": "rust", "level": "nice"}],
  "minYearsExperience": 5, "location": "Paris",
  "salaryRange": {"min": 70000, "max": 90000}, "remoteAllowed": true
}'

curl -s "localhost:8080/candidates/<candidateId>/recommendations?limit=5"
```

Response:

```json
{
  "candidateId": "…",
  "weights": { "skills": 50, "experience": 20, "location": 15, "salary": 15 },
  "count": 1,
  "recommendations": [
    {
      "jobId": "…",
      "title": "Backend Engineer",
      "location": "Paris",
      "remoteAllowed": true,
      "salaryRange": { "min": 70000, "max": 90000 },
      "score": 62,
      "breakdown": {
        "skills": {
          "score": 25,
          "max": 50,
          "detail": "1/2 skills matched; missing nice-to-have: rust"
        },
        "experience": {
          "score": 16,
          "max": 20,
          "detail": "4y below 5y minimum"
        },
        "location": {
          "score": 10,
          "max": 15,
          "detail": "remote allowed (job in Paris)"
        },
        "salary": {
          "score": 11.3,
          "max": 15,
          "detail": "expected 80000 within 70000-90000"
        }
      }
    }
  ]
}
```

Errors: `400` with a flat `issues` list for validation failures or malformed JSON, `404` for unknown ids.

## Scoring formula

All logic lives in [src/scoring/scorer.ts](src/scoring/scorer.ts) as pure functions with no I/O. Each dimension produces a ratio in `[0, 1]`; the ratio is multiplied by that dimension's weight; the four results are summed and rounded to give the 0–100 score. The breakdown shows `score / max` per dimension plus a one-line reason.

Skill names are compared after `trim().toLowerCase()`.

### 0. Must-have skills — hard filter

If the job has any `must` skill the candidate lacks, the job is **not scored at all** and never appears, regardless of other dimensions. This is the only exclusion rule.

### 1. Skills — 50 points

```
ratio = matched / total     over every required skill (must + nice)
ratio = 1                   when the job lists no skills
```

Because the hard filter already guarantees every must-have is matched, must-haves set a floor and nice-to-haves lift the score toward the full 50. A job with 1 must + 1 nice where the candidate has only the must scores 25/50. Nice-to-haves therefore boost but never gate.

### 2. Experience — 20 points

```
ratio = 1                   if years >= minYearsExperience, or min is 0
ratio = years / min         otherwise (linear penalty)
```

**Why penalise instead of exclude.** `minYearsExperience` is a recruiter heuristic, not a legal requirement; a candidate with 4 of 5 required years and a perfect skill match is usually a better hire than one with 6 years and a weak skill match. Excluding would silently hide that person. Penalising keeps them in the list, lower down, and the breakdown says exactly why (`"4y below 5y minimum"`) so a human can decide. Skills are the dimension where a hard gate makes sense (you either know Kubernetes or you don't); experience is continuous, so it gets a continuous penalty.

### 3. Location — 15 points

```
ratio = 1      exact match (case-insensitive)
ratio = 2/3    job is remoteAllowed but in a different location   → 10/15
ratio = 0      different location, not remote
```

Exact match beats remote because on-site presence is still a preference for many teams and there's no relocation cost. Remote gets a solid two-thirds rather than half: for the candidate it is nearly as good as local, and the job explicitly says it's acceptable.

### 4. Salary — 15 points

With `e` = candidate's expected salary and `[min, max]` = job range:

```
max < e          → ratio = 0                              job cannot pay
min >= e         → ratio = 1                              whole range at/above expectation
min < e <= max   → ratio = 0.5 + 0.5 * (max - e) / (max - min)
```

The middle case gives half credit for merely meeting the expectation and scales the rest by headroom: if `e` equals `max` the ratio is 0.5 (they'd have to offer their ceiling), if `e` is just above `min` it approaches 1. This satisfies "max below expectation scores near zero" (it scores exactly zero — the job literally can't meet the number) and "comfortably above scores highest".

### Why 50 / 20 / 15 / 15

| Dimension  | Weight | Reasoning                                                                                                                                   |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills     | 50     | Decides whether the person can do the job at all. Everything else is secondary to that, so it's half the score on its own.                  |
| Experience | 20     | A proxy for skill depth — partly redundant with skills, hence smaller. Still meaningful for seniority fit.                                  |
| Location   | 15     | Logistics. Often negotiable (relocation, hybrid), and remote work has made it less decisive.                                                |
| Salary     | 15     | Also negotiable, and the hard "can't pay" case already scores zero. Equal to location because neither should dominate a strong skill match. |

Skills + experience = 70, i.e. "can they do it" outweighs "does the logistics fit" by more than 2:1. A perfect-skill remote job in another city with an OK salary still scores ~85+, which matches intuition about what a good recommendation looks like.

The weights live in [src/config.ts](src/config.ts) and can be overridden per request with `wSkills` etc. Overrides are normalised so any combination still yields a 0–100 score.

### Ranking

Filtered jobs are dropped; the rest are sorted by score descending, then by title, then id for stable output. `limit` is applied last. The reverse view (`/jobs/:id/recommendations`) uses the identical `scoreJob` function with the roles swapped, so a candidate/job pair gets the same score from either direction.

## Tests

`npm test` runs:

- [src/scoring/scorer.test.ts](src/scoring/scorer.test.ts) — 23 cases: must-have miss → excluded; case/whitespace-insensitive matching; nice-to-have partial credit; no-skills job; experience at/below/zero/min=0; exact vs remote vs mismatch location; salary max-below (zero), range-above (full), exact-max (half), in-range headroom; total = 100 for a perfect match; weight normalisation, defaults and zero fallback; ranking order, limit and reverse view.
- [src/app.test.ts](src/app.test.ts) — boots the app on a random port and checks create → recommend, `limit`, the hard filter over HTTP, and 400/404 paths.

## Assumptions

- Location is a free-text exact match after normalisation; "Berlin" and "Berlin, Germany" are different places. No geo distance.
- Skills are exact-string matches; "React" and "React.js" are different skills. No synonym table.
- `expectedSalary` and `salaryRange` are in the same currency and period.
- A job with `minYearsExperience: 0` or no `requiredSkills` scores full on that dimension.
- Rows are stored as JSON documents in Postgres (`id`, `data jsonb`). The API only reads whole entities, so a normalised schema would add joins without value at this size.
- No pagination beyond `limit`; no update/delete endpoints — not asked for.

## What I'd do with more time

- Skill aliases / a small taxonomy (`js` = `javascript`) and fuzzy matching.
- Location tiers: same city > same country > remote > mismatch, or a distance-based decay.
- A small tolerance band in the salary rule (e.g. max within 5% below expectation scores a little rather than zero), since candidates often flex.
- Persist per-user weight presets instead of query params only.
- Property-based tests (score always in `[0, 100]`, monotonic in each dimension).
- Request logging, OpenAPI spec, CI workflow running `tsc --noEmit` + `jest`, and a compose smoke test.

## AI usage

Built with Copilot as a pair programmer. The scoring rules, weights and the penalise-vs-exclude decision were specified by me; the AI drafted the code, tests and this README from that spec, and I reviewed each commit before it went in.

Places where AI output was overridden or edited: <!-- fill in honestly, e.g. "asked for max-below-expectation to be exactly 0 rather than a tolerance band", "changed remote ratio from 1/2 to 2/3", "rejected a normalised Postgres schema in favour of jsonb" -->
