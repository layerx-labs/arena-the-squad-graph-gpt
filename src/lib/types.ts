export type Position = 'GK' | 'DF' | 'MF' | 'FW' | string;

export type Club = { id: string; name: string; country?: string };
export type Stint = { club_id: string; season: string };
export type Player = {
  id: string;
  name: string;
  country: string;
  position: Position;
  current_club_id?: string | null;
  stints: Stint[];
};
export type PlayersDataset = {
  meta: Record<string, unknown> & { player_count: number; club_count: number; edge_rule: string; tournament: string };
  clubs: Club[];
  players: Player[];
};
export type EdgeContext = { clubId: string; clubName: string; clubCountry?: string; season: string };
export type Edge = { source: string; target: string; contexts: EdgeContext[] };
export type ClubSeasonGroup = { key: string; clubId: string; clubName: string; clubCountry?: string; season: string; playerIds: string[]; countries: string[] };
export type PlayerConnection = { playerId: string; contexts: EdgeContext[] };
export type GraphIndex = {
  playersById: Record<string, Player>;
  clubsById: Record<string, Club>;
  clubSeasonGroups: Record<string, ClubSeasonGroup>;
  groups: ClubSeasonGroup[];
  edges: Edge[];
  adjacency: Record<string, PlayerConnection[]>;
  seasonsByClub: Record<string, string[]>;
  stats: GraphStats;
};
export type GraphStats = {
  playerCount: number; clubCount: number; stintCount: number; clubSeasonGroupCount: number; connectedGroupCount: number; edgeCount: number; multiContextEdgeCount: number; connectedComponentCount: number; largestComponentSize: number; crossNationalEdgeCount: number; countries: number; seasons: string[];
  psgSanity: { hasVitinha: boolean; hasNunoMendes: boolean; hasGoncaloRamos: boolean; hasJoaoNeves: boolean; playerNames: string[] };
  topGroups: Array<{ clubId: string; clubName: string; season: string; size: number; countries: number }>;
  topClubs: Array<{ clubId: string; clubName: string; edgeContexts: number; groups: number }>;
  topPlayers: Array<{ playerId: string; playerName: string; country: string; degree: number; crossNationalDegree: number }>;
  countryPairs: Array<{ pair: string; count: number }>;
};
