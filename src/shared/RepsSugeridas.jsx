import React from 'react';

// Reps sugeridas: una cantidad (de 8) o un rango (de 8 a 10). Se guarda "8" o "8-10".
export default function RepsSugeridas({ valor, onChange, repMin, repMax }) {
  const m = String(valor ?? '').match(/^\s*(\d*)\s*(?:-|–|a)?\s*(\d*)\s*$/i);
  const [a, b] = m ? [m[1], m[2]] : [String(valor ?? ''), ''];
  const poner = (x, y) => onChange(y ? `${x}-${y}` : x);
  const solo = (v) => v.replace(/\D/g, '').slice(0, 3);
  return (
    <div className="reps-sug">
      <span>de</span>
      <input className="in num" inputMode="numeric" value={a} placeholder={String(repMin ?? '')} onChange={(e) => poner(solo(e.target.value), b)} aria-label="Reps sugeridas desde" />
      <span>a</span>
      <input className="in num" inputMode="numeric" value={b} placeholder={String(repMax ?? '')} onChange={(e) => poner(a, solo(e.target.value))} aria-label="Reps sugeridas hasta (opcional)" />
      <span>reps</span>
    </div>
  );
}
