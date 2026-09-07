"use client";

import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase';
import { GlassWater, LogIn, UserPlus, Sparkles } from 'lucide-react';
import '../globals.css';

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    if (!supabase) {
      setError('Falta configurar Supabase en .env.local.');
      setBusy(false);
      return;
    }

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) setError(error.message);
      else if (data.session) window.location.href = '/';
      else setMessage('Cuenta creada. Revisa tu correo para confirmar la cuenta y después entra en BAROS.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('Correo o contraseña incorrectos.');
      else window.location.href = '/';
    }

    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><GlassWater size={22} /></div>
          <div><strong>BAROS</strong><span>cocktail OS</span></div>
        </div>
        <span className="pill"><Sparkles size={14} /> GESTIÓN INTELIGENTE PARA BARES</span>
        <h1>{mode === 'login' ? 'Bienvenido de nuevo.' : 'Crea tu cuenta BAROS.'}</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Entra en tu panel y sigue controlando tu carta.' : 'Empieza gratis y lleva tus recetas, costes y stock a la nube.'}
        </p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <label>Nombre<input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required /></label>
          )}
          <label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required /></label>
          <label>Contraseña<input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required /></label>
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}
          <button className="primary auth-submit" disabled={busy} type="submit">
            {mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}
            {busy ? 'Espera...' : mode === 'login' ? 'Entrar en BAROS' : 'Crear cuenta'}
          </button>
        </form>

        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
          {mode === 'login' ? '¿Todavía no tienes cuenta? Crear cuenta' : '¿Ya tienes cuenta? Iniciar sesión'}
        </button>
      </section>
    </main>
  );
}
