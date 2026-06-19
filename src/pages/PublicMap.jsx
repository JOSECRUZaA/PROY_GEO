import React, { useState, useMemo, useEffect } from 'react';
import Map from '../components/Map';
import { AlertTriangle, Map as MapIcon, Layers, Navigation, AlertCircle, LogIn } from 'lucide-react';
import { mercadosData as mockData } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

function PublicMap() {
  const [mapView, setMapView] = useState('heatmap'); // 'normal' o 'heatmap'
  const [producto, setProducto] = useState('pollo'); // 'pollo' o 'carne'
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  
  // Estado para la base de datos
  const [mercadosData, setMercadosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('SIMULACIÓN');

  // Fetch a Supabase
  useEffect(() => {
    async function fetchSupabaseData() {
      setLoading(true);
      try {
        const { data: puntos, error } = await supabase
          .from('puntos_venta')
          .select(`
            id, nombre, latitud, longitud, estado_aprobacion,
            inventarios (
              precio_actual, estado, nivel_calor,
              productos ( nombre )
            )
          `)
          .eq('estado_aprobacion', 'aprobado');

        if (error) throw error;

        if (puntos && puntos.length > 0) {
          const formattedData = puntos.map(p => {
            const obj = {
              id: p.id,
              nombre: p.nombre,
              lat: p.latitud,
              lng: p.longitud,
            };
            
            p.inventarios.forEach(inv => {
              if(!inv.productos) return;
              const prodName = inv.productos.nombre.toLowerCase(); 
              // Mapeo simple: si el nombre tiene "pollo" -> 'pollo', sino asume 'carne'
              const mapKey = prodName.includes('pollo') ? 'pollo' : 'carne';
              
              obj[mapKey] = {
                precio: Number(inv.precio_actual),
                estado: inv.estado,
                intensidad: Number(inv.nivel_calor)
              };
            });
            return obj;
          });
          setMercadosData(formattedData);
          setDataSource('SUPABASE (ONLINE)');
        } else {
          console.warn("La BD está vacía. Cargando datos simulados...");
          setMercadosData(mockData);
          setDataSource('MOCK DATA');
        }
      } catch (err) {
        console.error("Error al conectar con Supabase:", err.message);
        setMercadosData(mockData); // Fallback si fallan las credenciales
        setDataSource('MOCK DATA (OFFLINE)');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSupabaseData();
  }, []);

  // Cálculos dinámicos
  const stats = useMemo(() => {
    if (mercadosData.length === 0) return { precioPromedio: '0.00', puntosCriticos: 0 };
    
    let suma = 0;
    let criticos = 0;
    let items = 0;

    mercadosData.forEach(m => {
      const p = m[producto];
      if (p) {
        suma += p.precio;
        if (p.intensidad > 0.6) criticos++;
        items++;
      }
    });

    return {
      precioPromedio: items > 0 ? (suma / items).toFixed(2) : '0.00',
      puntosCriticos: criticos
    };
  }, [producto, mercadosData]);

  const encontrarRuta = () => {
    if (!("geolocation" in navigator)) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        let masCercano = null;
        let distMin = Infinity;

        mercadosData.forEach(mercado => {
          const info = mercado[producto];
          if (info && info.estado !== 'Agotado') {
            const dx = mercado.lat - userLat;
            const dy = mercado.lng - userLng;
            const dist = dx*dx + dy*dy;
            if (dist < distMin) {
              distMin = dist;
              masCercano = mercado;
            }
          }
        });

        if (masCercano) {
          setDestination({ lat: masCercano.lat, lng: masCercano.lng });
        } else {
          alert(`No se encontraron mercados con ${producto} disponibles en este momento.`);
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        alert("No se pudo obtener la ubicación. Simulemos una ubicación en El Alto.");
        setUserLocation({ lat: -16.510, lng: -68.180 }); 
        const fallbackDest = mercadosData.find(m => m[producto] && m[producto].estado !== 'Agotado');
        if (fallbackDest) setDestination({ lat: fallbackDest.lat, lng: fallbackDest.lng });
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="h-screen bg-[#050505] overflow-hidden flex flex-col font-sans relative text-zinc-100">
      
      {/* Contenedor Flotante Principal sobre el Mapa */}
      <div className="absolute inset-0 z-0">
        <Map 
          producto={producto} 
          mapView={mapView} 
          userLocation={userLocation} 
          destination={destination}
          data={mercadosData}
        />
      </div>

      {/* Interfaz Sobrepuesta */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col md:flex-row p-4 gap-4 h-full">
        
        {/* Panel Izquierdo (Modern Glassmorphism - 2026 Trend) */}
        <aside className="w-full md:w-[340px] h-full flex flex-col bg-[#0a0a0a]/70 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden relative">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>

          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">GeoCarnes LPZ</h1>
            </div>
            <p className="text-[11px] text-zinc-400">Plataforma Analítica de Abastecimiento Cárnico</p>
          </div>

          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
            
            {/* Filtros */}
            <h2 className="text-[10px] font-bold uppercase text-zinc-500 mb-3 tracking-widest">Dataset Analysis</h2>
            <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-xl border border-white/5">
              <button 
                onClick={() => setProducto('pollo')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                  producto === 'pollo' 
                    ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] border border-rose-400/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Pollo
              </button>
              <button 
                onClick={() => setProducto('carne')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                  producto === 'carne' 
                    ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] border border-rose-400/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Res
              </button>
            </div>

            {/* Estadísticas */}
            <div className="space-y-3 mb-6">
              <div className="p-4 bg-gradient-to-br from-white/5 to-transparent rounded-xl border border-white/10 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                <p className="text-[11px] text-zinc-400 mb-1 relative z-10">Cotización Promedio Regional</p>
                <p className="text-2xl font-bold text-white flex items-baseline gap-1 relative z-10">
                  <span className="text-blue-400">Bs.</span> {stats.precioPromedio} <span className="text-[11px] font-medium text-zinc-500">/ Kg</span>
                </p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-rose-500/5 to-transparent rounded-xl border border-rose-500/10 flex justify-between items-center relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-rose-500/10 blur-xl rounded-full"></div>
                <div className="relative z-10">
                  <p className="text-[11px] text-zinc-400 mb-1">Puntos de Alerta Crítica</p>
                  <p className="text-lg font-bold text-rose-400">{stats.puntosCriticos} zonas detectadas</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center relative z-10">
                  <AlertCircle className="w-5 h-5 text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]" />
                </div>
              </div>
            </div>

            {/* Selector de Vistas */}
            <h2 className="text-[10px] font-bold uppercase text-zinc-500 mb-3 tracking-widest">Motor de Renderizado</h2>
            <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setMapView('normal')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  mapView === 'normal' 
                    ? 'bg-zinc-800 text-white shadow-md border border-white/10' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Vectorial
              </button>
              <button
                onClick={() => setMapView('heatmap')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  mapView === 'heatmap' 
                    ? 'bg-zinc-800 text-white shadow-md border border-white/10' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Calor (Heat)
              </button>
            </div>

            {/* Leyenda de Calor */}
            <h2 className="text-[10px] font-bold uppercase text-zinc-500 mb-3 tracking-widest">Simbología</h2>
            <div className="space-y-3 text-xs p-4 bg-black/40 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
                <span className="text-zinc-300 font-medium">Crítico / Agotado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                <span className="text-zinc-300 font-medium">Escaso / Especulación</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"></div>
                <span className="text-zinc-300 font-medium">Poco stock disponible</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-zinc-300 font-medium">Abastecimiento Normal</span>
              </div>
            </div>

          </div>
          
          {/* Footer Actions */}
          <div className="p-4 border-t border-white/5 bg-black/40 flex flex-col gap-2">
            <button 
              onClick={encontrarRuta}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 flex items-center justify-center gap-2 group"
            >
              <Navigation className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              Generar Ruta a Mercado
            </button>
          </div>
        </aside>

        {/* Floating Header Right */}
        <div className="hidden md:flex ml-auto pointer-events-auto self-start mt-2 gap-3">
           <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-2xl">
             <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${
               dataSource.includes('ONLINE') ? 'bg-emerald-500 text-emerald-500' : 'bg-amber-500 text-amber-500'
             }`}></span>
             <span className="text-zinc-300 text-xs font-medium tracking-wide">
                {loading ? 'CONECTANDO...' : `SYSTEM: ${dataSource}`}
             </span>
           </div>
           
           <Link to="/login" className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-500/20 shadow-2xl transition-colors">
              <LogIn className="w-3 h-3 text-rose-400" />
              <span className="text-rose-400 text-xs font-medium tracking-wide uppercase">Admin</span>
           </Link>
        </div>

      </div>
    </div>
  );
}

export default PublicMap;
