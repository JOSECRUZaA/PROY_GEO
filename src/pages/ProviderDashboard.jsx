import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, RefreshCw, Save } from 'lucide-react';

function ProviderDashboard() {
  const [session, setSession] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [mercados, setMercados] = useState([]);
  const [productos, setProductos] = useState([]);
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
        const { data: prods } = await supabase.from('productos').select('*');
        setProductos(prods);

        // Fetch markets and their inventories specific to this provider
        const { data: mercs } = await supabase
          .from('puntos_venta')
          .select(`*, inventarios(*)`);
        
        setMercados(mercs);
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

  const handleAssignStock = async (mercadoId, productoId, cantidad, precio) => {
    if(!roleInfo?.proveedor_id) return;
    try {
      const { data: existing } = await supabase
        .from('inventarios')
        .select('*')
        .eq('punto_venta_id', mercadoId)
        .eq('proveedor_id', roleInfo.proveedor_id)
        .eq('producto_id', productoId)
        .single();

      if (existing) {
        await supabase
          .from('inventarios')
          .update({ cantidad_asignada: Number(cantidad), precio_actual: Number(precio) })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('inventarios')
          .insert({
            punto_venta_id: mercadoId,
            proveedor_id: roleInfo.proveedor_id,
            producto_id: productoId,
            cantidad_asignada: Number(cantidad),
            precio_actual: Number(precio),
            estado: 'Normal',
            nivel_calor: 0.1
          });
      }
      alert("Stock y Precio actualizados correctamente.");
      fetchData(session.user.id);
    } catch (e) {
      console.error(e);
      alert("Error al asignar stock.");
    }
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-white">Cargando...</div>;

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
              <p className="text-zinc-400 mt-1">Empresa: <strong className="text-blue-400">{roleInfo.proveedores.nombre}</strong></p>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-bold border border-red-500/20">
            <LogOut className="w-4 h-4" /> SALIR
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {mercados.map(mercado => {
            const inventarioDelProveedor = mercado.inventarios?.find(i => i.proveedor_id === roleInfo?.proveedor_id);
            return (
              <div key={mercado.id} className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">{mercado.nombre}</h2>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                     <label className="block text-xs uppercase text-zinc-500 mb-1 font-bold">Producto a distribuir</label>
                     <select 
                       id={`prod-${mercado.id}`} 
                       className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                       defaultValue={inventarioDelProveedor?.producto_id || ""}
                     >
                       <option value="" disabled>Selecciona producto</option>
                       {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                     </select>
                  </div>
                  <div className="w-32">
                     <label className="block text-xs uppercase text-zinc-500 mb-1 font-bold">Precio Oficial</label>
                     <input 
                       id={`precio-${mercado.id}`} 
                       type="number" step="0.5" 
                       defaultValue={inventarioDelProveedor?.precio_actual || ""}
                       className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white" 
                     />
                  </div>
                  <div className="w-32">
                     <label className="block text-xs uppercase text-zinc-500 mb-1 font-bold">Stock Asignado</label>
                     <input 
                       id={`stock-${mercado.id}`} 
                       type="number" 
                       defaultValue={inventarioDelProveedor?.cantidad_asignada || 0}
                       className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white" 
                     />
                  </div>
                  <button 
                    onClick={() => {
                       const prodId = document.getElementById(`prod-${mercado.id}`).value;
                       const precio = document.getElementById(`precio-${mercado.id}`).value;
                       const stock = document.getElementById(`stock-${mercado.id}`).value;
                       if(prodId && precio) handleAssignStock(mercado.id, prodId, stock, precio);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
                  >
                    <Save className="w-4 h-4" /> Asignar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProviderDashboard;
