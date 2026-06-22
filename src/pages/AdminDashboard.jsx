import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Save, Activity, RefreshCw, Trash2, Plus, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para el icono por defecto de leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [mercados, setMercados] = useState([]);
  const [productosConfig, setProductosConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  
  // Estado para Nuevo Mercado
  const [isAdding, setIsAdding] = useState(false);
  const [newMercado, setNewMercado] = useState({
    nombre: '',
    tipo: 'formal',
    latitud: -16.5000,
    longitud: -68.1500
  });

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setSession(session);
        fetchData();
        fetchProductos();
      }
    });
  }, [navigate]);

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*');
    if (data) {
      // Filtrar productos duplicados por nombre
      const unicos = [];
      const nombres = new Set();
      data.forEach(p => {
        if (!nombres.has(p.nombre)) {
          nombres.add(p.nombre);
          unicos.push(p);
        }
      });
      setProductosConfig(unicos);
    }
  };

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
      alert('Inventario actualizado correctamente');
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // --- NUEVAS FUNCIONES: CREAR Y ELIMINAR ---

  const handleAddMercado = async (e) => {
    e.preventDefault();
    if (!newMercado.nombre) return alert("El nombre es obligatorio");
    setLoading(true);

    try {
      // 1. Insertar el Punto de Venta
      const { data: insertedPunto, error: puntoError } = await supabase
        .from('puntos_venta')
        .insert({
          nombre: newMercado.nombre,
          tipo: newMercado.tipo,
          latitud: Number(newMercado.latitud),
          longitud: Number(newMercado.longitud),
          estado_aprobacion: 'aprobado'
        })
        .select()
        .single();

      if (puntoError) throw puntoError;

      // 2. Crear Inventario Base para Pollo y Res
      const inventariosBase = productosConfig.map(prod => {
        const esPollo = prod.nombre.toLowerCase().includes('pollo');
        return {
          punto_venta_id: insertedPunto.id,
          producto_id: prod.id,
          precio_actual: esPollo ? 16.50 : 40.00,
          estado: 'Normal',
          nivel_calor: 0.2
        };
      });

      const { error: invError } = await supabase.from('inventarios').insert(inventariosBase);
      if (invError) throw invError;

      alert("Punto de Venta agregado exitosamente");
      setIsAdding(false);
      setNewMercado({ nombre: '', tipo: 'formal', latitud: -16.5000, longitud: -68.1500 });
      fetchData(); // Recargar la lista

    } catch (err) {
      alert('Error al crear mercado: ' + err.message);
      setLoading(false);
    }
  };

  const handleDeleteMercado = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás completamente seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    setLoading(true);
    try {
      // Primero eliminar los inventarios por la llave foránea
      await supabase.from('inventarios').delete().eq('punto_venta_id', id);
      // Luego eliminar el mercado
      const { error } = await supabase.from('puntos_venta').delete().eq('id', id);
      
      if (error) throw error;
      alert("Mercado eliminado correctamente");
      fetchData();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-screen bg-[#050505] flex flex-col gap-4 items-center justify-center text-rose-500"><Activity className="w-10 h-10 animate-pulse" /><p className="text-xs tracking-widest uppercase">Sincronizando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-zinc-100 p-4 md:p-6 pb-24">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-white/10 gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-zinc-400">
             <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="text-rose-500" /> Control de Zonas
            </h1>
            <p className="text-xs text-zinc-400">Administra Mercados y Precios</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-4 bg-black/40 p-2 md:p-0 md:bg-transparent rounded-lg">
          <span className="text-xs text-zinc-500 hidden md:inline">{session?.user?.email}</span>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-bold uppercase transition-colors"
          >
            {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Nuevo Punto</>}
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-bold uppercase transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      {/* Formulario de Nuevo Mercado */}
      {isAdding && (
        <div className="max-w-6xl mx-auto mb-8 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden animate-in slide-in-from-top-4">
           <h2 className="text-emerald-400 font-bold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Registrar Nuevo Punto de Venta</h2>
           <form onSubmit={handleAddMercado} className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="md:col-span-2">
               <label className="block text-[10px] text-zinc-400 uppercase mb-1">Nombre del Mercado/Feria</label>
               <input type="text" required value={newMercado.nombre} onChange={e => setNewMercado({...newMercado, nombre: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" placeholder="Ej. Mercado Central" />
             </div>
             <div>
               <label className="block text-[10px] text-zinc-400 uppercase mb-1">Tipo</label>
               <select value={newMercado.tipo} onChange={e => setNewMercado({...newMercado, tipo: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none">
                 <option value="formal">Formal</option>
                 <option value="informal">Informal (Feria)</option>
               </select>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1">Latitud</label>
                  <input type="number" step="0.0001" required value={newMercado.latitud} onChange={e => setNewMercado({...newMercado, latitud: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1">Longitud</label>
                  <input type="number" step="0.0001" required value={newMercado.longitud} onChange={e => setNewMercado({...newMercado, longitud: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                </div>
             </div>

             {/* Selector de Ubicación en Mapa */}
             <div className="md:col-span-4 h-64 w-full rounded-xl overflow-hidden border border-white/10 relative z-0 mt-2">
               <MapContainer center={[-16.5000, -68.1500]} zoom={13} className="h-full w-full" scrollWheelZoom={true}>
                 <TileLayer
                   attribution='&copy; OpenStreetMap'
                   url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                 />
                 <LocationMarker 
                   position={{ lat: Number(newMercado.latitud), lng: Number(newMercado.longitud) }} 
                   setPosition={(pos) => setNewMercado({...newMercado, latitud: pos.lat.toFixed(5), longitud: pos.lng.toFixed(5)})} 
                 />
               </MapContainer>
               <div className="absolute top-2 right-2 z-[400] bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] text-zinc-300 pointer-events-none">
                 Haz clic en el mapa para ajustar la ubicación
               </div>
             </div>

             <div className="md:col-span-4 flex justify-end mt-2">
               <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">Crear e Inicializar Inventario</button>
             </div>
           </form>
        </div>
      )}

      {/* Main Content (Lista de Mercados) */}
      <main className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
        {mercados.map(mercado => (
          <div key={mercado.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500/30 to-transparent"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-white">{mercado.nombre}</h2>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                    {mercado.tipo}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    {mercado.id.substring(0, 8)}
                  </span>
                </div>
              </div>
              
              {/* Botón Eliminar */}
              <button 
                onClick={() => handleDeleteMercado(mercado.id, mercado.nombre)}
                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Eliminar este mercado"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
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
              className="mt-5 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              {savingId === mercado.id ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 text-emerald-400"/>}
              Guardar Precios
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}

export default AdminDashboard;
