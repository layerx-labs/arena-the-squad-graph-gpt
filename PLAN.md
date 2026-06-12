# PLAN.md — Ideation Phase

## Project Idea

**Project name:** SquadGraph Explorer

**One-sentence pitch:** A fast, self-contained World Cup 2026 player club-history graph explorer that lets judges query any club + season, inspect exact teammate groups, visualize cross-national connections, and compute player-to-player degrees of separation using the provided canonical dataset.

**Why this is the best fit for the hackathon:** The rubric is evenly weighted across data accuracy, graph correctness, usefulness, code quality, and write-up clarity. SquadGraph Explorer focuses directly on the judged task rather than overextending into risky enrichment. It will use the immutable `players.json` baseline, derive the graph exactly from `(club_id, season)`, and provide practical judging-friendly tools: sanity checks, query UI, graph visualization, player profiles, and separation paths. The goal is to make correctness obvious and verifiable while still delivering a polished live app.

---

## Problem and Target User

### Problem
The dataset contains 1,248 World Cup 2026 players, their national teams, clubs, and season-by-season stints. The core challenge is not collecting the data, but transforming it into a correct and useful social graph:

- Players are connected only if they share the same `club_id` in the same `season`.
- Club names must not be used as join keys because names can collide or vary.
- A useful app should let users ask, “Who from the World Cup squads played together at this club during this season?” and also explore broader tournament-wide relationships.

### Target users
1. **Hackathon judges / peer agents** — need to quickly verify graph correctness and inspect implementation quality.
2. **Football analysts and fans** — want to discover unexpected club connections between rival national team players.
3. **Developers reviewing the repo** — need clear data flow, reproducible graph derivation, and simple maintainable code.

---

## Core Product

SquadGraph Explorer will be a Vercel-deployed web app with a static/precomputed graph built from the canonical dataset.

### Main user journey
1. User opens the app and sees dataset coverage stats: players, clubs, stints, club-season groups, graph edges, connected components.
2. User searches/selects a club and season.
3. App returns all World Cup-listed players who were at that club in that season, grouped with national team, position, and current club.
4. App displays the clique/connection visualization for that club-season group.
5. User can click any player to view profile, complete stint history, direct teammates, and cross-national connections.
6. User can optionally compare two players to find shortest path / degrees of separation through shared club-season edges.

---

## Core Features

### 1. Canonical dataset loading and integrity checks
- Commit `players.json` and `gaps.json` into the repository during build phase for self-contained deployment.
- Display dataset metadata from `players.json.meta`.
- Show basic sanity checks:
  - player count should be around 1,248,
  - club count should be around 1,578,
  - graph edge count should be around 11,000,
  - PSG 2023-24 sanity query should include Vitinha, Nuno Mendes, and Gonçalo Ramos, and not João Neves.
- Include `gaps.json` summary so known coverage limitations are transparent, not treated as bugs.

### 2. Exact graph derivation
Build indexes from the dataset using the official rule:

- `clubSeasonKey = club_id + '|' + season`
- `clubSeasonGroups[clubSeasonKey] = player IDs with a stint at that exact club_id and season`
- full undirected edge set from every pair of players in each group with size >= 2
- edge metadata stores all shared club-season contexts, because the same pair may have played together at multiple clubs/seasons

Important correctness constraints:
- Join only on `club_id`, never on club name.
- Use `season` exactly as provided in `YYYY-YY` format.
- Do not fabricate missing stints.
- Preserve reserve/B-side clubs as separate clubs because the dataset intentionally keeps them.

### 3. Required query: club + season teammate finder
A prominent query panel:

- searchable club selector by club name, country, and Wikidata QID,
- season selector filtered to seasons available for the selected club,
- result table of all listed players at that club-season,
- columns: player name, national team, position, current club, profile link,
- explicit display of the actual join key: `club_id + season`,
- empty-state explanation when no group exists.

### 4. Interactive graph visualization
A focused graph view rather than a massive unreadable hairball:

- for a selected club-season, show a clique of all players in that group,
- node color = national team,
- node label = player name,
- node detail panel on click,
- edge tooltip = shared club + season,
- if a player has many connections, show immediate ego network with controls to limit depth / max nodes.

This provides visual usefulness without risking performance on the full tournament graph.

### 5. Player profile pages / panels
For each player:

- name, national team, position, current club,
- complete stint list sorted by season,
- all direct tournament connections,
- connection contexts grouped by teammate,
- cross-national connection count,
- link to Wikidata using player QID.

### 6. Degrees of separation
A player-to-player path finder:

- choose source and target players,
- run BFS over the undirected graph,
- return shortest path if connected,
- each hop shows the club-season evidence: e.g. `Player A — Paris Saint-Germain FC 2023-24 — Player B`,
- support “same country only / cross-country only” filters if time allows.

### 7. Tournament insights dashboard
Small set of precomputed insights to improve usefulness:

- strongest club-season groups by number of World Cup players,
- clubs producing the most tournament connections,
- most connected players,
- top cross-national teammate pairs,
- national teams with most historical club overlap,
- connected component summary.

These are derived from the same graph and help judges see value quickly.

---

## Tech Stack

### Frontend: Next.js + React + TypeScript
Justification: Vercel-native, fast to deploy, strong typing for dataset schema and graph indexes, easy routing for dashboard/query/player views.

### Styling: Tailwind CSS
Justification: Enables clean responsive UI quickly with minimal custom CSS and keeps the project maintainable.

### Visualization: React Flow or Cytoscape.js
Preferred: **Cytoscape.js** if available because it is designed for graph layouts and interaction; fallback to a simple SVG/React Flow visualization if dependency friction appears.
Justification: Need interactive node/edge exploration without writing a graph rendering engine from scratch.

### Data processing: TypeScript build-time script
Justification: Precompute graph indexes and stats once from `players.json`, producing compact JSON artifacts used by the static app. This improves runtime speed and makes graph construction auditable.

### Search/select UI: lightweight client-side fuzzy search
Justification: Dataset is small enough for in-browser search. Avoids backend complexity.

### Backend/API: none required; static JSON assets plus optional Next.js route handlers only if needed
Justification: The graph is derived from a fixed dataset. A static app is simpler, robust, cheap to deploy, and less likely to fail in judging.

### Deployment: Vercel
Justification: Required live deployment target; best-supported by Next.js.

### Testing: Vitest for graph logic unit tests
Justification: The highest-risk area is graph correctness; unit tests can directly verify grouping, edge derivation, duplicate handling, and the PSG sanity case.

---

## Architecture

### Repository structure planned

```text
/
  README.md
  PLAN.md
  package.json
  next.config.*
  tsconfig.json
  public/
    data/
      players.json
      gaps.json
      graph-index.json        # generated during build phase
      stats.json              # generated during build phase
  scripts/
    build-graph.ts            # reads players.json, writes graph-index/stats
    validate-graph.ts         # sanity checks and invariants
  src/
    app/
      page.tsx                # dashboard and primary query entry
      players/[id]/page.tsx   # player profile, if route scope allows
    components/
      ClubSeasonQuery.tsx
      GraphView.tsx
      PlayerTable.tsx
      PlayerProfile.tsx
      DegreesOfSeparation.tsx
      InsightsPanel.tsx
    lib/
      dataset.ts              # typed loading helpers
      graph.ts                # pure graph derivation/query functions
      search.ts
      types.ts
    tests/
      graph.test.ts
```

### Data flow

1. Fetch or copy the canonical v1.0 `players.json` and `gaps.json` into `public/data/` during build phase.
2. `scripts/build-graph.ts` reads `players.json`.
3. It builds:
   - `playersById`,
   - `clubsById`,
   - `clubSeasonGroups`,
   - `playerConnections`,
   - `edges` with context metadata,
   - insight stats.
4. Generated JSON is saved as static assets.
5. Next.js app loads these static JSON files client-side or at build time.
6. UI components query indexes directly in the browser.

### Graph model

```ts
type ClubSeasonKey = `${clubId}|${season}`;

type ClubSeasonGroup = {
  clubId: string;
  clubName: string;
  clubCountry?: string;
  season: string;
  playerIds: string[];
};

type Edge = {
  source: string;
  target: string;
  contexts: Array<{
    clubId: string;
    clubName: string;
    season: string;
  }>;
};
```

### Query behavior

Required query implementation:

```ts
function teammates(clubId: string, season: string): Player[] {
  const key = `${clubId}|${season}`;
  const playerIds = clubSeasonGroups[key]?.playerIds ?? [];
  return playerIds.map(id => playersById[id]);
}
```

### Performance approach

- Dataset is small enough for static JSON and client-side filtering.
- Avoid rendering the full graph by default.
- Use precomputed adjacency lists for BFS and player profiles.
- Cap visualization node count for ego networks, with clear UI messaging.

---

## Mapping to Judging Rubric

### 1. Data accuracy and coverage — weight 20
How the project will score well:

- Uses the provided immutable v1.0 `players.json` as the source of truth.
- Commits the dataset to the repo for reproducibility and deployment stability.
- Does not merge clubs by name; preserves Wikidata QIDs.
- Does not fabricate missing records or alter the baseline data.
- Displays `gaps.json` coverage caveats transparently.
- Includes dataset metadata and sanity counts in the UI and README.

Planned proof points:

- README section: “Data source and coverage.”
- UI dataset stats card.
- Validation script output documenting counts and known gaps.

### 2. Graph correctness — weight 20
How the project will score well:

- Implements the exact official rule: edge iff same `club_id` and same `season`.
- Builds groups by `(club_id, season)` and creates cliques for groups with at least two players.
- Stores edge contexts so every edge can be traced back to concrete club-season evidence.
- Includes tests for:
  - grouping by club ID rather than name,
  - no edges for same club different season,
  - no edges for same season different club,
  - duplicate stints do not duplicate players,
  - PSG 2023-24 sanity case.

Planned proof points:

- `src/lib/graph.ts` kept as pure, readable functions.
- `src/tests/graph.test.ts` verifies logic.
- UI displays join key and context evidence.

### 3. Query and visualization usefulness — weight 20
How the project will score well:

- Prominent required club + season query with searchable selectors.
- Results table is judge-friendly and directly answers the core requirement.
- Interactive focused graph visualization for selected club-season groups.
- Player profile view for full club history and direct teammate evidence.
- Degrees-of-separation tool for exploration beyond the minimum.
- Insights dashboard surfaces strongest clubs, most connected players, and cross-national links.

Planned proof points:

- A judge can verify the example query in seconds.
- Every visual edge has explainable club-season metadata.
- No overwhelming full-graph default view.

### 4. Code quality — weight 20
How the project will score well:

- Small, static-first Next.js app with minimal moving parts.
- TypeScript types for dataset entities and graph artifacts.
- Pure graph functions separated from UI components.
- Build scripts are deterministic and documented.
- Unit tests focus on graph rules.
- Clean component structure and readable naming.

Planned proof points:

- `npm run build` works locally and on Vercel.
- `npm test` or `npm run validate` verifies graph invariants.
- README gives setup, scripts, and architecture overview.

### 5. Write-up clarity — weight 20
How the project will score well:

- README will explain:
  - what the app does,
  - how to run it,
  - data source and pinned version,
  - graph derivation rule,
  - architecture,
  - limitations from `gaps.json`,
  - example queries.
- TAIKAI page will mirror the README in concise form with live demo and repo links.
- Include screenshots or GIFs if time allows.

Planned proof points:

- Clear “How the graph is built” section with pseudocode.
- Clear “Try these queries” section.
- Explicit mention that joins use `club_id`, not club name.

---

## Build Phase Milestones

### Milestone 1 — Project setup and data import
- Create Next.js + TypeScript app.
- Add Tailwind.
- Fetch/copy canonical `players.json` and `gaps.json` into `public/data/`.
- Define TypeScript types for players, clubs, stints, graph artifacts.

### Milestone 2 — Graph derivation and validation
- Implement pure graph builder.
- Generate `graph-index.json` and `stats.json`.
- Add validation script.
- Add graph unit tests and PSG sanity check.

### Milestone 3 — Required query UI
- Build dashboard shell.
- Add club search selector and season selector.
- Display teammate table for selected club-season.
- Include empty state and join-key explanation.

### Milestone 4 — Visualization and profiles
- Add club-season graph visualization.
- Add player detail panel or player route.
- Show full stint history and direct connections.

### Milestone 5 — Degrees of separation and insights
- Implement BFS player comparison.
- Add strongest club groups / most connected players / cross-national insights.
- Add controls to keep views responsive.

### Milestone 6 — Polish, README, deploy
- Improve responsive layout and loading states.
- Finalize README.
- Run tests, validation, and production build.
- Deploy to Vercel.
- Prepare TAIKAI write-up with repo and live URLs.

---

## Definition of Done

The build phase is complete when all of the following are true:

1. Repository contains full source code and committed canonical dataset files.
2. `npm install`, `npm run build`, and validation/test command succeed.
3. App is deployed on Vercel and loads without external runtime data dependencies.
4. Required query works: given a club and season, returns all listed players there together.
5. Graph logic joins strictly on `club_id + season` and exposes evidence for every edge.
6. PSG 2023-24 sanity case passes in validation/tests.
7. App includes at least one useful visualization of a selected club-season graph.
8. App includes player profiles or detail panels with stint history and direct connections.
9. Degrees-of-separation tool works for connected players, or is clearly marked as stretch if time fails.
10. README explains setup, data source, graph construction, architecture, limitations, and example queries.
11. TAIKAI page is complete with live demo link, GitHub repo link, approach, data source, architecture, and usage instructions.

---

## Scope Control

### Must have
- Canonical dataset committed.
- Correct graph derivation.
- Club + season query.
- Clear table results.
- Basic visualization.
- README and deployment.

### Should have
- Player profile/detail panel.
- Graph stats and insights.
- Validation tests.
- Degrees of separation.

### Could have
- Advanced filters by league/era/country if data supports it.
- Screenshots/GIFs in README.
- Export query results as CSV/JSON.

### Will not do unless everything else is complete
- External data enrichment.
- Authentication.
- Database/backend service.
- Full global force-directed graph as default view.
- Complex league taxonomy not present in baseline data.

---

## Risk Mitigation

### Risk: visualization becomes too complex or slow
Mitigation: Only visualize selected club-season groups and capped ego networks. The required query table remains the primary feature.

### Risk: graph edge count differs from expected baseline
Mitigation: Build validation script to print counts and inspect differences. Confirm edge generation dedupes unordered player pairs while preserving multiple contexts.

### Risk: dependency setup delays build
Mitigation: Use minimal Next.js + TypeScript + Tailwind. If Cytoscape integration slows progress, fallback to a simple SVG network for selected groups.

### Risk: time pressure near deadline
Mitigation: Prioritize correctness and required query first. Visualization and degrees-of-separation are incremental enhancements, not blockers for core functionality.
