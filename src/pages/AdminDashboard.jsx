import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Activity, Trash2, Plus, MapPin, Store, Truck, Edit2, X, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click() {}
  });

  React.useEffect(() => {
    const handleClick = (e) => {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, setPosition]);

  return position === null ? null : <Marker position={position}></Marker>;
}

function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [mercados, setMercados] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('tiendas'); // 'tiendas' | 'distribuidores'

  const [isAdding, setIsAdding] = useState(false);
  const [newMercado, setNewMercado] = useState({
    nombre: '', tipo: 'formal', latitud: -16.5000, longitud: -68.1500, distribuidor_pollo: '', distribuidor_res: '', email: '', password: ''
  });
  
  const [isAddingProv, setIsAddingProv] = useState(false);
  const [newProv, setNewProv] = useState({
    nombre: '', tipo_producto: 'Carne de Pollo', email: '', password: ''
  });

  const [editingMercadoId, setEditingMercadoId] = useState(null);
  const [editForm, setEditForm] = useState({ distribuidor_pollo: '', distribuidor_res: '' });

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
      else {
        setSession(session);
        fetchData();
      }
    });
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: mercs } = await supabase
      .from('puntos_venta')
      .select(`*, inventarios ( id, producto_id, proveedor_id, proveedores ( nombre, tipo_producto ) )`)
      .order('nombre');

    if (mercs) setMercados(mercs);

    const { data: provs } = await supabase.from('proveedores').select('*').order('nombre');
    if (provs) setProveedores(provs);
    
    const { data: prods } = await supabase.from('productos').select('*');
    if (prods) setProductos(prods);

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAddMercado = async (e) => {
    e.preventDefault();
    if (!newMercado.nombre || !newMercado.email || !newMercado.password) return alert("Nombre, correo y contraseña son obligatorios");
    setLoading(true);
    try {
      const { data: puntoData, error: errorPunto } = await supabase.from('puntos_venta').insert({
          nombre: newMercado.nombre, tipo: newMercado.tipo, latitud: Number(newMercado.latitud), longitud: Number(newMercado.longitud), estado_aprobacion: 'aprobado'
      }).select().single();

      if (errorPunto) throw errorPunto;
      const puntoId = puntoData.id;

      const inventarios = [];
      const polloProd = productos.find(p => p.nombre.toLowerCase().includes('pollo'));
      const resProd = productos.find(p => p.nombre.toLowerCase().includes('res'));

      if (newMercado.distribuidor_pollo && polloProd) {
        inventarios.push({ punto_venta_id: puntoId, producto_id: polloProd.id, proveedor_id: newMercado.distribuidor_pollo, cantidad_asignada: 0, precio_actual: 0, estado: 'Agotado', nivel_calor: 1.0 });
      }
      if (newMercado.distribuidor_res && resProd) {
        inventarios.push({ punto_venta_id: puntoId, producto_id: resProd.id, proveedor_id: newMercado.distribuidor_res, cantidad_asignada: 0, precio_actual: 0, estado: 'Agotado', nivel_calor: 1.0 });
      }
      if (inventarios.length > 0) {
        const { error: errorInv } = await supabase.from('inventarios').insert(inventarios);
        if (errorInv) throw errorInv;
      }

      const { error: errorPre } = await supabase.from('pre_registro_usuarios').insert({
          email: newMercado.email, password_temporal: newMercado.password, rol: 'tienda', punto_venta_id: puntoId
      });
      if (errorPre) throw errorPre;

      alert("Mercado creado y cuenta pre-registrada exitosamente.");
      setIsAdding(false);
      setNewMercado({ nombre: '', tipo: 'formal', latitud: -16.5000, longitud: -68.1500, distribuidor_pollo: '', distribuidor_res: '', email: '', password: '' });
      fetchData(); 
    } catch (err) {
      alert('Error al crear mercado: ' + err.message);
      setLoading(false);
    }
  };

  const handleAddProveedor = async (e) => {
    e.preventDefault();
    if (!newProv.nombre || !newProv.email || !newProv.password) return alert("Nombre, correo y contraseña obligatorios");
    setLoading(true);
    try {
      const { data: provData, error: errorProv } = await supabase.from('proveedores').insert({
          nombre: newProv.nombre, tipo_producto: newProv.tipo_producto
      }).select().single();

      if (errorProv) throw errorProv;

      const { error: errorPre } = await supabase.from('pre_registro_usuarios').insert({
          email: newProv.email, password_temporal: newProv.password, rol: 'proveedor', proveedor_id: provData.id
      });
      if (errorPre) throw errorPre;

      alert("Proveedor creado y cuenta pre-registrada exitosamente.");
      setIsAddingProv(false);
      setNewProv({ nombre: '', tipo_producto: 'Carne de Pollo', email: '', password: '' });
      fetchData(); 
    } catch (err) {
      alert('Error al crear proveedor: ' + err.message);
      setLoading(false);
    }
  };

  const handleDeleteMercado = async (id, nombre) => {
    if (!window.confirm(`¿Seguro de eliminar "${nombre}"?`)) return;
    setLoading(true);
    try {
      await supabase.from('puntos_venta').delete().eq('id', id);
      alert("Mercado eliminado");
      fetchData();
    } catch (err) { alert("Error: " + err.message); setLoading(false); }
  };

  const handleDeleteProveedor = async (id, nombre) => {
    if (!window.confirm(`¿Seguro de eliminar distribuidor "${nombre}"?`)) return;
    setLoading(true);
    try {
      await supabase.from('proveedores').delete().eq('id', id);
      alert("Proveedor eliminado");
      fetchData();
    } catch (err) { alert("Error: " + err.message); setLoading(false); }
  };

  const handleEditClick = (mercado) => {
    const polloProd = productos.find(p => p.nombre.toLowerCase().includes('pollo'));
    const resProd = productos.find(p => p.nombre.toLowerCase().includes('res'));

    const invPollo = mercado.inventarios.find(i => i.producto_id === polloProd?.id);
    const invRes = mercado.inventarios.find(i => i.producto_id === resProd?.id);

    setEditForm({
      distribuidor_pollo: invPollo?.proveedor_id || '',
      distribuidor_res: invRes?.proveedor_id || ''
    });
    setEditingMercadoId(mercado.id);
  };

  const handleSaveEdit = async (mercado) => {
    setLoading(true);
    try {
      const polloProd = productos.find(p => p.nombre.toLowerCase().includes('pollo'));
      const resProd = productos.find(p => p.nombre.toLowerCase().includes('res'));

      const invPollo = mercado.inventarios.find(i => i.producto_id === polloProd?.id);
      const invRes = mercado.inventarios.find(i => i.producto_id === resProd?.id);

      // Handle Pollo
      if (editForm.distribuidor_pollo) {
        if (invPollo) {
          await supabase.from('inventarios').update({ proveedor_id: editForm.distribuidor_pollo }).eq('id', invPollo.id);
        } else if (polloProd) {
          await supabase.from('inventarios').insert({ punto_venta_id: mercado.id, producto_id: polloProd.id, proveedor_id: editForm.distribuidor_pollo, cantidad_asignada: 0, precio_actual: 0, estado: 'Agotado', nivel_calor: 1.0 });
        }
      } else if (invPollo) {
        await supabase.from('inventarios').delete().eq('id', invPollo.id);
      }

      // Handle Res
      if (editForm.distribuidor_res) {
        if (invRes) {
          await supabase.from('inventarios').update({ proveedor_id: editForm.distribuidor_res }).eq('id', invRes.id);
        } else if (resProd) {
          await supabase.from('inventarios').insert({ punto_venta_id: mercado.id, producto_id: resProd.id, proveedor_id: editForm.distribuidor_res, cantidad_asignada: 0, precio_actual: 0, estado: 'Agotado', nivel_calor: 1.0 });
        }
      } else if (invRes) {
        await supabase.from('inventarios').delete().eq('id', invRes.id);
      }

      setEditingMercadoId(null);
      fetchData();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
      setLoading(false);
    }
  };

  if (loading) return <div className="h-screen bg-[#050505] flex flex-col gap-4 items-center justify-center text-rose-500"><Activity className="w-10 h-10 animate-pulse" /><p className="text-xs tracking-widest uppercase">Sincronizando...</p></div>;

  const provsPollo = proveedores.filter(p => p.tipo_producto.toLowerCase().includes('pollo'));
  const provsRes = proveedores.filter(p => p.tipo_producto.toLowerCase().includes('res'));

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-zinc-100 p-4 md:p-6 pb-24">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-white/10 gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-zinc-400"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2"><Activity className="text-rose-500" /> Control de Zonas</h1>
            <p className="text-xs text-zinc-400">Administra Plataforma</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-black/40 p-2 md:p-0 md:bg-transparent rounded-lg">
          <span className="text-xs text-zinc-500 hidden md:inline">{session?.user?.email}</span>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-bold uppercase transition-colors">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto mb-6 flex gap-2 border-b border-white/10 pb-4">
        <button onClick={() => setActiveTab('tiendas')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${activeTab === 'tiendas' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:bg-white/5'}`}>
          <Store className="w-4 h-4" /> Tiendas
        </button>
        <button onClick={() => setActiveTab('distribuidores')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${activeTab === 'distribuidores' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:bg-white/5'}`}>
          <Truck className="w-4 h-4" /> Distribuidores
        </button>
      </div>

      {activeTab === 'tiendas' && (
        <>
          <div className="max-w-6xl mx-auto mb-4 flex justify-end">
            <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-bold uppercase transition-colors">
              {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4" /> Nuevo Punto</>}
            </button>
          </div>

          {isAdding && (
            <div className="max-w-6xl mx-auto mb-8 bg-[#0a0a0a] border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden animate-in slide-in-from-top-4">
               <h2 className="text-emerald-400 font-bold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Registrar Nuevo Punto de Venta</h2>
               <form onSubmit={handleAddMercado} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* ... Formulario de tienda (igual) ... */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500/70 border-b border-white/5 pb-2">1. Datos del Mercado</h3>
                   <div>
                     <label className="block text-[10px] text-zinc-400 uppercase mb-1">Nombre</label>
                     <input type="text" required value={newMercado.nombre} onChange={e => setNewMercado({...newMercado, nombre: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] text-zinc-400 uppercase mb-1">Tipo</label>
                       <select value={newMercado.tipo} onChange={e => setNewMercado({...newMercado, tipo: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none">
                         <option value="formal">Formal</option>
                         <option value="informal">Informal</option>
                       </select>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-zinc-400 uppercase mb-1">Lat</label>
                          <input type="number" step="0.0001" required value={newMercado.latitud} onChange={e => setNewMercado({...newMercado, latitud: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-emerald-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 uppercase mb-1">Lng</label>
                          <input type="number" step="0.0001" required value={newMercado.longitud} onChange={e => setNewMercado({...newMercado, longitud: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-emerald-500 outline-none" />
                        </div>
                     </div>
                   </div>
                   <div className="h-40 w-full rounded-xl overflow-hidden border border-white/10 relative z-0">
                     <MapContainer center={[-16.5000, -68.1500]} zoom={13} className="h-full w-full" scrollWheelZoom={true}>
                       <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                       <LocationMarker position={{ lat: Number(newMercado.latitud), lng: Number(newMercado.longitud) }} setPosition={(pos) => setNewMercado({...newMercado, latitud: pos.lat.toFixed(5), longitud: pos.lng.toFixed(5)})} />
                     </MapContainer>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500/70 border-b border-white/5 pb-2">2. Asignación y Acceso</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] text-zinc-400 uppercase mb-1">Distribuidor Pollo</label>
                       <select value={newMercado.distribuidor_pollo} onChange={e => setNewMercado({...newMercado, distribuidor_pollo: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none">
                         <option value="">Ninguno</option>
                         {provsPollo.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] text-zinc-400 uppercase mb-1">Distribuidor Res</label>
                       <select value={newMercado.distribuidor_res} onChange={e => setNewMercado({...newMercado, distribuidor_res: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none">
                         <option value="">Ninguno</option>
                         {provsRes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3 mt-4">
                     <p className="text-[10px] text-zinc-400 uppercase font-bold mb-2">Crear Usuario Administrador de la Tienda</p>
                     <div>
                       <label className="block text-[10px] text-zinc-500 uppercase mb-1">Correo Electrónico</label>
                       <input type="email" required value={newMercado.email} onChange={e => setNewMercado({...newMercado, email: e.target.value})} className="w-full bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-[10px] text-zinc-500 uppercase mb-1">Contraseña Inicial</label>
                       <input type="text" required value={newMercado.password} onChange={e => setNewMercado({...newMercado, password: e.target.value})} className="w-full bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                     </div>
                   </div>
                   <div className="flex justify-end pt-4">
                     <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg text-xs font-bold uppercase shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all w-full">Guardar Mercado</button>
                   </div>
                 </div>
               </form>
            </div>
          )}

          <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mercados.map(mercado => (
              <div key={mercado.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-bold text-lg text-white">{mercado.nombre}</h2>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full mt-1 inline-block">{mercado.tipo}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditClick(mercado)} className="p-2 text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteMercado(mercado.id, mercado.nombre)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-white/10">
                  <h3 className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Distribuidores Asignados</h3>
                  {editingMercadoId === mercado.id ? (
                    <div className="space-y-3 bg-black/50 p-3 rounded-lg border border-white/5">
                      <div>
                        <label className="block text-[9px] text-zinc-500 uppercase mb-1">Pollo</label>
                        <select value={editForm.distribuidor_pollo} onChange={e => setEditForm({...editForm, distribuidor_pollo: e.target.value})} className="w-full bg-black/80 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-emerald-500 outline-none">
                          <option value="">Ninguno</option>
                          {provsPollo.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-zinc-500 uppercase mb-1">Res</label>
                        <select value={editForm.distribuidor_res} onChange={e => setEditForm({...editForm, distribuidor_res: e.target.value})} className="w-full bg-black/80 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-emerald-500 outline-none">
                          <option value="">Ninguno</option>
                          {provsRes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button onClick={() => setEditingMercadoId(null)} className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded"><X className="w-3 h-3" /></button>
                        <button onClick={() => handleSaveEdit(mercado)} className="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/40 rounded"><Check className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {mercado.inventarios && mercado.inventarios.length > 0 ? (
                        <div className="space-y-1">
                          {mercado.inventarios.map((inv, idx) => (
                            <p key={idx} className="text-xs text-emerald-400">• {inv.proveedores?.nombre} <span className="text-zinc-500">({inv.proveedores?.tipo_producto})</span></p>
                          ))}
                        </div>
                      ) : <p className="text-xs text-zinc-500 italic">Ningún distribuidor asignado</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'distribuidores' && (
        <>
          <div className="max-w-6xl mx-auto mb-4 flex justify-end">
            <button onClick={() => setIsAddingProv(!isAddingProv)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-bold uppercase transition-colors">
              {isAddingProv ? 'Cancelar' : <><Plus className="w-4 h-4" /> Nuevo Distribuidor</>}
            </button>
          </div>

          {isAddingProv && (
            <div className="max-w-6xl mx-auto mb-8 bg-[#0a0a0a] border border-blue-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden animate-in slide-in-from-top-4">
               <h2 className="text-blue-400 font-bold mb-4 flex items-center gap-2"><Truck className="w-4 h-4" /> Registrar Nuevo Distribuidor</h2>
               <form onSubmit={handleAddProveedor} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500/70 border-b border-white/5 pb-2">1. Datos de la Empresa</h3>
                   <div>
                     <label className="block text-[10px] text-zinc-400 uppercase mb-1">Nombre de la Empresa</label>
                     <input type="text" required value={newProv.nombre} onChange={e => setNewProv({...newProv, nombre: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                   </div>
                   <div>
                     <label className="block text-[10px] text-zinc-400 uppercase mb-1">Especialidad de Producto</label>
                     <select value={newProv.tipo_producto} onChange={e => setNewProv({...newProv, tipo_producto: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none appearance-none">
                       <option value="Carne de Pollo">Carne de Pollo</option>
                       <option value="Carne de Res">Carne de Res</option>
                     </select>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500/70 border-b border-white/5 pb-2">2. Acceso al Sistema</h3>
                   <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
                     <p className="text-[10px] text-zinc-400 uppercase font-bold mb-2">Crear Usuario del Distribuidor</p>
                     <div>
                       <label className="block text-[10px] text-zinc-500 uppercase mb-1">Correo Electrónico</label>
                       <input type="email" required value={newProv.email} onChange={e => setNewProv({...newProv, email: e.target.value})} className="w-full bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-[10px] text-zinc-500 uppercase mb-1">Contraseña Inicial</label>
                       <input type="text" required value={newProv.password} onChange={e => setNewProv({...newProv, password: e.target.value})} className="w-full bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                     </div>
                   </div>
                   <div className="flex justify-end pt-4">
                     <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-xs font-bold uppercase shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all w-full">Guardar Distribuidor</button>
                   </div>
                 </div>
               </form>
            </div>
          )}

          <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {proveedores.map(prov => (
              <div key={prov.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-bold text-lg text-white">{prov.nombre}</h2>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full mt-1 inline-block">{prov.tipo_producto}</span>
                  </div>
                  <button onClick={() => handleDeleteProveedor(prov.id, prov.nombre)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
