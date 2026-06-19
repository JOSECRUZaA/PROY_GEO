import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Save, Activity, RefreshCw } from 'lucide-react';

function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [mercados, setMercados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setSession(session);
        fetchData();
      }
    });
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('puntos_venta')
      .select(`
        id, nombre, tipo,
        inventarios (
          id, precio_actual, estado, nivel_calor,
          productos ( id, nombre )
        )
      `)
      .order('nombre');

    if (!error && data) {
      setMercados(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleInventoryChange = (mercadoId, inventarioId, field, value) => {
    setMercados(prev => prev.map(m => {
      if (m.id !== mercadoId) return m;
      return {
        ...m,
        inventarios: m.inventarios.map(inv => {
          if (inv.id !== inventarioId) return inv;
          return { ...inv, [field]: value };
        })
      };
    }));
  };

  const saveInventory = async (mercadoId, inventarios) => {
    setSavingId(mercadoId);
    try {
      for (let inv of inventarios) {
        const { error } = await supabase
          .from('inventarios')
          .update({
            precio_actual: Number(inv.precio_actual),
            estado: inv.estado,
            nivel_calor: Number(inv.nivel_calor)
          })
          .eq('id', inv.id);
        
        if (error) throw error;
      }
      alert('Actualizado correctamente');
    } catch (err) {
      console.error(err);
      alert('Error al actualizar: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="h-screen bg-[#050505] flex items-center justify-center text-rose-500"><Activity className="w-8 h-8 animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-zinc-100 p-6">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-zinc-400">
             <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="text-rose-500" /> Panel de Control
            </h1>
            <p className="text-xs text-zinc-400">Gestión de Inventarios y Precios</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500">{session?.user?.email}</span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-bold uppercase transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
        {mercados.map(mercado => (
          <div key={mercado.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500/30 to-transparent"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-white">{mercado.nombre}</h2>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {mercado.tipo}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {mercado.inventarios.map(inv => (
                <div key={inv.id} className="p-3 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-3">
                  <div className="font-medium text-rose-400 text-sm">
                    {inv.productos?.nombre}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Precio (Bs.)</label>
                      <input 
                        type="number" step="0.5"
                        value={inv.precio_actual}
                        onChange={(e) => handleInventoryChange(mercado.id, inv.id, 'precio_actual', e.target.value)}
                        className="w-full bg-transparent border-b border-white/20 text-white text-sm pb-1 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Estado</label>
                      <select 
                        value={inv.estado}
                        onChange={(e) => handleInventoryChange(mercado.id, inv.id, 'estado', e.target.value)}
                        className="w-full bg-black/50 border-b border-white/20 text-white text-sm pb-1 focus:outline-none focus:border-rose-500 appearance-none"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Poco">Poco</option>
                        <option value="Escaso">Escaso</option>
                        <option value="Agotado">Agotado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Calor (0 a 1)</label>
                      <input 
                        type="number" step="0.1" min="0" max="1"
                        value={inv.nivel_calor}
                        onChange={(e) => handleInventoryChange(mercado.id, inv.id, 'nivel_calor', e.target.value)}
                        className="w-full bg-transparent border-b border-white/20 text-white text-sm pb-1 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => saveInventory(mercado.id, mercado.inventarios)}
              disabled={savingId === mercado.id}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              {savingId === mercado.id ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              Guardar Cambios
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}

export default AdminDashboard;
