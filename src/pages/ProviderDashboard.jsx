import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Save, Activity } from 'lucide-react';

function ProviderDashboard() {
  const [session, setSession] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [inventariosAsignados, setInventariosAsignados] = useState([]);
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
        .select('*, proveedores(*)')
        .eq('user_id', userId)
        .single();
      
      setRoleInfo(role);

      if(role && role.proveedor_id) {
        // Fetch only inventories assigned to this provider, including store details and product details
        const { data: invs } = await supabase
          .from('inventarios')
          .select(`
            *,
            puntos_venta ( id, nombre, tipo ),
            productos ( id, nombre )
          `)
          .eq('proveedor_id', role.proveedor_id)
          .order('created_at', { ascending: false });
        
        setInventariosAsignados(invs || []);
      }
    } catch (error) {
      console.error("Error cargando datos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleUpdateStock = async (inventarioId, cantidad, precio) => {
    try {
      const { error } = await supabase
        .from('inventarios')
        .update({ cantidad_asignada: Number(cantidad), precio_actual: Number(precio) })
        .eq('id', inventarioId);

      if (error) throw error;
      alert("Stock y Precio actualizados correctamente.");
      fetchData(session.user.id);
    } catch (e) {
      console.error(e);
      alert("Error al actualizar stock.");
    }
  };

  if (loading) {
    return <div className="h-screen bg-[#050505] flex flex-col gap-4 items-center justify-center text-blue-500"><Activity className="w-10 h-10 animate-pulse" /><p className="text-xs tracking-widest uppercase">Sincronizando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="text-blue-500" /> 
              Panel de Distribuidor
            </h1>
            {roleInfo?.proveedores && (
              <p className="text-zinc-400 mt-1">Empresa: <strong className="text-blue-400">{roleInfo.proveedores.nombre}</strong> <span className="text-xs text-zinc-600 uppercase tracking-widest ml-2">({roleInfo.proveedores.tipo_producto})</span></p>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-bold border border-red-500/20">
            <LogOut className="w-4 h-4" /> SALIR
          </button>
        </header>

        {inventariosAsignados.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-10 text-center">
            <p className="text-zinc-500">No tienes ninguna tienda o mercado asignado para distribuir aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inventariosAsignados.map(inv => (
              <div key={inv.id} className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                
                <h2 className="text-lg font-bold text-white mb-1">{inv.puntos_venta?.nombre}</h2>
                <div className="flex gap-2 items-center mb-5">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                    {inv.puntos_venta?.tipo}
                  </span>
                  <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
                    {inv.productos?.nombre}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[10px] uppercase text-zinc-500 mb-1 font-bold">Precio Oficial (Bs)</label>
                     <input 
                       id={`precio-${inv.id}`} 
                       type="number" step="0.5" 
                       defaultValue={inv.precio_actual}
                       className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" 
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] uppercase text-zinc-500 mb-1 font-bold">Stock Asignado</label>
                     <input 
                       id={`stock-${inv.id}`} 
                       type="number" 
                       defaultValue={inv.cantidad_asignada}
                       className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" 
                     />
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                     const precio = document.getElementById(`precio-${inv.id}`).value;
                     const stock = document.getElementById(`stock-${inv.id}`).value;
                     if(precio && stock) handleUpdateStock(inv.id, stock, precio);
                  }}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-bold uppercase transition-colors border border-blue-500/20"
                >
                  <Save className="w-4 h-4" /> Actualizar Asignación
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProviderDashboard;
