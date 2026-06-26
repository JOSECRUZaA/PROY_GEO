import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Activity, Trash2, Plus, MapPin, UserPlus } from 'lucide-react';
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
  const map = useMapEvents({
    click() {} // dummy to get map instance
  });

  React.useEffect(() => {
    const handleClick = (e) => {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, setPosition]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [mercados, setMercados] = useState([]);
  const [usuariosTienda, setUsuariosTienda] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      }
    });
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    // 1. Obtener Mercados
    const { data: mercs } = await supabase
      .from('puntos_venta')
      .select('*')
      .order('nombre');

    if (mercs) setMercados(mercs);

    // 2. Obtener Usuarios Tienda (para vincular)
    const { data: users } = await supabase
      .from('roles_usuario')
      .select('*')
      .eq('rol', 'tienda');
    
    if (users) setUsuariosTienda(users);

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAddMercado = async (e) => {
    e.preventDefault();
    if (!newMercado.nombre) return alert("El nombre es obligatorio");
    setLoading(true);

    try {
      const { error } = await supabase
        .from('puntos_venta')
        .insert({
          nombre: newMercado.nombre,
          tipo: newMercado.tipo,
          latitud: Number(newMercado.latitud),
          longitud: Number(newMercado.longitud),
          estado_aprobacion: 'aprobado'
        });

      if (error) throw error;

      alert("Punto de Venta agregado exitosamente");
      setIsAdding(false);
      setNewMercado({ nombre: '', tipo: 'formal', latitud: -16.5000, longitud: -68.1500 });
      fetchData(); 

    } catch (err) {
      alert('Error al crear mercado: ' + err.message);
      setLoading(false);
    }
  };

  const handleDeleteMercado = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás completamente seguro de eliminar "${nombre}"?`);
    if (!confirmar) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('puntos_venta').delete().eq('id', id);
      if (error) throw error;
      alert("Mercado eliminado correctamente");
      fetchData();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
      setLoading(false);
    }
  };

  const handleVincularUsuario = async (mercadoId, rolId) => {
    if(!rolId) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('roles_usuario')
        .update({ punto_venta_id: mercadoId })
        .eq('id', rolId);
      
      if(error) throw error;
      alert("Usuario vinculado correctamente a este mercado.");
      fetchData();
    } catch (e) {
      alert("Error al vincular: " + e.message);
      setLoading(false);
    }
  };

  const handleDesvincularUsuario = async (rolId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('roles_usuario')
        .update({ punto_venta_id: null })
        .eq('id', rolId);
      
      if(error) throw error;
      fetchData();
    } catch (e) {
      alert("Error al desvincular: " + e.message);
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
            <p className="text-xs text-zinc-400">Administra Mercados Físicos</p>
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
                   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
               <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">Crear Mercado</button>
             </div>
           </form>
        </div>
      )}

      {/* Main Content (Lista de Mercados) */}
      <main className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mercados.map(mercado => {
          // Buscar qué usuarios están vinculados a este mercado
          const vinculados = usuariosTienda.filter(u => u.punto_venta_id === mercado.id);
          const disponibles = usuariosTienda.filter(u => !u.punto_venta_id);

          return (
            <div key={mercado.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500/30 to-transparent"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-bold text-lg text-white">{mercado.nombre}</h2>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      {mercado.tipo}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDeleteMercado(mercado.id, mercado.nombre)}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Eliminar este mercado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-auto pt-4 border-t border-white/10">
                <h3 className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Cuentas Vinculadas</h3>
                {vinculados.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {vinculados.map(v => (
                      <div key={v.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-xs">
                        <span className="text-emerald-400">{v.email}</span>
                        <button onClick={() => handleDesvincularUsuario(v.id)} className="text-zinc-500 hover:text-red-400">Desvincular</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mb-3 italic">Ningún usuario asignado</p>
                )}

                <div className="flex gap-2">
                  <select 
                    id={`vincular-${mercado.id}`}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 appearance-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Asociar nuevo usuario...</option>
                    {disponibles.map(d => (
                      <option key={d.id} value={d.id}>{d.email}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const sel = document.getElementById(`vincular-${mercado.id}`);
                      if(sel.value) {
                         handleVincularUsuario(mercado.id, sel.value);
                         sel.value = "";
                      }
                    }}
                    className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    title="Vincular"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )
        })}
      </main>
    </div>
  );
}

export default AdminDashboard;
