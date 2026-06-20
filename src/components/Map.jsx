import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para la capa de calor (leaflet.heat)
const HeatmapLayer = ({ data, producto }) => {
  const map = useMap();
  
  useEffect(() => {
    let heatPoints = [];
    
    data.forEach(mercado => {
      const info = mercado[producto];
      heatPoints.push([mercado.lat, mercado.lng, info.intensidad]);
      // Puntos difuminados para expandir el calor
      heatPoints.push([mercado.lat + 0.002, mercado.lng + 0.001, info.intensidad * 0.8]);
      heatPoints.push([mercado.lat - 0.001, mercado.lng - 0.002, info.intensidad * 0.8]);
    });

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 45,
      blur: 35,
      maxZoom: 14,
      max: 1.0,
      gradient: {
        0.2: '#84cc16', // Normal (Lima)
        0.5: '#eab308', // Poco (Amarillo)
        0.7: '#f97316', // Escaso (Naranja)
        1.0: '#dc2626'  // Agotado (Rojo)
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [data, producto, map]);

  return null;
};

// Componente para enrutamiento
const RoutingLayer = ({ userLocation, destination }) => {
  const map = useMap();

  useEffect(() => {
    if (!userLocation || !destination) return;

    const controlRuta = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      routeWhileDragging: false,
      show: false,
      createMarker: () => null, // Ocultar marcadores por defecto de la ruta
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 4, opacity: 0.7 }] // Ruta azul
      }
    }).addTo(map);

    const bounds = L.latLngBounds([
      [userLocation.lat, userLocation.lng],
      [destination.lat, destination.lng]
    ]);
    map.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      if (controlRuta) {
        map.removeControl(controlRuta);
      }
    };
  }, [userLocation, destination, map]);

  return null;
};

const Map = ({ producto, mapView, userLocation, destination, data = [], onSelectDestination }) => {
  // Centro de La Paz / El Alto
  const centerPosition = [-16.505, -68.160];
  const isHeatmap = mapView === 'heatmap';

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 z-10 relative">
      <MapContainer key={mapView} center={centerPosition} zoom={13} scrollWheelZoom={true} className="h-full w-full" zoomControl={false}>
        {/* Posicionar controles */}
        {/* <ZoomControl position="topright" /> */} {/* Lo omitimos, Leaflet lo pone por defecto arriba a la izquierda que también está bien */}

        <TileLayer
          attribution='&copy; OpenStreetMap'
          url={
            isHeatmap 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        
        {isHeatmap && <HeatmapLayer data={data} producto={producto} />}
        
        <RoutingLayer userLocation={userLocation} destination={destination} />

        {/* Marcador de usuario si existe */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{ fillColor: '#3b82f6', color: '#ffffff', weight: 3, fillOpacity: 1 }}
          >
            <Popup><b>Tu Ubicación</b></Popup>
          </CircleMarker>
        )}

        {/* Marcadores de mercados */}
        {data.map((mercado) => {
          const info = mercado[producto];
          if(!info) return null; // Si el producto no existe en la BD
          let colorClass = info.estado === 'Normal' ? '#84cc16' : (info.estado === 'Poco' ? '#eab308' : '#dc2626');
          
          return (
            <CircleMarker
              key={mercado.id}
              center={[mercado.lat, mercado.lng]}
              radius={8}
              pathOptions={{ fillColor: colorClass, color: '#ffffff', weight: 2, fillOpacity: 0.9 }}
            >
              <Popup className="custom-popup">
                <div className="p-1 text-slate-800">
                  <h3 className="font-bold text-lg mb-1">{mercado.nombre}</h3>
                  <p className="text-xs text-slate-500 mb-2 border-b border-slate-200 pb-2">Reporte ciudadano (hace 10 min)</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">Precio ({producto}):</span>
                    <span className="font-bold text-sm">Bs. {info.precio}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Estado:</span>
                    <span className="font-bold text-sm" style={{ color: colorClass }}>
                      {info.estado.toUpperCase()}
                    </span>
                  </div>
                  {onSelectDestination && (
                    <button 
                      onClick={() => onSelectDestination(mercado)}
                      className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors"
                    >
                      📍 Trazar ruta hacia aquí
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
