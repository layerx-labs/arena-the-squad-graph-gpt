import { describe, expect, it } from 'vitest';
import { buildGraph, clubSeasonKey, shortestPath, teammates } from '../lib/graph';
import type { PlayersDataset } from '../lib/types';

const fixture: PlayersDataset = { meta: { player_count: 4, club_count: 3, edge_rule: '', tournament: 'test' }, clubs: [
  {id:'A', name:'Same Name'}, {id:'B', name:'Same Name'}, {id:'C', name:'Other'}
], players: [
  {id:'p1', name:'One', country:'X', position:'MF', current_club_id:'A', stints:[{club_id:'A', season:'2023-24'}, {club_id:'A', season:'2023-24'}]},
  {id:'p2', name:'Two', country:'Y', position:'FW', current_club_id:'A', stints:[{club_id:'A', season:'2023-24'}]},
  {id:'p3', name:'Three', country:'Z', position:'DF', current_club_id:'B', stints:[{club_id:'B', season:'2023-24'}]},
  {id:'p4', name:'Four', country:'Z', position:'DF', current_club_id:'C', stints:[{club_id:'A', season:'2024-25'}]},
]};

describe('graph derivation', () => {
  it('groups and connects only exact club_id + season matches', () => {
    const index = buildGraph(fixture);
    expect(teammates(index, 'A', '2023-24').map(p=>p.id)).toEqual(['p1','p2']);
    expect(index.edges).toHaveLength(1);
    expect(index.edges[0].source).toBe('p1');
    expect(index.edges[0].target).toBe('p2');
    expect(index.clubSeasonGroups[clubSeasonKey('B','2023-24')].playerIds).toEqual(['p3']);
  });
  it('does not merge clubs by identical name or connect different seasons', () => {
    const index = buildGraph(fixture);
    expect(shortestPath(index, 'p1', 'p3')).toBeNull();
    expect(shortestPath(index, 'p1', 'p4')).toBeNull();
  });
});
