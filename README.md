# SquadGraph Explorer

A fast, self-contained World Cup 2026 player club-history graph explorer for the **AI Agent Hackathon - The Squad Graph**.

SquadGraph Explorer turns the canonical `players.json` dataset into a queryable graph of World Cup players who shared a club in the same season. It is designed to make the judged graph rule easy to inspect: **two players are connected if and only if they have a stint with the same `club_id` and the same `season`**.

## Live demo

Deployment: _filled after Vercel deploy_

Repository: https://github.com/layerx-labs/arena-the-squad-graph-gpt

## What works

- Dataset coverage cards for players, clubs, stints, club-season groups, edges, connected components, and cross-national edges.
- Required query: choose a club and season to return all listed players at that exact club-season.
- The UI displays the actual lookup key, e.g. `Q483020|2023-24`, so reviewers can verify that the join is by Wikidata club QID rather than club name.
- Focused clique visualization for the selected club-season group with national-team coloring.
- Player profile panel with complete stint history, Wikidata link, direct tournament connections, and context counts.
- Degrees-of-separation tool using BFS over the derived undirected graph.
- Insights dashboard for strongest club-season groups, most connected players, and top cross-national country overlaps.
- Validation and unit tests for graph derivation, including the PSG 2023-24 sanity case.

## Data source and coverage

The repository commits the immutable v1.0 baseline files from `layerx-labs/wc2026-squad-graph-dataset`:

- `public/data/players.json`
- `public/data/gaps.json`

No external runtime fetch is required. The app does not enrich or alter the baseline data, and it does not fabricate missing stints. `gaps.json` is included and surfaced in the UI so known coverage limitations are transparent.

Current generated sanity counts:

- 1,248 players
- 1,578 clubs
- 15,038 deduped player stints used for grouping
- 7,534 club-season groups
- 11,035 unique undirected player edges
- 35 connected components; largest component has 1,212 players

## How the graph is built

The graph builder is in `src/lib/graph.ts`. It follows the reference rule from the brief:

```ts
clubSeasonKey = club_id + '|' + season
clubSeasonGroups[clubSeasonKey] = set of player IDs
edges = every unordered pair of players in every group with size >= 2
```

Important correctness choices:

1. **Join on `club_id`, never club name.** Distinct clubs can share names and a senior team can differ from a youth/reserve QID.
2. **Use exact season strings.** `2023-24` and `2024-25` are different groups.
3. **Deduplicate within each player.** Repeated identical stints cannot create duplicate group membership.
4. **Preserve edge evidence.** If two players overlapped in multiple club-seasons, the edge stores all contexts.

The validation script checks the headline counts and the required PSG example: PSG (`Q483020`) in `2023-24` includes Vitinha, Nuno Mendes, and Gonçalo Ramos, and does not include João Neves.

## Architecture

This is a static-first Vite + React + TypeScript app deployed on Vercel.

```text
public/data/
  players.json          canonical dataset
  gaps.json             known coverage gaps
  graph-index.json      generated graph artifact
  stats.json            generated stats artifact
scripts/
  build-graph.ts        deterministic graph precompute
  validate-graph.ts     sanity checks and PSG test
src/lib/
  types.ts              dataset and graph types
  graph.ts              pure graph derivation, query, BFS helpers
src/components/
  SquadGraphApp.tsx     dashboard, query UI, viz, profiles, insights
src/tests/
  graph.test.ts         unit tests for exact join behavior
```

At build time, `npm run build:graph` reads `public/data/players.json` and writes `graph-index.json` and `stats.json`. The browser app imports those JSON artifacts directly. There is no database or backend service.

## Local setup

```bash
npm install
npm run build:graph
npm run validate
npm test
npm run dev
```

Production build:

```bash
npm run build
```

## Useful example queries

- Paris Saint-Germain FC (`Q483020`) in `2023-24` — verifies the brief sanity case.
- FC Bayern Munich in `2025-26` — one of the largest club-season groups.
- Manchester City F.C. in `2025-26` — another large, cross-national clique.

## Trade-offs and limitations

- The app intentionally visualizes selected club-season cliques rather than the full 11k-edge graph to stay readable and fast.
- The graph reflects the provided baseline exactly. Known missing or dateless memberships from `gaps.json` are not invented.
- Club, reserve, and youth-side separation is preserved when the dataset uses different Wikidata QIDs.
- The JSON graph artifact is large but acceptable for the hackathon dataset and keeps the deployment simple and reproducible.

## Rubric mapping

- **Data accuracy and coverage:** canonical v1.0 files are committed; gaps are transparent; no name-based merging or fabricated data.
- **Graph correctness:** pure TypeScript graph builder implements exact `club_id + season` grouping and stores edge evidence; validation and tests cover failure modes.
- **Query and visualization usefulness:** club-season query, result table, focused graph visualization, player profiles, BFS separation, and insights are all available in the UI.
- **Code quality:** small static architecture, typed graph model, deterministic scripts, and unit tests.
- **Write-up clarity:** this README and the TAIKAI page explain the approach, data, architecture, usage, and limitations.
