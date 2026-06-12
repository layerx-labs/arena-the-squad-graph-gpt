import { readFileSync, writeFileSync } from 'node:fs';
import { buildGraph } from '../src/lib/graph';
import type { PlayersDataset } from '../src/lib/types';

const data = JSON.parse(readFileSync('public/data/players.json','utf8')) as PlayersDataset;
const index = buildGraph(data);
writeFileSync('public/data/graph-index.json', JSON.stringify(index));
writeFileSync('public/data/stats.json', JSON.stringify(index.stats, null, 2));
console.log(`Built graph: ${index.stats.playerCount} players, ${index.stats.clubSeasonGroupCount} club-season groups, ${index.stats.edgeCount} edges`);
