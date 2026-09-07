"use client";

import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase';
import { GlassWater, LogIn, UserPlus, Sparkles } from 'lucide-react';
import '../../app/globals.css';

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function ensureVenue() {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: venues, error: readError } = await supabase.from('venues').select('id').eq('owner_id', user.id).limit(1);
    if (readError) throw readError;
    if (!venues?.length) {
      const { error: insertError } = await supabase.from('venues').insert({ owner_id: user.id, name: 'Mi bar', city: 'Madrid', currency: 'EUR' });
      if (insertError) throw insertError;
    }
    return true;
  }

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

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          await ensureVenue();
          window.location.href = '/';
        } else {
          setMessage('Cuenta creada. Revisa tu correo para confirmar la cuenta y después entra en BAROS.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await ensureVenue();
        window.location.href = '/';
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar la operación.');
    } finally {
      setBusy(false);
    }
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
        <p className="auth-subtitle">{mode === 'login' ? 'Entra en tu panel y sigue controlando tu carta.' : 'Empieza gratis y lleva tus recetas, costes y stock a la nube.'}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && <label>Nombre<input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required /></label>}
          <label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required /></label>
          <label>Contraseña<input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required /></label>
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}
          <button className="primary auth-submit" disabled={busy} type="submit">{mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}{busy ? 'Espera...' : mode === 'login' ? 'Entrar en BAROS' : 'Crear cuenta'}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>{mode === 'login' ? '¿Todavía no tienes cuenta? Crear cuenta' : '¿Ya tienes cuenta? Iniciar sesión'}</button>
      </section>
      <style jsx>{`
        .auth-shell{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 20% 10%,rgba(187,157,109,.12),transparent 35%),#f6f3ee}
        .auth-card{width:min(460px,100%);background:#fff;border:1px solid #e8e2d8;border-radius:28px;padding:38px;box-shadow:0 25px 70px rgba(42,35,27,.1)}
        .auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:30px}.auth-brand strong{display:block;font-size:19px;letter-spacing:.08em}.auth-brand span{display:block;color:#918a80;font-size:11px;margin-top:2px}
        .auth-card h1{font-size:36px;line-height:1.05;margin:22px 0 10px;letter-spacing:-.04em}.auth-subtitle{color:#77716a;margin:0 0 26px;line-height:1.6}
        .auth-form{display:grid;gap:16px}.auth-form label{display:grid;gap:7px;font-size:13px;font-weight:700;color:#39342e}.auth-form input{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid #ded8ce;border-radius:12px;font:inherit;font-weight:400;outline:none}.auth-form input:focus{border-color:#9a876e;box-shadow:0 0 0 3px rgba(154,135,110,.1)}
        .auth-submit{width:100%;justify-content:center;margin-top:4px;padding:14px}.auth-switch{border:0;background:none;width:100%;margin-top:20px;color:#746b61;cursor:pointer;font:inherit;font-size:13px}.auth-switch:hover{text-decoration:underline}
        .auth-error,.auth-message{padding:11px 13px;border-radius:10px;font-size:13px}.auth-error{background:#fff0ed;color:#a23d2e}.auth-message{background:#eef8f1;color:#267044}
        @media(max-width:520px){.auth-card{padding:26px;border-radius:20px}.auth-card h1{font-size:30px}}
      `}</style>
    </main>
  );
}
