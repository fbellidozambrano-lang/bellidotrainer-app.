import React, { useState } from 'react';
import foto from '../assets/foto.jpg';
import logo from '../assets/logo.png';

export default function Login({ store }) {
  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const [error, setError] = useState(''); const [ocupado, setOcupado] = useState(false); const [aviso, setAviso] = useState('');
  async function enviar(e) {
    e.preventDefault(); setError(''); setAviso(''); setOcupado(true);
    try {
      if (modo === 'entrar') await store.auth.entrar(email.trim(), pass);
      else { const u = await store.auth.registrar(email.trim(), pass); if (!u) setAviso('Te mandamos un correo para confirmar la cuenta. Ábrelo y luego entra aquí.'); }
    } catch (x) { setError(x.message); }
    setOcupado(false);
  }
  return (
    <div className="portada">
      <div className="portada-foto" style={{ backgroundImage: `url(${foto})` }} />
      <form className="portada-c" onSubmit={enviar}>
        <img className="portada-logo" src={logo} alt="BELLIDO TRAINER" />
        <h1>Más que entrenamiento<br />es transformación</h1>
        <p className="lema">{modo === 'entrar' ? 'Entra a tu panel de coach.' : 'Crea la cuenta de coach. Se hace una sola vez.'}</p>
        <label className="campo"><span>Correo</span><input className="in" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="campo"><span>Contraseña</span><input className="in" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} /></label>
        {error && <p className="aviso rojo" style={{ margin: '0 0 14px' }}>{error}</p>}
        {aviso && <p className="aviso" style={{ margin: '0 0 14px' }}>{aviso}</p>}
        <button className="btn oro xl full" disabled={ocupado}>{ocupado ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
        <button type="button" className="btn fant full" style={{ marginTop: 6 }} onClick={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setError(''); }}>
          {modo === 'entrar' ? 'Primera vez: crear cuenta de coach' : 'Ya tengo cuenta'}</button>
        <p className="portada-pie">¿Eres asesorado? Abre el enlace personal que te envió tu coach.</p>
      </form>
    </div>
  );
}
