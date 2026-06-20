import React, { useState, useMemo, useEffect } from 'react';
import Map from '../components/Map';
import { AlertTriangle, Map as MapIcon, Layers, Navigation, AlertCircle, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import { mercadosData as mockData } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

function PublicMap() {
  const [mapView, setMapView] = useState('heatmap'); 
  const [producto, setProducto] = useState('pollo'); 
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  
  const [mercadosData, setMercadosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('SIMULACIÓN');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false); // Para el Samsung A56

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
            const obj = { id: p.id, nombre: p.nombre, lat: p.latitud, lng: p.longitud };
            p.inventarios.forEach(inv => {
              if(!inv.productos) return;
              const prodName = inv.productos.nombre.toLowerCase(); 
              const mapKey = prodName.includes('pollo') ? 'pollo' : 'carne';
              obj[mapKey] = { precio: Number(inv.precio_actual), estado: inv.estado, intensidad: Number(inv.nivel_calor) };
            });
            return obj;
          });
          setMercadosData(formattedData);
          setDataSource('SUPABASE');
        } else {
          setMercadosData(mockData);
          setDataSource('MOCK DATA');
        }
      } catch (err) {
        setMercadosData(mockData); 
        setDataSource('MOCK DATA');
      } finally {
        setLoading(false);
      }
    }
    fetchSupabaseData();
  }, []);

  const stats = useMemo(() => {
    if (mercadosData.length === 0) return { precioPromedio: '0.00', puntosCriticos: 0 };
    let suma = 0, criticos = 0, items = 0;
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

  const encontrarRutaHacia = (mercado) => {
    if (!("geolocation" in navigator)) return alert("Tu navegador no soporta geolocalización.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setDestination({ lat: mercado.lat, lng: mercado.lng });
        setIsMobilePanelOpen(false);
      },
      (error) => {
        alert("Simulemos una ubicación en El Alto por falta de GPS.");
        setUserLocation({ lat: -16.510, lng: -68.180 }); 
        setDestination({ lat: mercado.lat, lng: mercado.lng });
        setIsMobilePanelOpen(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const encontrarRuta = () => {
    if (!("geolocation" in navigator)) return alert("Tu navegador no soporta geolocalización.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });
        let masCercano = null, distMin = Infinity;
        mercadosData.forEach(mercado => {
          const info = mercado[producto];
          if (info && info.estado !== 'Agotado') {
            const dist = Math.pow(mercado.lat - userLat, 2) + Math.pow(mercado.lng - userLng, 2);
            if (dist < distMin) { distMin = dist; masCercano = mercado; }
          }
        });
        if (masCercano) setDestination({ lat: masCercano.lat, lng: masCercano.lng });
        else alert(`No se encontraron mercados con ${producto} disponibles.`);
      },
      (error) => {
        alert("Simulemos una ubicación en El Alto por falta de GPS.");
        setUserLocation({ lat: -16.510, lng: -68.180 }); 
        const fallbackDest = mercadosData.find(m => m[producto] && m[producto].estado !== 'Agotado');
        if (fallbackDest) setDestination({ lat: fallbackDest.lat, lng: fallbackDest.lng });
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="h-[100dvh] w-full bg-[#050505] overflow-hidden flex flex-col font-sans relative text-zinc-100">
      
      {/* Mapa de Fondo (Abarca toda la pantalla en móvil) */}
      <div className="absolute inset-0 z-0">
        <Map 
          producto={producto} 
          mapView={mapView} 
          userLocation={userLocation} 
          destination={destination} 
          data={mercadosData} 
          onSelectDestination={encontrarRutaHacia}
        />
      </div>

      {/* Indicadores Superiores Flotantes (Visibles en Móvil y Desktop) */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
          <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${dataSource === 'SUPABASE' ? 'bg-emerald-500 text-emerald-500' : 'bg-amber-500 text-amber-500'}`}></span>
          <span className="text-zinc-300 text-[10px] sm:text-xs font-bold tracking-wide">
            {loading ? 'CONECTANDO' : dataSource}
          </span>
        </div>
        <Link to="/login" className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-rose-500/20 shadow-lg transition-colors">
          <LogIn className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-rose-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Admin</span>
        </Link>
      </div>

      {/* Panel Inferior en Móvil / Panel Izquierdo en Desktop */}
      <div className={`absolute bottom-0 left-0 w-full z-20 pointer-events-none flex flex-col justify-end p-2 sm:p-4 md:static md:h-full md:w-[360px] md:flex-row transition-all duration-500 ${isMobilePanelOpen ? 'h-[85dvh]' : 'h-auto'}`}>
        
        {/* Contenedor Glassmorphism del Panel */}
        <aside className="w-full h-full flex flex-col bg-[#0a0a0a]/85 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden relative transition-all duration-300">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>

          {/* Cabecera del Panel (Actúa como botón en móvil para abrir/cerrar) */}
          <div 
            className="p-4 sm:p-5 border-b border-white/5 cursor-pointer md:cursor-default active:bg-white/5 md:active:bg-transparent transition-colors flex items-center justify-between"
            onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md">GeoCarnes LPZ</h1>
                <p className="text-[10px] sm:text-[11px] text-zinc-400">Plataforma Analítica</p>
              </div>
            </div>
            {/* Ícono de flecha solo visible en móvil */}
            <div className="md:hidden text-zinc-500">
              {isMobilePanelOpen ? <ChevronDown /> : <ChevronUp />}
            </div>
          </div>

          {/* Contenido scrolleable (Oculto en móvil si está colapsado) */}
          <div className={`p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar ${isMobilePanelOpen ? 'block' : 'hidden md:block'}`}>
            
            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/5">
              <button onClick={() => setProducto('pollo')} className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${producto === 'pollo' ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg border border-rose-400/50' : 'text-zinc-400'}`}>Pollo</button>
              <button onClick={() => setProducto('carne')} className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${producto === 'carne' ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg border border-rose-400/50' : 'text-zinc-400'}`}>Res</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 mb-6">
              <div className="p-4 bg-gradient-to-br from-white/5 to-transparent rounded-xl border border-white/10 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                <p className="text-[10px] text-zinc-400 mb-1">Precio Promedio</p>
                <p className="text-lg sm:text-2xl font-bold text-white relative z-10"><span className="text-blue-400 text-sm">Bs.</span>{stats.precioPromedio}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-rose-500/5 to-transparent rounded-xl border border-rose-500/10 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-rose-500/10 blur-xl rounded-full"></div>
                <p className="text-[10px] text-zinc-400 mb-1">Alerta Crítica</p>
                <p className="text-base sm:text-lg font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-rose-500" /> {stats.puntosCriticos} zonas
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl border border-white/5">
              <button onClick={() => setMapView('normal')} className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${mapView === 'normal' ? 'bg-zinc-800 text-white shadow-md border border-white/10' : 'text-zinc-400'}`}><MapIcon className="w-3.5 h-3.5" /> Normal</button>
              <button onClick={() => setMapView('heatmap')} className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${mapView === 'heatmap' ? 'bg-zinc-800 text-white shadow-md border border-white/10' : 'text-zinc-400'}`}><Layers className="w-3.5 h-3.5" /> Calor</button>
            </div>

            <div className="space-y-2 text-[10px] sm:text-xs p-3 sm:p-4 bg-black/40 rounded-xl border border-white/5">
              <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg"></div><span className="text-zinc-300 font-medium">Agotado</span></div>
              <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-lg"></div><span className="text-zinc-300 font-medium">Escaso</span></div>
              <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg"></div><span className="text-zinc-300 font-medium">Poco stock</span></div>
              <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg"></div><span className="text-zinc-300 font-medium">Normal</span></div>
            </div>

          </div>
          
          <div className="p-3 sm:p-4 border-t border-white/5 bg-black/40">
            <button onClick={encontrarRuta} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 sm:py-3.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" /> Ruta
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default PublicMap;
