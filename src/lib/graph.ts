import type { Club, ClubSeasonGroup, Edge, EdgeContext, GraphIndex, GraphStats, Player, PlayerConnection, PlayersDataset } from './types';

export const clubSeasonKey = (clubId: string, season: string) => `${clubId}|${season}`;
const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;

export function buildGraph(data: PlayersDataset): GraphIndex {
  const playersById = Object.fromEntries(data.players.map(p => [p.id, p]));
  const clubsById = Object.fromEntries(data.clubs.map(c => [c.id, c]));
  const groupSets: Record<string, Set<string>> = {};
  let stintCount = 0;
  for (const player of data.players) {
    const seenForPlayer = new Set<string>();
    for (const stint of player.stints ?? []) {
      if (!stint.club_id || !stint.season) continue;
      const key = clubSeasonKey(stint.club_id, stint.season);
      if (seenForPlayer.has(key)) continue;
      seenForPlayer.add(key);
      stintCount++;
      groupSets[key] ??= new Set<string>();
      groupSets[key].add(player.id);
    }
  }

  const clubSeasonGroups: Record<string, ClubSeasonGroup> = {};
  const seasonsByClubSets: Record<string, Set<string>> = {};
  for (const [key, set] of Object.entries(groupSets)) {
    const [clubId, season] = key.split('|');
    const rawClub = clubsById[clubId];
    const club: Club = { id: clubId, name: rawClub?.name || clubId, country: rawClub?.country || undefined };
    const playerIds = [...set].sort((a,b) => playersById[a].name.localeCompare(playersById[b].name));
    const countries = [...new Set(playerIds.map(id => playersById[id].country))].sort();
    clubSeasonGroups[key] = { key, clubId, clubName: club.name, clubCountry: club.country, season, playerIds, countries };
    seasonsByClubSets[clubId] ??= new Set<string>();
    seasonsByClubSets[clubId].add(season);
  }

  const edgeMap = new Map<string, Edge>();
  for (const group of Object.values(clubSeasonGroups)) {
    if (group.playerIds.length < 2) continue;
    const context: EdgeContext = { clubId: group.clubId, clubName: group.clubName, clubCountry: group.clubCountry, season: group.season };
    for (let i=0; i<group.playerIds.length; i++) {
      for (let j=i+1; j<group.playerIds.length; j++) {
        const a = group.playerIds[i], b = group.playerIds[j];
        const key = pairKey(a,b);
        if (!edgeMap.has(key)) edgeMap.set(key, { source: a < b ? a : b, target: a < b ? b : a, contexts: [] });
        edgeMap.get(key)!.contexts.push(context);
      }
    }
  }
  const edges = [...edgeMap.values()].sort((a,b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  const adjacency: Record<string, PlayerConnection[]> = Object.fromEntries(data.players.map(p => [p.id, []]));
  for (const edge of edges) {
    adjacency[edge.source].push({ playerId: edge.target, contexts: edge.contexts });
    adjacency[edge.target].push({ playerId: edge.source, contexts: edge.contexts });
  }
  for (const list of Object.values(adjacency)) list.sort((a,b) => playersById[a.playerId].name.localeCompare(playersById[b.playerId].name));
  const seasonsByClub = Object.fromEntries(Object.entries(seasonsByClubSets).map(([id,set]) => [id, [...set].sort()]));
  const groups = Object.values(clubSeasonGroups).sort((a,b) => b.playerIds.length - a.playerIds.length || a.clubName.localeCompare(b.clubName));
  const stats = computeStats(data, groups, edges, adjacency, clubsById, playersById, stintCount);
  return { playersById, clubsById, clubSeasonGroups, groups, edges, adjacency, seasonsByClub, stats };
}

function computeStats(data: PlayersDataset, groups: ClubSeasonGroup[], edges: Edge[], adjacency: Record<string, PlayerConnection[]>, clubsById: Record<string, Club>, playersById: Record<string, Player>, stintCount: number): GraphStats {
  const countries = new Set(data.players.map(p => p.country));
  const seasons = [...new Set(data.players.flatMap(p => p.stints.map(s => s.season)))].sort();
  const crossNationalEdgeCount = edges.filter(e => playersById[e.source].country !== playersById[e.target].country).length;
  const clubAgg = new Map<string, { edgeContexts: number; groups: Set<string> }>();
  for (const e of edges) for (const c of e.contexts) {
    const agg = clubAgg.get(c.clubId) ?? { edgeContexts: 0, groups: new Set<string>() };
    agg.edgeContexts++; agg.groups.add(clubSeasonKey(c.clubId, c.season)); clubAgg.set(c.clubId, agg);
  }
  const countryPairCounts = new Map<string, number>();
  for (const e of edges) {
    const ca = playersById[e.source].country, cb = playersById[e.target].country;
    if (ca === cb) continue;
    const key = [ca,cb].sort().join(' ↔ ');
    countryPairCounts.set(key, (countryPairCounts.get(key) ?? 0) + 1);
  }
  const visited = new Set<string>(); let componentCount = 0; let largest = 0;
  for (const p of data.players) if (!visited.has(p.id)) {
    componentCount++; let size = 0; const q=[p.id]; visited.add(p.id);
    while(q.length){ const id=q.shift()!; size++; for(const n of adjacency[id] ?? []) if(!visited.has(n.playerId)){visited.add(n.playerId); q.push(n.playerId);} }
    largest = Math.max(largest, size);
  }
  const psg = groups.find(g => g.clubId === 'Q483020' && g.season === '2023-24');
  const psgNames = (psg?.playerIds ?? []).map(id => playersById[id].name).sort();
  return {
    playerCount: data.players.length, clubCount: data.clubs.length, stintCount, clubSeasonGroupCount: groups.length, connectedGroupCount: groups.filter(g=>g.playerIds.length>=2).length, edgeCount: edges.length, multiContextEdgeCount: edges.filter(e=>e.contexts.length>1).length, connectedComponentCount: componentCount, largestComponentSize: largest, crossNationalEdgeCount, countries: countries.size, seasons,
    psgSanity: { hasVitinha: psgNames.includes('Vitinha'), hasNunoMendes: psgNames.includes('Nuno Mendes'), hasGoncaloRamos: psgNames.includes('Gonçalo Ramos'), hasJoaoNeves: psgNames.includes('João Neves'), playerNames: psgNames },
    topGroups: groups.filter(g=>g.playerIds.length>=2).slice(0,12).map(g=>({clubId:g.clubId, clubName:g.clubName, season:g.season, size:g.playerIds.length, countries:g.countries.length})),
    topClubs: [...clubAgg.entries()].map(([clubId,a])=>({clubId, clubName: clubsById[clubId]?.name || clubId, edgeContexts:a.edgeContexts, groups:a.groups.size})).sort((a,b)=>b.edgeContexts-a.edgeContexts).slice(0,12),
    topPlayers: data.players.map(p=>({playerId:p.id, playerName:p.name, country:p.country, degree: adjacency[p.id]?.length ?? 0, crossNationalDegree:(adjacency[p.id]??[]).filter(n=>playersById[n.playerId].country!==p.country).length})).sort((a,b)=>b.degree-a.degree).slice(0,12),
    countryPairs: [...countryPairCounts.entries()].map(([pair,count])=>({pair,count})).sort((a,b)=>b.count-a.count).slice(0,12)
  };
}

export function teammates(index: Pick<GraphIndex,'clubSeasonGroups'|'playersById'>, clubId: string, season: string): Player[] {
  return (index.clubSeasonGroups[clubSeasonKey(clubId, season)]?.playerIds ?? []).map(id => index.playersById[id]);
}

export function shortestPath(index: Pick<GraphIndex,'adjacency'>, source: string, target: string): string[] | null {
  if (source === target) return [source];
  const prev = new Map<string,string|null>([[source,null]]); const q=[source];
  while(q.length){ const id=q.shift()!; for(const n of index.adjacency[id] ?? []) if(!prev.has(n.playerId)){ prev.set(n.playerId,id); if(n.playerId===target){ const path=[target]; let cur: string | null = id; while(cur){ path.push(cur); cur=prev.get(cur) ?? null; } return path.reverse(); } q.push(n.playerId); } }
  return null;
}

export function edgeContexts(index: Pick<GraphIndex,'edges'>, a: string, b: string): EdgeContext[] {
  const key = pairKey(a,b);
  return index.edges.find(e => pairKey(e.source,e.target) === key)?.contexts ?? [];
}
