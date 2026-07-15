import { useState, useEffect } from 'react';
import { api, getSampleReading, DELHI_STATIONS } from './api';
import StationMap from './StationMap';
import './App.css';

const CATEGORY_COLORS = {
  Good: '#00e400', Satisfactory: '#92d050', Moderate: '#ffff00',
  Poor: '#ff7e00', 'Very Poor': '#ff0000', Severe: '#7e0023'
};

export default function App() {
  const [selectedStation, setSelectedStation] = useState('DL001');
  const [language, setLanguage] = useState('english');
  const [population, setPopulation] = useState('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [stationsAqi, setStationsAqi] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/multicity/overview').then(res => setCities(res.data.cities)).catch(() => {});
  }, []);

  const runPipeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const reading = getSampleReading(selectedStation);
      const payload = { ...reading, language, population_type: population, available_inspectors: 3 };
      const res = await api.post('/pipeline/analyze', payload);
      setResult(res.data);
      setStationsAqi(prev => ({ ...prev, [selectedStation]: res.data.forecast.predicted_aqi }));
    } catch (err) {
      setError('Could not reach backend. Make sure uvicorn is running on port 8000.');
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🌆 SmartCity AQI Intelligence</h1>
        <p>AI-Powered Urban Air Quality Intelligence for Delhi — PS5 ET AI Hackathon 2026</p>
      </div>

      <div className="controls">
        <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)}>
          {DELHI_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="english">English</option>
          <option value="hindi">Hindi</option>
          <option value="kannada">Kannada</option>
          <option value="tamil">Tamil</option>
        </select>

        <select value={population} onChange={e => setPopulation(e.target.value)}>
          <option value="general">General Public</option>
          <option value="elderly">Elderly</option>
          <option value="children">Children</option>
          <option value="outdoor_workers">Outdoor Workers</option>
        </select>

        <button className="primary" onClick={runPipeline} disabled={loading}>
          {loading ? 'Analyzing...' : '▶ Run Full Intelligence Pipeline'}
        </button>
      </div>

      {error && <div className="card" style={{borderColor: '#ff0000', color: '#ff7e7e'}}>{error}</div>}

      {result && (
        <>
          <div className="pipeline-time">
            <div style={{color: '#9ca3af', fontSize: 13}}>SIGNAL TO INTERVENTION RESPONSE TIME</div>
            <div className="big-number">{result.pipeline_summary.total_response_time_ms}ms</div>
            <div style={{color: '#9ca3af', fontSize: 13}}>4 AI agents chained · {result.pipeline_summary.steps_completed} steps completed</div>
          </div>

          <div className="grid">
            <div className="card">
              <h3>1. Forecasting Agent</h3>
              <div className="aqi-value" style={{color: CATEGORY_COLORS[result.forecast.category]}}>
                {result.forecast.predicted_aqi}
              </div>
              <span className="badge" style={{background: CATEGORY_COLORS[result.forecast.category], color: '#0f1419'}}>
                {result.forecast.category}
              </span>
              <div style={{marginTop: 12, fontSize: 12, color: '#9ca3af'}}>
                Model R² = {result.forecast.model_r2} · RMSE = {result.forecast.model_rmse}
              </div>
            </div>

            <div className="card">
              <h3>2. Source Attribution Agent</h3>
              <div style={{fontSize: 22, fontWeight: 600}}>{result.attribution.primary_source}</div>
              <div style={{color: '#4ade80', fontSize: 14, marginTop: 4}}>
                Confidence: {result.attribution.confidence}
              </div>
              <ul className="action-list">
                {result.attribution.all_sources.slice(0,3).map((s,i) => (
                  <li key={i}>{s.source} — {s.confidence}%</li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3>3. Enforcement Agent</h3>
              <div style={{fontSize: 22, fontWeight: 600, color: result.enforcement.urgency === 'IMMEDIATE' ? '#ff0000' : '#ffa500'}}>
                {result.enforcement.urgency} Priority
              </div>
              <div style={{fontSize: 13, color: '#9ca3af', marginTop: 4}}>
                Score: {result.enforcement.enforcement_score}/100
              </div>
              <ul className="action-list">
                {result.enforcement.recommended_actions.map((a,i) => <li key={i}>{a}</li>)}
              </ul>
            </div>

            <div className="card">
              <h3>4. Citizen Advisory Agent ({language})</h3>
              <div style={{fontSize: 16, fontWeight: 600}}>{result.advisory.headline}</div>
              <p style={{fontSize: 13, color: '#d1d5db', marginTop: 8}}>{result.advisory.health_advice}</p>
              <ul className="action-list">
                {result.advisory.recommended_actions.map((a,i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>

          <div className="card" style={{marginBottom: 24}}>
            <h3>⏱ Agent Response Timings</h3>
            {result.step_timings.map((s,i) => (
              <div className="timing-row" key={i}>
                <span>{s.step}</span>
                <span style={{color: '#4ade80'}}>{s.time_ms}ms</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card" style={{marginBottom: 24}}>
        <h3>📍 5. Geospatial Station Map — Delhi</h3>
        <StationMap stationsData={stationsAqi} onSelectStation={setSelectedStation} />
      </div>

      <div className="card">
        <h3>🏙 6. Multi-City Comparative Dashboard</h3>
        {cities.map((c, i) => (
          <div className="city-row" key={i}>
            <span>{c.city}</span>
            <span style={{color: CATEGORY_COLORS[c.category]}}>{c.avg_aqi_2024} AQI · {c.category}</span>
            <span style={{fontSize: 12, color: '#9ca3af'}}>{c.days_poor_or_worse} poor days/yr</span>
          </div>
        ))}
      </div>
    </div>
  );
}
