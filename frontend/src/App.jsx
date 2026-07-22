import { useState, useEffect, useRef } from 'react';
import RevealOnScroll from './RevealOnScroll';
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

const ICONS = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  forecast: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17l6-6 4 4 8-8"/></svg>,
  'explainable-ai': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>,
  'intervention-simulator': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 21v-7M4 10V3M12 21v-11M12 6V3M20 21v-5M20 12V3"/><path d="M2 14h4M8 8h8M18 16h4"/></svg>,
  attribution: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>,
  enforcement: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>,
  advisory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21c-4-3-8-6-8-11a8 8 0 0116 0c0 5-4 8-8 11z"/><path d="M12 8v5"/></svg>,
  multicity: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M6 21V8l6-4 6 4v13M9 21v-6h6v6"/></svg>,
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
  const glowRef = useRef(null);
  const mainRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.innerWidth >= 768;
    if (prefersReduced || !isDesktop) return;

    let raf = null;
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let ticking = false;

    const handleMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!ticking) { ticking = true; raf = requestAnimationFrame(tick); }

      const card = e.target.closest('.card, .kpi-tile, .workflow-stage');
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      }
    };

    const tick = () => {
      curX += (targetX - curX) * 0.15;
      curY += (targetY - curY) * 0.15;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${curX}px, ${curY}px) translate(-50%, -50%)`;
        glowRef.current.classList.add('active');
      }
      const dx = (curX - window.innerWidth / 2) / window.innerWidth;
      const dy = (curY - window.innerHeight / 2) / window.innerHeight;
      document.documentElement.style.setProperty('--glow-x', `${dx * 8}px`);
      document.documentElement.style.setProperty('--glow-y', `${dy * 8}px`);
      document.documentElement.style.setProperty('--flow-x', `${dx * 4}px`);
      document.documentElement.style.setProperty('--flow-y', `${dy * 4}px`);
      ticking = false;
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
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
            <span className="sidebar-icon">{ICONS[s.id]}</span>
            {s.label}
          </a>
        ))}
      </div>

      <div className="main" ref={mainRef}>
        <div className="cursor-glow" ref={glowRef}></div>
        <div id="overview">
          <CommandStrip result={result} cities={cities} loading={loading} onRunPipeline={runPipeline} />
        </div>

        <div className="control-bar">
          <div className="control-field">
            <label>Station</label>
            <select value={selectedStation} onChange={e => { setSelectedStation(e.target.value); setResult(null); }}>
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

        {error && (
          <div className="card" style={{ borderColor: '#e04545', color: '#e04545', marginBottom: 24 }}>
            {error}
          </div>
        )}

        <RevealOnScroll>
          <div id="forecast">
            <div className="page-title">Forecast Intelligence</div>
            <div className="page-subtitle">Station {selectedStation}, 72 hour history and 72 hour projection</div>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="chart-header">
                <div className="chart-legend">
                  <span><span className="legend-dot" style={{ background: '#8b92a8' }}></span>Actual (past)</span>
                  <span><span className="legend-dot" style={{ background: '#e8a33d' }}></span>Forecast (next 72h)</span>
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
                    <Tooltip
                      contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3448', fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#f3f4f6' }}
                      labelStyle={{ color: '#f3f4f6' }}
                      itemStyle={{ color: '#c5cbd6' }}
                    />
                    <Line type="monotone" dataKey="actual" stroke="#8b92a8" strokeWidth={2} dot={false} name="Actual" />
                    <Line type="monotone" dataKey="forecast" stroke="#e8a33d" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Forecast" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </RevealOnScroll>

        <ExplainableAI result={result} />

        <AIInterventionSimulator
          currentAqi={result?.forecast?.predicted_aqi}
          currentCategory={result?.forecast?.category}
        />

        {result && (
          <>
            <div className="page-title">Intelligence Pipeline</div>
            <div className="page-subtitle">
              Signal to intervention in {result.pipeline_summary.total_response_time_ms}ms across 4 chained agents
            </div>

            <div className="workflow" data-aqi-category={result.forecast.category}>
              <div className="workflow-stage sequenced">
                <div className="stage-num">01 Forecast</div>
                <div className="stage-title">Predicted AQI</div>
                <div className="stage-result" style={{ color: CATEGORY_COLORS[result.forecast.category] }}>
                  {result.forecast.predicted_aqi}
                </div>
                <div className="stage-detail">{result.forecast.category}</div>
                <div className="stage-timing">R2 {result.forecast.model_r2} · {result.step_timings[0].time_ms}ms</div>
              </div>

              <div className="workflow-stage sequenced">
                <div className="stage-num">02 Attribution</div>
                <div className="stage-title">Primary Source</div>
                <div className="stage-result" style={{ fontSize: 18 }}>{result.attribution.primary_source}</div>
                <div className="stage-detail">{result.attribution.confidence} confidence</div>
                <div className="stage-timing">{result.step_timings[1].time_ms}ms</div>
              </div>

              <div className="workflow-stage sequenced">
                <div className="stage-num">03 Enforcement</div>
                <div className="stage-title">Severity</div>
                <div className="stage-result" style={{ fontSize: 18, textTransform: 'capitalize' }}>
                  {result.enforcement.severity}
                </div>
                <div className="stage-detail">{result.enforcement.actions.length} actions recommended</div>
                <div className="stage-timing">{result.step_timings[2].time_ms}ms</div>
              </div>

              <div className="workflow-stage sequenced">
                <div className="stage-num">04 Advisory</div>
                <div className="stage-title">{language}, {population.replace('_', ' ')}</div>
                <div className="stage-detail" style={{ fontSize: 13, color: 'var(--text)' }}>
                  {result.advisory.headline}
                </div>
                <div className="stage-timing">{result.step_timings[3].time_ms}ms</div>
              </div>
            </div>

            <RevealOnScroll>
              <div id="attribution">
                <div className="page-title">Pollution Source Analysis &amp; Field Response Plan</div>
                <div className="split-row" id="enforcement">
                  <div className="card">
                    <h3 style={{ fontSize: 14, marginBottom: 4 }}>{result.attribution.primary_source}</h3>
                    <div className="contribution-track">
                      <div className="contribution-fill" style={{ width: result.attribution.confidence }}></div>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', margin: '8px 0 12px' }}>
                      {result.attribution.confidence} confidence
                    </div>
                    {result.attribution.all_sources.map((s, i) => (
                      <div className="feasibility-row" key={i}>
                        <span>{s.source}</span>
                        <span style={{ color: 'var(--coral-dim)' }}>{s.confidence}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {result.enforcement.summary}
                    </div>
                    {result.enforcement.actions.map((a) => (
                      <div key={a.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</span>
                          <span className={`urgency-badge urgency-${priorityToUrgencyClass(a.priority)}`}>{a.priority}</span>
                        </div>
                        <div className="evidence-meta" style={{ marginTop: 4 }}>Owner: {a.owner}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll>
              <div id="advisory">
                <div className="page-title">Public Health Guidance</div>
                <div className="card" style={{ marginBottom: 24 }}>
                  <div className="advisory-tags">
                    <span className="advisory-tag">{result.advisory.risk_level} risk</span>
                    <span className="advisory-tag">{language}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    {result.advisory.summary}
                  </p>
                  <div style={{ marginBottom: 12 }}>
                    <div className="evidence-factor" style={{ marginBottom: 4 }}>General public</div>
                    <ul className="action-list">
                      {result.advisory.general_public.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div className="evidence-factor" style={{ marginBottom: 4 }}>Sensitive groups</div>
                    <ul className="action-list">
                      {result.advisory.sensitive_groups.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div className="evidence-factor" style={{ marginBottom: 4 }}>Schools</div>
                    <ul className="action-list">
                      {result.advisory.schools.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="evidence-factor" style={{ marginBottom: 4 }}>Outdoor workers</div>
                    <ul className="action-list">
                      {result.advisory.outdoor_workers.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </>
        )}

        <RevealOnScroll>
          <div id="map">
            <div className="page-title">Station Operations Map</div>
            <div className="page-subtitle">Dataset latest observations, select a station for details</div>
            {stationsUnavailable && (
              <div className="evidence-meta" style={{ marginBottom: 8 }}>Station data temporarily unavailable</div>
            )}
            <div className="split-row-map" style={{ marginBottom: 24 }}>
              <div className="card" style={{ padding: 0 }}>
                <StationMap stations={stationsOverview} selectedStation={selectedStation} onSelectStation={setSelectedStation} />
              </div>
              <div className="card station-detail-panel">
                <div className="command-strip-label">Selected Station</div>
                <div className="command-strip-value" style={{ fontSize: 20, marginBottom: 2 }}>{selectedStation}</div>
                {selectedStationDetail?.name && (
                  <div className="evidence-meta" style={{ marginBottom: 10 }}>{selectedStationDetail.name}</div>
                )}
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
                ) : (
                  <div className="evidence-meta">Station detail unavailable</div>
                )}
                <div className="map-legend" style={{ marginTop: 16, flexDirection: 'column', gap: 8 }}>
                  <span><span className="map-legend-dot" style={{ background: '#00e400' }}></span>Good</span>
                  <span><span className="map-legend-dot" style={{ background: '#ffff00' }}></span>Moderate</span>
                  <span><span className="map-legend-dot" style={{ background: '#ff7e00' }}></span>Poor</span>
                  <span><span className="map-legend-dot" style={{ background: '#7e0023' }}></span>Severe</span>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll>
          <div id="multicity">
            <div className="page-title">Regional Comparison</div>
            <div className="evidence-meta" style={{ marginBottom: 8 }}>
              CPCB National Air Quality Reports, average AQI (2024)
            </div>
            <div className="card">
              <table className="compare-table">
                <thead>
                  <tr><th>Rank</th><th>City</th><th>Average AQI (2024)</th><th>Category</th><th>Poor Days/Yr</th></tr>
                </thead>
                <tbody>
                  {cities.length === 0 ? (
                    <tr><td colSpan={5} className="evidence-meta">No regional data available</td></tr>
                  ) : (
                    cities.map((c, i) => (
                      <tr key={i}>
                        <td>{c.rank ?? i + 1}</td>
                        <td>{c.city}</td>
                        <td style={{ color: CATEGORY_COLORS[c.category] }}>{c.avg_aqi_2024}</td>
                        <td>{c.category}</td>
                        <td>{c.days_poor_or_worse}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
}