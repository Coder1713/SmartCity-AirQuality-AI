import { useState, useEffect } from 'react';
import ExplainableAI from './ExplainableAI';
import AIInterventionSimulator from './AIInterventionSimulator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, getSampleReading, DELHI_STATIONS } from './api';
import StationMap from './StationMap';
import CommandStrip from './HeroSection';
import './App.css';

const CATEGORY_COLORS = {
  Good: '#4ade80', Satisfactory: '#a3d977', Moderate: '#e8a33d',
  Poor: '#e8743d', 'Very Poor': '#e04545', Severe: '#a12842'
};

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'explainable-ai', label: 'Explainable AI' },
  { id: 'intervention-simulator', label: 'Simulator' },
  { id: 'attribution', label: 'Source Attribution' },
  { id: 'enforcement', label: 'Enforcement' },
  { id: 'advisory', label: 'Citizen Advisory' },
  { id: 'multicity', label: 'Multi-City' },
];

export default function App() {
  const [selectedStation, setSelectedStation] = useState('DL001');
  const [language, setLanguage] = useState('english');
  const [population, setPopulation] = useState('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [stationsAqi, setStationsAqi] = useState({});
  const [error, setError] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [stationsOverview, setStationsOverview] = useState([]);
  const [selectedStationDetail, setSelectedStationDetail] = useState(null);
  const [stationsUnavailable, setStationsUnavailable] = useState(false);

  useEffect(() => {
    api.get('/multicity/overview').then(res => setCities(res.data.cities)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/stations/overview')
      .then(res => setStationsOverview(res.data.stations))
      .catch(() => setStationsUnavailable(true));
  }, []);

  useEffect(() => {
    api.get(`/stations/${selectedStation}`)
      .then(res => setSelectedStationDetail(res.data))
      .catch(() => setSelectedStationDetail(null));
  }, [selectedStation]);

  const loadTrend = async (stationId) => {
    setTrendLoading(true);
    try {
      const [historyRes, forecastRes] = await Promise.all([
        api.get(`/trend/history/${stationId}?hours=72`),
        api.get(`/trend/forecast-curve/${stationId}`)
      ]);
      const history = historyRes.data.points.map(p => ({
        time: new Date(p.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit' }),
        actual: p.aqi,
        forecast: null
      }));
      const forecast = forecastRes.data.points.map((p, i) => ({
        time: new Date(p.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit' }),
        actual: i === 0 && history.length ? history[history.length - 1].actual : null,
        forecast: p.aqi
      }));
      setTrendData([...history, ...forecast]);
    } catch (err) {
      setTrendData([]);
    }
    setTrendLoading(false);
  };

  useEffect(() => {
    loadTrend(selectedStation);
  }, [selectedStation]);

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

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const priorityToUrgencyClass = (priority) => {
    if (priority === 'Immediate') return 'IMMEDIATE';
    if (priority === 'Within 6 hours') return 'HIGH';
    if (priority === 'Within 24 hours') return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-brand">SmartCity AQI</div>
        {SECTIONS.map(s => (
          <a key={s.id} className={`sidebar-link ${activeSection === s.id ? 'active' : ''}`} onClick={() => scrollTo(s.id)}>
            {s.label}
          </a>
        ))}
      </div>

      <div className="main">
        <div id="overview">
          <CommandStrip result={result} cities={cities} loading={loading} />
        </div>

        <div className="control-bar">
          <div className="control-field">
            <label>Station</label>
            <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)}>
              {DELHI_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="control-field">
            <label>Advisory Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="kannada">Kannada</option>
              <option value="tamil">Tamil</option>
            </select>
          </div>
          <div className="control-field">
            <label>Target Population</label>
            <select value={population} onChange={e => setPopulation(e.target.value)}>
              <option value="general">General Public</option>
              <option value="elderly">Elderly</option>
              <option value="children">Children</option>
              <option value="outdoor_workers">Outdoor Workers</option>
            </select>
          </div>
          <button className="run-btn" onClick={runPipeline} disabled={loading}>
            {loading ? 'Analyzing' : 'Run Intelligence Pipeline'}
          </button>
        </div>

        {error && <div className="card" style={{borderColor: '#e04545', color: '#e04545', marginBottom: 24}}>{error}</div>}

        <div id="forecast">
          <div className="page-title">Forecast Intelligence</div>
          <div className="page-subtitle">Station {selectedStation}, 72 hour history and 72 hour projection</div>
          <div className="card" style={{marginBottom: 24}}>
            <div className="chart-header">
              <div className="chart-legend">
                <span><span className="legend-dot" style={{background: '#8b92a8'}}></span>Actual (past)</span>
                <span><span className="legend-dot" style={{background: '#e8a33d'}}></span>Forecast (next 72h)</span>
              </div>
            </div>
            {trendLoading ? (
              <div className="loading">Loading history and forecast</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3448" />
                  <XAxis dataKey="time" stroke="#8b92a8" fontSize={10} interval={23} />
                  <YAxis stroke="#8b92a8" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3448', fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#f3f4f6' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#c5cbd6' }} />
                  <Line type="monotone" dataKey="actual" stroke="#8b92a8" strokeWidth={2} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="#e8a33d" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <ExplainableAI result={result} />

        <AIInterventionSimulator
          currentAqi={result?.forecast?.predicted_aqi}
          currentCategory={result?.forecast?.category}
        />

        {result && (
          <>
            <div className="page-title">Intelligence Pipeline</div>
            <div className="page-subtitle">Signal to intervention in {result.pipeline_summary.total_response_time_ms}ms across 4 chained agents</div>

            <div className="workflow">
              <div className="workflow-stage">
                <div className="stage-num">01 Forecast</div>
                <div className="stage-title">Predicted AQI</div>
                <div className="stage-result" style={{color: CATEGORY_COLORS[result.forecast.category]}}>{result.forecast.predicted_aqi}</div>
                <div className="stage-detail">{result.forecast.category}</div>
                <div className="stage-timing">R2 {result.forecast.model_r2} · {result.step_timings[0].time_ms}ms</div>
              </div>
              <div className="workflow-stage">
                <div className="stage-num">02 Attribution</div>
                <div className="stage-title">Primary Source</div>
                <div className="stage-result" style={{fontSize: 18}}>{result.attribution.primary_source}</div>
                <div className="stage-detail">{result.attribution.confidence} confidence</div>
                <div className="stage-timing">{result.step_timings[1].time_ms}ms</div>
              </div>
              <div className="workflow-stage">
                <div className="stage-num">03 Enforcement</div>
                <div className="stage-title">Severity</div>
                <div className="stage-result" style={{fontSize: 18, textTransform: 'capitalize'}}>{result.enforcement.severity}</div>
                <div className="stage-detail">{result.enforcement.actions.length} actions recommended</div>
                <div className="stage-timing">{result.step_timings[2].time_ms}ms</div>
              </div>
              <div className="workflow-stage">
                <div className="stage-num">04 Advisory</div>
                <div className="stage-title">{language}, {population.replace('_',' ')}</div>
                <div className="stage-detail" style={{fontSize: 13, color: 'var(--text)'}}>{result.advisory.headline}</div>
                <div className="stage-timing">{result.step_timings[3].time_ms}ms</div>
              </div>
            </div>

            <div id="attribution">
              <div className="page-title">Pollution Source Analysis & Field Response Plan</div>
              <div className="split-row" id="enforcement">
                <div className="card">
                  <h3 style={{fontSize: 14, marginBottom: 4}}>{result.attribution.primary_source}</h3>
                  <div className="confidence-bar-track">
                    <div className="confidence-bar-fill" style={{width: result.attribution.confidence}}></div>
                  </div>
                  <div style={{fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 12}}>{result.attribution.confidence} confidence</div>
                  {result.attribution.all_sources.map((s,i) => (
                    <div className="source-row" key={i}>
                      <span>{s.source}</span>
                      <span style={{color: 'var(--amber)'}}>{s.confidence}%</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div style={{fontSize: 13, color: 'var(--text-dim)', marginBottom: 8}}>{result.enforcement.summary}</div>
                  {result.enforcement.actions.map((a) => (
                    <div key={a.id} style={{marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <span style={{fontWeight: 600, fontSize: 13}}>{a.title}</span>
                        <span className={`urgency-badge urgency-${priorityToUrgencyClass(a.priority)}`}>{a.priority}</span>
                      </div>
                      <div className="evidence-meta" style={{marginTop: 4}}>Owner: {a.owner}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div id="advisory">
              <div className="page-title">Public Health Guidance</div>
              <div className="card" style={{marginBottom: 24}}>
                <div className="advisory-tags">
                  <span className="advisory-tag">{result.advisory.risk_level} risk</span>
                  <span className="advisory-tag">{language}</span>
                </div>
                <p style={{fontSize: 13, color: 'var(--text-dim)', marginBottom: 14}}>{result.advisory.summary}</p>
                <div style={{marginBottom: 12}}>
                  <div className="evidence-factor" style={{marginBottom: 4}}>General public</div>
                  <ul className="action-list">{result.advisory.general_public.map((a,i) => <li key={i}>{a}</li>)}</ul>
                </div>
                <div style={{marginBottom: 12}}>
                  <div className="evidence-factor" style={{marginBottom: 4}}>Sensitive groups</div>
                  <ul className="action-list">{result.advisory.sensitive_groups.map((a,i) => <li key={i}>{a}</li>)}</ul>
                </div>
                <div style={{marginBottom: 12}}>
                  <div className="evidence-factor" style={{marginBottom: 4}}>Schools</div>
                  <ul className="action-list">{result.advisory.schools.map((a,i) => <li key={i}>{a}</li>)}</ul>
                </div>
                <div>
                  <div className="evidence-factor" style={{marginBottom: 4}}>Outdoor workers</div>
                  <ul className="action-list">{result.advisory.outdoor_workers.map((a,i) => <li key={i}>{a}</li>)}</ul>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="page-title">Station Operations Map</div>
        <div className="page-subtitle">Dataset latest observations, select a station for details</div>
        {stationsUnavailable && <div className="evidence-meta" style={{marginBottom: 8}}>Station data temporarily unavailable</div>}
        <div className="split-row-map" style={{marginBottom: 24}}>
          <div className="card" style={{padding: 0}}>
            <StationMap stations={stationsOverview} selectedStation={selectedStation} onSelectStation={setSelectedStation} />
          </div>
          <div className="card station-detail-panel">
            <div className="command-strip-label">Selected Station</div>
            <div className="command-strip-value" style={{fontSize: 20, marginBottom: 2}}>{selectedStation}</div>
            {selectedStationDetail?.name && <div className="evidence-meta" style={{marginBottom: 10}}>{selectedStationDetail.name}</div>}
            {selectedStationDetail?.current ? (
              <>
                <div className="feasibility-row"><span>Current AQI</span><span>{Math.round(selectedStationDetail.current.aqi)}</span></div>
                <div className="feasibility-row"><span>Category</span><span>{selectedStationDetail.current.category}</span></div>
                <div className="feasibility-row"><span>Data type</span><span>Dataset latest</span></div>
                <div className="feasibility-row"><span>Trend</span><span>{selectedStationDetail.trend ?? '—'}</span></div>
                {result && result.station_id === selectedStation && (
                  <div className="feasibility-row"><span>Forecast AQI</span><span>{Math.round(result.forecast.predicted_aqi)}</span></div>
                )}
              </>
            ) : <div className="evidence-meta">Station detail unavailable</div>}
            <div className="map-legend" style={{marginTop: 16, flexDirection: 'column', gap: 8}}>
              <span><span className="map-legend-dot" style={{background: '#00e400'}}></span>Good</span>
              <span><span className="map-legend-dot" style={{background: '#ffff00'}}></span>Moderate</span>
              <span><span className="map-legend-dot" style={{background: '#ff7e00'}}></span>Poor</span>
              <span><span className="map-legend-dot" style={{background: '#7e0023'}}></span>Severe</span>
            </div>
          </div>
        </div>

        <div id="multicity">
          <div className="page-title">Regional Comparison</div>
          <div className="evidence-meta" style={{marginBottom: 8}}>CPCB National Air Quality Reports, average AQI (2024)</div>
          <div className="card">
            <table className="compare-table">
              <thead>
                <tr><th>Rank</th><th>City</th><th>Average AQI (2024)</th><th>Category</th><th>Poor Days/Yr</th></tr>
              </thead>
              <tbody>
                {cities.length === 0 ? (
                  <tr><td colSpan={5} className="evidence-meta">No regional data available</td></tr>
                ) : cities.map((c, i) => (
                  <tr key={i}>
                    <td>{c.rank ?? i + 1}</td>
                    <td>{c.city}</td>
                    <td style={{color: CATEGORY_COLORS[c.category]}}>{c.avg_aqi_2024}</td>
                    <td>{c.category}</td>
                    <td>{c.days_poor_or_worse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}