import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import './styles.css';
import { AvisosProvider } from './ui/kit.jsx';
import { crearStore } from './data/store.js';
import CoachApp from './coach/CoachApp.jsx';
import AtletaApp from './atleta/AtletaApp.jsx';

const store = crearStore();
const q = new URLSearchParams(location.search);
const vista = q.get('vista');
let token = q.get('a');
// el asesorado que entra con su enlace queda recordado en su teléfono
if (token && /^[A-Za-z0-9_-]{16,80}$/.test(token)) { if (vista !== 'coach') try { localStorage.setItem('bt:atleta', token); } catch {} }
else token = null;
if (!token && !q.has('coach')) { try { const t = localStorage.getItem('bt:atleta'); const coach = localStorage.getItem('bt:auth') || localStorage.getItem('bt:v9:local'); if (t && !coach) token = t; } catch {} }

class Salvavidas extends React.Component {
  constructor(p) { super(p); this.state = { e: null }; }
  static getDerivedStateFromError(e) { return { e }; }
  render() {
    if (!this.state.e) return this.props.children;
    return <div className="fin"><h1 style={{ fontSize: 34 }}>Algo se atascó</h1><p className="frase">Tus datos están a salvo. Recarga la app para seguir.</p>
      <p className="etq" style={{ marginBottom: 18 }}>{String(this.state.e?.message || this.state.e)}</p><button className="btn oro xl full" onClick={() => location.reload()}>Recargar</button></div>;
  }
}

createRoot(document.getElementById('root')).render(
  <Salvavidas><AvisosProvider>{token ? <AtletaApp store={store} token={token} vista={vista} /> : <CoachApp store={store} />}</AvisosProvider></Salvavidas>
);
