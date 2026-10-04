import React from 'react';
import { createRoot } from 'react-dom/client';
import { PlotTool } from './App';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(<PlotTool />);
