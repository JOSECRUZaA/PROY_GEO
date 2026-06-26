import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Store, AlertTriangle, CheckCircle, Flame, XCircle } from 'lucide-react';

const STATUS_LEVELS = {
  'Normal': { calor: 0.1, color: 'emerald', icon: CheckCircle },
  'Poco': { calor: 0.4, color: 'yellow', icon: Flame },
  'Escaso': { calor: 0.7, color: 'orange', icon: AlertTriangle },
  'Agotado': { calor: 1.0, color: 'red', icon: XCircle }
};

function StoreDashboard() {
  const [session, setSession] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setSession(session);
        fetchData(session.user.id);
      }
    });
  }, [navigate]);

  const fetchData = async (userId) => {
    try {
      setLoading(true);
      const { data: role } = await supabase
        .from('roles_usuario')
        .select('*, puntos_venta(*)')
        .eq('user_id', userId)
        .single();
      
      setRoleInfo(role);

      if(role && role.punto_venta_id) {
        const { data: invs } = await supabase
          .from('inventarios')
          .select('*, productos(*), proveedores(*)')
          .eq('punto_venta_id', role.punto_venta_id);
        
        setInventarios(invs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const updateStatus = async (inventarioId, nuevoEstado) => {
    try {
      const config = STATUS_LEVELS[nuevoEstado];
      await supabase
        .from('inventarios')
        .update({ estado: nuevoEstado, nivel_calor: config.calor })
        .eq('id', inventarioId);
      
      fetchData(session.user.id);
    } catch (error) {
      alert("Error al actualizar estado");
    }
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-white">Cargando Tienda...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Store className="text-emerald-500" /> 
              Mi Tienda
            </h1>
            {roleInfo?.puntos_venta && (
              <p className="text-zinc-400 mt-1">{roleInfo.puntos_venta.nombre}</p>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-bold border border-red-500/20">
            <LogOut className="w-4 h-4" /> SALIR
          </button>
        </header>

        {inventarios.length === 0 ? (
          <div className="text-center p-8 border border-white/10 rounded-xl bg-white/5 text-zinc-400">
            Aún no tienes stock asignado por ningún proveedor.
          </div>
        ) : (
          <div className="space-y-6">
            {inventarios.map(inv => (
              <div key={inv.id} className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full bg-${STATUS_LEVELS[inv.estado].color}-500`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{inv.productos?.nombre}</h3>
                    <p className="text-xs text-zinc-400">Proveedor: {inv.proveedores?.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-400">Bs. {inv.precio_actual}</p>
                    <p className="text-xs text-zinc-500">Stock asignado: {inv.cantidad_asignada}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Reportar estado actual:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.keys(STATUS_LEVELS).map(estado => {
                      const isActive = inv.estado === estado;
                      const Icon = STATUS_LEVELS[estado].icon;
                      let colorClass = isActive 
                        ? (estado === 'Normal' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 
                           estado === 'Poco' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 
                           estado === 'Escaso' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 
                           'bg-red-500/20 text-red-400 border-red-500/50')
                        : 'bg-black/40 text-zinc-400 border-white/10 hover:bg-white/5';

                      return (
                        <button 
                          key={estado}
                          onClick={() => updateStatus(inv.id, estado)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${colorClass}`}
                        >
                          <Icon className="w-5 h-5 mb-1" />
                          <span className="text-xs font-bold">{estado}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreDashboard;
