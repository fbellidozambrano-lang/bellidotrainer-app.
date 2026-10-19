import React, { useState } from 'react';
import { Barra, Ico, ir, Hoja, Campo, useAviso } from '../ui/kit.jsx';
import { TarjetaPrograma, ordenarProgramas } from '../shared/Programas.jsx';
import { PLANTILLAS_BASE } from '../data/constants.js';
import { nuevoPrograma, clonarDias, normEj, uuid, nDias, primerNombre } from '../lib/util.js';

const desdePlantilla = (pl) => { if (pl.dias) return clonarDias(pl.dias); const orden = [...new Set(pl.ejercicios.map((e) => e.dia))]; return orden.map((d) => ({ id: uuid(), nombre: d, ejercicios: pl.ejercicios.filter((e) => e.dia === d).map((e) => normEj({ ...e, id: uuid() })) })); };

export function NuevoPrograma({ a, datos, onCrear, onCerrar }) {
  const [n, setN] = useState(3); const [nombre, setNombre] = useState(''); const [base, setBase] = useState('blanco'); const [elegido, setElegido] = useState(null);
  const otros = datos.programas.filter((p) => nDias(p) > 0);
  const nDiasFinal = base === 'blanco' ? n : elegido ? (base === 'plantilla' && !elegido.dias ? new Set(elegido.ejercicios.map((e) => e.dia)).size : nDias(elegido)) : n;
  const propias = [...(datos.plantillas || [])].sort((x, y) => nDias(y) - nDias(x) || x.nombre.localeCompare(y.nombre));
  function crear() {
    const base0 = elegido ? String(elegido.nombre || '').replace(/\s*\(copia\)$/, '') : ''; const p = nuevoPrograma(a.id, n, nombre.trim() || base0 || `Plan ${nDiasFinal} días`);
    if (base === 'plantilla' && elegido) { p.dias = desdePlantilla(elegido); p.nota = elegido.nota || ''; }
    if (base === 'copiar' && elegido) p.dias = clonarDias(elegido.dias);
    p.orden = Math.max(0, ...datos.programas.filter((x) => x.asesoradoId === a.id).map((x) => x.orden || 0)) + 1;
    onCrear(p);
  }
  return (
    <Hoja titulo="Nuevo programa" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={base !== 'blanco' && !elegido} onClick={crear}>Crear programa</button></>}>
      <Campo l="Empezar"><div className="seg"><button className={base === 'blanco' ? 'on' : ''} onClick={() => { setBase('blanco'); setElegido(null); }}>En blanco</button><button className={base === 'plantilla' ? 'on' : ''} onClick={() => { setBase('plantilla'); setElegido(null); }}>Plantilla</button><button className={base === 'copiar' ? 'on' : ''} onClick={() => { setBase('copiar'); setElegido(null); }}>Copiar</button></div></Campo>
      {base === 'blanco' && <Campo l="Días por semana"><div className="chips">{[2, 3, 4, 5, 6].map((x) => <button key={x} className={`chip ${n === x ? 'on' : ''}`} style={{ minWidth: 52, fontSize: 17 }} onClick={() => setN(x)}>{x}</button>)}</div></Campo>}
      {base === 'plantilla' && propias.length > 0 && <><p className="etq" style={{ marginBottom: 4 }}>Tus plantillas</p><div className="lista" style={{ marginBottom: 14, maxHeight: 300, overflow: 'auto' }}>{propias.map((pl) => <button key={pl.id} className="item" onClick={() => setElegido(pl)}>
        <span className={`ej-sel ${elegido?.id === pl.id ? 'on' : ''}`}>{elegido?.id === pl.id && <Ico n="check" s={16} w={3} />}</span>
        <div className="item-t"><strong>{pl.nombre}</strong><span>{nDias(pl)} días · {pl.dias.reduce((t, d) => t + d.ejercicios.length, 0)} ejercicios</span></div></button>)}</div><p className="etq" style={{ marginBottom: 4 }}>Incluidas</p></>}
      {base === 'plantilla' && <div className="lista" style={{ marginBottom: 14 }}>{PLANTILLAS_BASE.map((pl) => <button key={pl.id} className="item" onClick={() => setElegido(pl)}>
        <span className={`ej-sel ${elegido?.id === pl.id ? 'on' : ''}`}>{elegido?.id === pl.id && <Ico n="check" s={16} w={3} />}</span>
        <div className="item-t"><strong>{pl.nombre}</strong><span style={{ whiteSpace: 'normal' }}>{pl.nota}</span></div></button>)}</div>}
      {base === 'copiar' && (otros.length ? <div className="lista" style={{ marginBottom: 14, maxHeight: 320, overflow: 'auto' }}>{otros.map((p) => { const due = datos.asesorados.find((x) => x.id === p.asesoradoId);
        return <button key={p.id} className="item" onClick={() => setElegido(p)}><span className={`ej-sel ${elegido?.id === p.id ? 'on' : ''}`}>{elegido?.id === p.id && <Ico n="check" s={16} w={3} />}</span>
          <div className="item-t"><strong>{p.nombre}</strong><span>{due ? due.nombre : ''} · {nDias(p)} días</span></div></button>; })}</div>
        : <p className="vacio" style={{ marginBottom: 14 }}>Todavía no hay programas para copiar.</p>)}
      <Campo l="Nombre del programa"><input className="in" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={elegido?.nombre || `Plan ${nDiasFinal} días`} /></Campo>
      {base === 'copiar' && <p className="ayuda">Se copian solo los ejercicios. El historial de cada asesorado no se mezcla.</p>}
    </Hoja>
  );
}

export default function Rutinas({ a, programas, sesiones, datos, acc }) {
  const avisar = useAviso(); const [nuevo, setNuevo] = useState(false); const nom = primerNombre(a.nombre);
  const ps = ordenarProgramas(programas);
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir('a', a.id), texto: nom }} titulo="" borde={false} />
      <section style={{ padding: '4px 0 18px' }}>
        <h1 className="gigante">Rutinas</h1>
        <p className="sub">Arma un programa por cada frecuencia. {nom} elige cada semana el que le cuadre según los días que puede entrenar.</p>
      </section>
      {ps.length === 0 && <div className="vacio" style={{ marginBottom: 12 }}><b>Sin programas todavía</b>Empieza por los que más usa: 2, 3 o 5 días por semana.</div>}
      {ps.map((p) => <TarjetaPrograma key={p.id} p={p} sesiones={sesiones} coach onClick={() => ir('a', a.id, 'p', p.id)} />)}
      <button className="nuevo-prog" onClick={() => setNuevo(true)}><Ico n="mas" />Nuevo programa</button>
      {nuevo && <NuevoPrograma a={a} datos={datos} onCerrar={() => setNuevo(false)} onCrear={async (p) => { setNuevo(false); await acc.guardarPrograma(p); avisar('Programa creado'); ir('a', a.id, 'p', p.id); }} />}
    </div>
  );
}
