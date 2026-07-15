import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { STATION_COORDS } from './api';

const getColor = (aqi) => {
  if (aqi <= 50) return '#00e400';
  if (aqi <= 100) return '#92d050';
  if (aqi <= 200) return '#ffff00';
  if (aqi <= 300) return '#ff7e00';
  if (aqi <= 400) return '#ff0000';
  return '#7e0023';
};

export default function StationMap({ stationsData, onSelectStation }) {
  return (
    <div className="map-container">
      <MapContainer center={[28.6139, 77.2090]} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {Object.entries(STATION_COORDS).map(([id, coords]) => {
          const aqi = stationsData?.[id] || 150;
          return (
            <CircleMarker
              key={id}
              center={coords}
              radius={12}
              fillColor={getColor(aqi)}
              fillOpacity={0.8}
              color="#0f1419"
              weight={2}
              eventHandlers={{ click: () => onSelectStation && onSelectStation(id) }}
            >
              <Popup>
                <b>{id}</b><br/>AQI: {Math.round(aqi)}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}