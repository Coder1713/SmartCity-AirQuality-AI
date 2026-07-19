import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const getColor = (aqi) => {
  if (aqi <= 50) return '#00e400';
  if (aqi <= 100) return '#92d050';
  if (aqi <= 200) return '#ffff00';
  if (aqi <= 300) return '#ff7e00';
  if (aqi <= 400) return '#ff0000';
  return '#7e0023';
};

export default function StationMap({ stations, selectedStation, onSelectStation }) {
  return (
    <div className="map-container">
      <MapContainer center={[28.6139, 77.2090]} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {(stations || []).map((s) => (
          <CircleMarker
            key={s.station_id}
            center={[s.latitude, s.longitude]}
            radius={s.station_id === selectedStation ? 15 : 11}
            fillColor={getColor(s.current_aqi)}
            fillOpacity={s.station_id === selectedStation ? 1 : 0.75}
            color={s.station_id === selectedStation ? '#e8a33d' : '#0f1419'}
            weight={s.station_id === selectedStation ? 3 : 2}
            eventHandlers={{ click: () => onSelectStation && onSelectStation(s.station_id) }}
          >
            <Popup>
              <b>{s.station_id}</b>, {s.name}<br/>
              AQI: {Math.round(s.current_aqi)} ({s.category})<br/>
              <span style={{fontSize: 11}}>Dataset latest observation</span>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}