'use client';

import { useMemo, useState } from 'react';
import type { ClubSeasonGroup, EdgeContext, GraphIndex, Player } from '@/lib/types';
import { clubSeasonKey, edgeContexts, shortestPath } from '@/lib/graph';

type Props = { index: GraphIndex; gaps: Record<string, unknown> };
const fmt = (n: number) => new Intl.NumberFormat().format(n);
const colors = ['#4dd4ac','#7aa7ff','#ffd166','#ef476f','#a78bfa','#06d6a0','#f78c6b','#8ecae6','#caffbf','#ffafcc'];
const countryColor = (country: string) => colors[[...country].reduce((a,c)=>a+c.charCodeAt(0),0) % colors.length];

export default function SquadGraphApp({ index, gaps }: Props) {
  const clubs = useMemo(() => Object.values(index.clubsById).filter(c => c?.name).sort((a,b)=>a.name.localeCompare(b.name)), [index]);
  const defaultClub = 'Q483020';
  const [clubId, setClubId] = useState(index.clubsById[defaultClub] ? defaultClub : clubs[0]?.id ?? '');
  const seasons = index.seasonsByClub[clubId] ?? [];
  const [season, setSeason] = useState('2023-24');
  const effectiveSeason = seasons.includes(season) ? season : seasons[seasons.length - 1] ?? '';
  const group = index.clubSeasonGroups[clubSeasonKey(clubId, effectiveSeason)];
  const players = (group?.playerIds ?? []).map(id => index.playersById[id]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? index.stats.topPlayers[0]?.playerId);
  const selectedPlayer = selectedPlayerId ? index.playersById[selectedPlayerId] : undefined;
  const [sourceId, setSourceId] = useState('Q11571');
  const [targetId, setTargetId] = useState('Q170566');
  const path = sourceId && targetId ? shortestPath(index, sourceId, targetId) : null;
  const playerOptions = useMemo(() => Object.values(index.playersById).sort((a,b)=>a.name.localeCompare(b.name)), [index]);

  function selectClub(next: string) {
    setClubId(next);
    const ss = index.seasonsByClub[next] ?? [];
    setSeason(ss.includes(season) ? season : ss[ss.length - 1] ?? '');
  }

  return <div className="container">
    <section className="hero">
      <div className="card">
        <div className="eyebrow">AI Agent Hackathon · The Squad Graph</div>
        <h1>SquadGraph Explorer</h1>
        <p className="lead">A self-contained World Cup 2026 player graph. Query any <strong>club_id + season</strong>, see the exact players who overlapped, inspect the clique visualization, and trace shortest teammate paths across the tournament.</p>
        <span className="pill">Join key: Wikidata club QID + YYYY-YY season</span><span className="pill">No name merging</span><span className="pill">Canonical v1.0 dataset committed</span>
      </div>
      <div className="card grid stats">
        <Stat label="Players" value={index.stats.playerCount}/><Stat label="Clubs" value={index.stats.clubCount}/><Stat label="Edges" value={index.stats.edgeCount}/><Stat label="Largest component" value={index.stats.largestComponentSize}/>
      </div>
    </section>

    <section className="grid main">
      <div className="card">
        <h2>Club + season query</h2>
        <div className="field"><label>Club (name · country · Wikidata QID)</label><select className="control" value={clubId} onChange={e=>selectClub(e.target.value)}>{clubs.map(c=><option key={c.id} value={c.id}>{c.name || c.id} · {c.country || 'unknown'} · {c.id}</option>)}</select></div>
        <div className="field"><label>Season available for selected club</label><select className="control" value={effectiveSeason} onChange={e=>setSeason(e.target.value)}>{seasons.map(s=><option key={s}>{s}</option>)}</select></div>
        <p className="muted small">Actual lookup: <code>{clubSeasonKey(clubId, effectiveSeason)}</code>. Result is the set of World Cup-listed players with a stint at exactly this club QID in exactly this season.</p>
        <div className="row"><span>{index.clubsById[clubId]?.name}</span><strong>{players.length} player{players.length===1?'':'s'}</strong></div>
        <div style={{marginTop:12}} className="tableWrap"><table><thead><tr><th>Player</th><th>Nation</th><th>Pos</th><th>Current club</th></tr></thead><tbody>{players.length ? players.map(p => <tr key={p.id} onClick={()=>setSelectedPlayerId(p.id)}><td><button className="btn secondary small">{p.name}</button></td><td>{p.country}</td><td>{p.position}</td><td>{index.clubsById[p.current_club_id || '']?.name ?? '—'}</td></tr>) : <tr><td colSpan={4}>No club-season group exists for this exact key.</td></tr>}</tbody></table></div>
      </div>

      <div className="card">
        <h2>Focused graph visualization</h2>
        <p className="muted small">The selected club-season group is a clique: everyone shown shares the same club and season. Node color is national team.</p>
        <CliqueViz group={group} players={players} onSelect={setSelectedPlayerId}/>
      </div>
    </section>

    <section className="split" style={{marginTop:18}}>
      <PlayerPanel player={selectedPlayer} index={index} onSelect={setSelectedPlayerId}/>
      <div className="card">
        <h2>Degrees of separation</h2>
        <div className="field"><label>Source player</label><select className="control" value={sourceId} onChange={e=>setSourceId(e.target.value)}>{playerOptions.map(p=><option key={p.id} value={p.id}>{p.name} · {p.country}</option>)}</select></div>
        <div className="field"><label>Target player</label><select className="control" value={targetId} onChange={e=>setTargetId(e.target.value)}>{playerOptions.map(p=><option key={p.id} value={p.id}>{p.name} · {p.country}</option>)}</select></div>
        {path ? <div className="list">{path.map((id,i) => <div key={`${id}-${i}`} className="row"><div><strong>{index.playersById[id].name}</strong><div className="small muted">{index.playersById[id].country}</div>{i < path.length-1 && <ContextLine contexts={edgeContexts(index, id, path[i+1])}/>}</div><span className="pill">hop {i}</span></div>)}</div> : <p className="warn">No path found in the derived graph.</p>}
      </div>
    </section>

    <section className="split" style={{marginTop:18}}>
      <Insights index={index}/>
      <div className="card"><h2>Coverage and sanity</h2><div className="grid stats"><Stat label="Stints" value={index.stats.stintCount}/><Stat label="Club-season groups" value={index.stats.clubSeasonGroupCount}/><Stat label="Connected groups" value={index.stats.connectedGroupCount}/><Stat label="Cross-national edges" value={index.stats.crossNationalEdgeCount}/></div><p className="muted">PSG 2023-24 sanity: Vitinha, Nuno Mendes and Gonçalo Ramos present; João Neves absent: <strong>{index.stats.psgSanity.hasVitinha && index.stats.psgSanity.hasNunoMendes && index.stats.psgSanity.hasGoncaloRamos && !index.stats.psgSanity.hasJoaoNeves ? 'pass' : 'check'}</strong>.</p><p className="muted small">gaps.json keys committed for transparency: {Object.keys(gaps).join(', ')}.</p></div>
    </section>
  </div>;
}

function Stat({label,value}:{label:string;value:number|string}){return <div className="stat"><b>{typeof value==='number'?fmt(value):value}</b><span>{label}</span></div>}

function CliqueViz({group, players, onSelect}:{group?: ClubSeasonGroup; players: Player[]; onSelect:(id:string)=>void}) {
  if (!group || players.length === 0) return <div className="viz"><p className="muted" style={{padding:20}}>No group to visualize.</p></div>;
  const shown = players.slice(0, 30); const n = shown.length; const cx=50, cy=50, r = n < 8 ? 28 : 38;
  const pts = shown.map((p,i)=>({p, x: cx + r*Math.cos((2*Math.PI*i/n)-Math.PI/2), y: cy + r*Math.sin((2*Math.PI*i/n)-Math.PI/2)}));
  return <div className="viz"><svg className="edgeSvg" viewBox="0 0 100 100" preserveAspectRatio="none">{pts.flatMap((a,i)=>pts.slice(i+1).map(b=><line key={`${a.p.id}-${b.p.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(122,167,255,.22)" strokeWidth=".18"/>))}</svg>{pts.map(({p,x,y})=><button title={`${p.name} · ${p.country}`} key={p.id} className="node" onClick={()=>onSelect(p.id)} style={{left:`${x}%`,top:`${y}%`,background:countryColor(p.country)}}>{p.name.split(' ').slice(-1)[0]}</button>)}<div style={{position:'absolute',left:14,bottom:12}} className="pill">{group.clubName} · {group.season} · {players.length} nodes{players.length>30?' (first 30 shown)':''}</div></div>;
}

function PlayerPanel({player,index,onSelect}:{player?:Player;index:GraphIndex;onSelect:(id:string)=>void}) {
  if (!player) return <div className="card"><h2>Player profile</h2><p className="muted">Select a player.</p></div>;
  const connections = index.adjacency[player.id] ?? [];
  return <div className="card"><h2>Player profile</h2><div className="row"><div><strong>{player.name}</strong><div className="muted small">{player.country} · {player.position} · <a href={`https://www.wikidata.org/wiki/${player.id}`} target="_blank">{player.id}</a></div></div><span className="pill">{connections.length} direct teammates</span></div><h3 style={{marginTop:16}}>Stint history</h3><div className="list">{player.stints.slice().sort((a,b)=>b.season.localeCompare(a.season)).slice(0,18).map((s,i)=><div className="row small" key={`${s.club_id}-${s.season}-${i}`}><span>{index.clubsById[s.club_id]?.name ?? s.club_id}</span><strong>{s.season}</strong></div>)}</div><h3 style={{marginTop:16}}>Direct tournament connections</h3><div className="list">{connections.slice(0,10).map(c=><button className="row" key={c.playerId} onClick={()=>onSelect(c.playerId)}><span>{index.playersById[c.playerId].name} <span className="muted small">({index.playersById[c.playerId].country})</span></span><span className="pill">{c.contexts.length} context{c.contexts.length===1?'':'s'}</span></button>)}</div></div>;
}
function ContextLine({contexts}:{contexts:EdgeContext[]}){const c=contexts[0]; return <div className="small muted">via {c ? `${c.clubName} ${c.season}` : 'shared club-season'}{contexts.length>1?` (+${contexts.length-1} more)`:''}</div>}
function Insights({index}:{index:GraphIndex}){return <div className="card"><h2>Tournament insights</h2><h3>Strongest club-season groups</h3><div className="list">{index.stats.topGroups.slice(0,6).map(g=><div className="row small" key={`${g.clubId}-${g.season}`}><span>{g.clubName} · {g.season}</span><strong>{g.size} players</strong></div>)}</div><h3 style={{marginTop:16}}>Most connected players</h3><div className="list">{index.stats.topPlayers.slice(0,6).map(p=><div className="row small" key={p.playerId}><span>{p.playerName} · {p.country}</span><strong>{p.degree}</strong></div>)}</div><h3 style={{marginTop:16}}>Top cross-national overlaps</h3><div className="list">{index.stats.countryPairs.slice(0,5).map(p=><div className="row small" key={p.pair}><span>{p.pair}</span><strong>{p.count}</strong></div>)}</div></div>}
