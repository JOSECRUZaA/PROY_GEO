import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Si se registró con éxito, puede que requiera confirmación por email, pero asumimos auto-login en dev
        if(data.user) {
           alert("Usuario creado exitosamente. Ya puedes iniciar sesión.");
           setIsLogin(true);
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#050505] flex items-center justify-center font-sans relative overflow-hidden text-zinc-100">
      
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-rose-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-md p-8 bg-[#0a0a0a]/70 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <ShieldCheck className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">Acceso</h1>
              <p className="text-xs text-zinc-400">Portal de Administración</p>
            </div>
          </div>
          <Link to="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
             <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-widest">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-zinc-600"
              placeholder="admin@geocarnes.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-widest">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-zinc-600"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-white py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] border border-rose-400/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (isLogin ? <><LogIn className="w-4 h-4"/> Iniciar Sesión</> : <><UserPlus className="w-4 h-4"/> Registrarse</>)}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-xs text-zinc-400 hover:text-rose-400 transition-colors"
          >
            {isLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;
