import React from 'react';
import { createRoot } from 'react-dom/client';
import SquadGraphApp from './components/SquadGraphApp';
import graphIndex from '../public/data/graph-index.json';
import gaps from '../public/data/gaps.json';
import type { GraphIndex } from './lib/types';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SquadGraphApp index={graphIndex as unknown as GraphIndex} gaps={gaps as Record<string, unknown>} />
  </React.StrictMode>
);
