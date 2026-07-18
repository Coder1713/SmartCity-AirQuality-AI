import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ExplainableAI from './ExplainableAI';
import AIInterventionSimulator from './AIInterventionSimulator';
import StationMap from './StationMap';
import CommandStrip from './HeroSection';

import { api, DELHI_STATIONS, getSampleReading } from './api';
import './App.css';

const CATEGORY_COLORS = {
  Good: '#4ade80',
  Satisfactory: '#a3d977',
  Moderate: '#e8a33d',
  Poor: '#e8743d',
  'Very Poor': '#e04545',
  Severe: '#a12842',
};

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'attribution', label: 'Source Attribution' },
  { id: 'enforcement', label: 'Enforcement' },
  { id: 'explainable-ai', label: 'Explainable AI' },
  { id: 'intervention-simulator', label: 'Simulator' },
  { id: 'advisory', label: 'Citizen Advisory' },
  { id: 'multicity', label: 'Multi-City' },
];

function getPriorityUrgency(priority) {
  if (priority === 'Immediate') {
    return 'IMMEDIATE';
  }

  if (priority === 'Within 6 hours') {
    return 'HIGH';
  }

  if (priority === 'Within 24 hours') {
    return 'MEDIUM';
  }

  return 'LOW';
}

export default function App() {
  const [selectedStation, setSelectedStation] = useState('DL001');
  const [language, setLanguage] = useState('english');
  const [population, setPopulation] = useState('general');

  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [stationsAqi, setStationsAqi] = useState({});
  const [trendData, setTrendData] = useState([]);

  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    api
      .get('/multicity/overview')
      .then((response) => {
        setCities(response.data?.cities ?? []);
      })
      .catch(() => {
        setCities([]);
      });
  }, []);

  const loadTrend = async (stationId) => {
    setTrendLoading(true);

    try {
      const [historyResponse, forecastResponse] = await Promise.all([
        api.get(`/trend/history/${stationId}?hours=72`),
        api.get(`/trend/forecast-curve/${stationId}`),
      ]);

      const historyPoints = historyResponse.data?.points ?? [];
      const forecastPoints = forecastResponse.data?.points ?? [];

      const history = historyPoints.map((point) => ({
        time: new Date(point.timestamp).toLocaleString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
        }),
        actual: point.aqi,
        forecast: null,
      }));

      const forecast = forecastPoints.map((point, index) => ({
        time: new Date(point.timestamp).toLocaleString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
        }),
        actual:
          index === 0 && history.length > 0
            ? history[history.length - 1].actual
            : null,
        forecast: point.aqi,
      }));

      setTrendData([...history, ...forecast]);
    } catch {
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    loadTrend(selectedStation);
  }, [selectedStation]);

  const runPipeline = async () => {
    setLoading(true);
    setError(null);

    try {
      const reading = getSampleReading(selectedStation);

      const payload = {
        ...reading,
        language,
        population_type: population,
        available_inspectors: 3,
      };

      const response = await api.post('/pipeline/analyze', payload);
      const pipelineResult = response.data;

      setResult(pipelineResult);

      const predictedAqi = pipelineResult?.forecast?.predicted_aqi;

      if (Number.isFinite(predictedAqi)) {
        setStationsAqi((previous) => ({
          ...previous,
          [selectedStation]: predictedAqi,
        }));
      }
    } catch {
      setError(
        'Could not reach the backend. Make sure Uvicorn is running on port 8000.',
      );
    } finally {
      setLoading(false);
    }
  };

  const scrollTo = (id) => {
    setActiveSection(id);

    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const forecast = result?.forecast;
  const attribution = result?.attribution;
  const enforcement = result?.enforcement;
  const advisory = result?.advisory;

  const attributionEvidence = attribution?.evidence ?? [];
  const enforcementActions = enforcement?.actions ?? [];

  const generalPublicAdvice = advisory?.general_public ?? [];
  const sensitiveGroupAdvice = advisory?.sensitive_groups ?? [];
  const schoolAdvice = advisory?.schools ?? [];
  const outdoorWorkerAdvice = advisory?.outdoor_workers ?? [];

  const currentStationAqi = stationsAqi[selectedStation];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">SmartCity AQI</div>

        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`sidebar-link ${
              activeSection === section.id ? 'active' : ''
            }`}
            onClick={() => scrollTo(section.id)}
          >
            {section.label}
          </button>
        ))}
      </aside>

      <main className="main">
        <section id="overview">
          <CommandStrip
            result={result}
            cities={cities}
            loading={loading}
          />
        </section>

        <div className="control-bar">
          <div className="control-field">
            <label htmlFor="station-select">Station</label>

            <select
              id="station-select"
              value={selectedStation}
              onChange={(event) => setSelectedStation(event.target.value)}
            >
              {DELHI_STATIONS.map((station) => (
                <option key={station} value={station}>
                  {station}
                </option>
              ))}
            </select>
          </div>

          <div className="control-field">
            <label htmlFor="language-select">Advisory Language</label>

            <select
              id="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="kannada">Kannada</option>
              <option value="tamil">Tamil</option>
            </select>
          </div>

          <div className="control-field">
            <label htmlFor="population-select">Target Population</label>

            <select
              id="population-select"
              value={population}
              onChange={(event) => setPopulation(event.target.value)}
            >
              <option value="general">General Public</option>
              <option value="elderly">Elderly</option>
              <option value="children">Children</option>
              <option value="outdoor_workers">Outdoor Workers</option>
            </select>
          </div>

          <button
            type="button"
            className="run-btn"
            onClick={runPipeline}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Run Intelligence Pipeline'}
          </button>
        </div>

        {error && (
          <div
            className="card"
            style={{
              borderColor: '#e04545',
              color: '#e04545',
              marginBottom: 24,
            }}
          >
            {error}
          </div>
        )}

        <section id="forecast">
          <div className="page-title">Forecast Intelligence</div>

          <div className="page-subtitle">
            Station {selectedStation}, 72-hour history and 72-hour projection
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="chart-header">
              <div className="chart-legend">
                <span>
                  <span
                    className="legend-dot"
                    style={{ background: '#8b92a8' }}
                  />
                  Actual (past)
                </span>

                <span>
                  <span
                    className="legend-dot"
                    style={{ background: '#e8a33d' }}
                  />
                  Forecast (next 72h)
                </span>
              </div>
            </div>

            {trendLoading ? (
              <div className="loading">Loading history and forecast...</div>
            ) : trendData.length === 0 ? (
              <div className="loading">
                Forecast history is currently unavailable.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2d3448"
                  />

                  <XAxis
                    dataKey="time"
                    stroke="#8b92a8"
                    fontSize={10}
                    interval={23}
                  />

                  <YAxis
                    stroke="#8b92a8"
                    fontSize={11}
                  />

                  <Tooltip
                    contentStyle={{
                      background: '#1a1f2e',
                      border: '1px solid #2d3448',
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 12,
                      color: '#f3f4f6',
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                    itemStyle={{ color: '#c5cbd6' }}
                  />

                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#8b92a8"
                    strokeWidth={2}
                    dot={false}
                    name="Actual"
                  />

                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#e8a33d"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={false}
                    name="Forecast"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section id="explainable-ai">
          <ExplainableAI result={result} />
        </section>

        <section id="intervention-simulator">
          <AIInterventionSimulator
            stationId={selectedStation}
            currentAqi={forecast?.predicted_aqi}
            forecastAqi={forecast?.predicted_aqi}
            currentCategory={forecast?.category}
          />
        </section>

        {result && (
          <>
            <section>
              <div className="page-title">Intelligence Pipeline</div>

              <div className="page-subtitle">
                Signal to intervention in{' '}
                {result.pipeline_summary?.total_response_time_ms ?? '—'}ms
                across four chained agents
              </div>

              <div className="workflow">
                <div className="workflow-stage">
                  <div className="stage-num">01 Forecast</div>
                  <div className="stage-title">Predicted AQI</div>

                  <div
                    className="stage-result"
                    style={{
                      color:
                        CATEGORY_COLORS[forecast?.category] ??
                        'var(--text)',
                    }}
                  >
                    {forecast?.predicted_aqi ?? '—'}
                  </div>

                  <div className="stage-detail">
                    {forecast?.category ?? 'Unavailable'}
                  </div>

                  <div className="stage-timing">
                    R² {forecast?.model_r2 ?? '—'} ·{' '}
                    {result.step_timings?.[0]?.time_ms ?? '—'}ms
                  </div>
                </div>

                <div className="workflow-stage">
                  <div className="stage-num">02 Attribution</div>
                  <div className="stage-title">Primary Source</div>

                  <div
                    className="stage-result"
                    style={{ fontSize: 18 }}
                  >
                    {attribution?.primary_source ?? 'Unavailable'}
                  </div>

                  <div className="stage-detail">
                    {attribution?.confidence ?? '—'} confidence
                  </div>

                  <div className="stage-timing">
                    {result.step_timings?.[1]?.time_ms ?? '—'}ms
                  </div>
                </div>

                <div className="workflow-stage">
                  <div className="stage-num">03 Enforcement</div>
                  <div className="stage-title">Urgency</div>

                  <span
                    className={`urgency-badge urgency-${
                      enforcement?.urgency ?? 'LOW'
                    }`}
                  >
                    {enforcement?.urgency ?? 'LOW'}
                  </span>

                  <div className="stage-detail">
                    Score {enforcement?.enforcement_score ?? '—'}/100
                  </div>

                  <div className="stage-timing">
                    {result.step_timings?.[2]?.time_ms ?? '—'}ms
                  </div>
                </div>

                <div className="workflow-stage">
                  <div className="stage-num">04 Advisory</div>

                  <div className="stage-title">
                    {language}, {population.replaceAll('_', ' ')}
                  </div>

                  <div
                    className="stage-detail"
                    style={{
                      fontSize: 13,
                      color: 'var(--text)',
                    }}
                  >
                    {advisory?.summary ??
                      advisory?.headline ??
                      'Guidance unavailable'}
                  </div>

                  <div className="stage-timing">
                    {result.step_timings?.[3]?.time_ms ?? '—'}ms
                  </div>
                </div>
              </div>
            </section>

            <section id="attribution">
              <div className="page-title">
                Pollution Source Analysis & Field Response Plan
              </div>

              <div className="page-subtitle">
                Sensor-based source evidence and operational response
                recommendations
              </div>

              <div className="split-row">
                <div className="card">
                  <div className="command-strip-label">
                    Primary pollution source
                  </div>

                  <div
                    className="command-strip-value"
                    style={{ fontSize: 20, marginBottom: 6 }}
                  >
                    {attribution?.primary_source ?? 'Unavailable'}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-dim)',
                      marginBottom: 16,
                    }}
                  >
                    Attribution confidence:{' '}
                    {attribution?.confidence ?? 'Unavailable'}
                  </div>

                  {attributionEvidence.length > 0 ? (
                    attributionEvidence.map((evidence, index) => (
                      <div
                        key={`${evidence.statement}-${index}`}
                        style={{
                          marginBottom: 10,
                          paddingBottom: 10,
                          borderBottom:
                            index < attributionEvidence.length - 1
                              ? '1px solid var(--border)'
                              : 'none',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            color: 'var(--text)',
                            marginBottom: 4,
                          }}
                        >
                          {evidence.statement}
                        </div>

                        <div className="evidence-meta">
                          {evidence.type ?? 'Evidence'}
                          {evidence.strength
                            ? ` · ${evidence.strength}`
                            : ''}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-dim)',
                      }}
                    >
                      No structured attribution evidence is available for
                      this run.
                    </div>
                  )}
                </div>

                <div className="card" id="enforcement">
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-dim)',
                      marginBottom: 14,
                    }}
                  >
                    {enforcement?.summary ??
                      'No field response summary is available.'}
                  </div>

                  {enforcementActions.length > 0 ? (
                    enforcementActions.map((action) => (
                      <div
                        key={action.id ?? action.title}
                        style={{
                          marginBottom: 12,
                          paddingBottom: 12,
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {action.title}
                          </span>

                          <span
                            className={`urgency-badge urgency-${getPriorityUrgency(
                              action.priority,
                            )}`}
                          >
                            {action.priority}
                          </span>
                        </div>

                        {action.reason && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: 'var(--text-dim)',
                              lineHeight: 1.5,
                            }}
                          >
                            {action.reason}
                          </div>
                        )}

                        {action.owner && (
                          <div
                            className="evidence-meta"
                            style={{ marginTop: 6 }}
                          >
                            Owner: {action.owner}
                          </div>
                        )}

                        {action.expected_effect && (
                          <div
                            className="evidence-meta"
                            style={{ marginTop: 3 }}
                          >
                            Expected effect: {action.expected_effect}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-dim)',
                      }}
                    >
                      No field actions were generated for this run.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section id="advisory">
              <div className="page-title">
                Public Health Guidance
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <div className="advisory-tags">
                  <span className="advisory-tag">
                    {advisory?.risk_level ?? forecast?.category ?? 'Unknown'}{' '}
                    risk
                  </span>

                  <span className="advisory-tag">{language}</span>

                  <span className="advisory-tag">
                    {population.replaceAll('_', ' ')}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-dim)',
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}
                >
                  {advisory?.summary ??
                    advisory?.health_advice ??
                    advisory?.headline ??
                    'Public-health guidance is unavailable for this run.'}
                </p>

                {generalPublicAdvice.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      className="evidence-factor"
                      style={{ marginBottom: 6 }}
                    >
                      General public
                    </div>

                    <ul className="action-list">
                      {generalPublicAdvice.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sensitiveGroupAdvice.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      className="evidence-factor"
                      style={{ marginBottom: 6 }}
                    >
                      Sensitive groups
                    </div>

                    <ul className="action-list">
                      {sensitiveGroupAdvice.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {schoolAdvice.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      className="evidence-factor"
                      style={{ marginBottom: 6 }}
                    >
                      Schools
                    </div>

                    <ul className="action-list">
                      {schoolAdvice.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {outdoorWorkerAdvice.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      className="evidence-factor"
                      style={{ marginBottom: 6 }}
                    >
                      Outdoor workers
                    </div>

                    <ul className="action-list">
                      {outdoorWorkerAdvice.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {advisory?.recommended_window && (
                  <div style={{ marginTop: 16 }}>
                    <div
                      className="evidence-factor"
                      style={{ marginBottom: 8 }}
                    >
                      Activity windows
                    </div>

                    {advisory.recommended_window
                      .avoid_outdoor_activity && (
                      <div className="feasibility-row">
                        <span>Avoid outdoor activity</span>
                        <span>
                          {
                            advisory.recommended_window
                              .avoid_outdoor_activity
                          }
                        </span>
                      </div>
                    )}

                    {advisory.recommended_window.safer_window && (
                      <div className="feasibility-row">
                        <span>Safer window</span>
                        <span>
                          {advisory.recommended_window.safer_window}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {generalPublicAdvice.length === 0 &&
                  sensitiveGroupAdvice.length === 0 &&
                  schoolAdvice.length === 0 &&
                  outdoorWorkerAdvice.length === 0 &&
                  advisory?.recommended_actions?.length > 0 && (
                    <ul className="action-list">
                      {advisory.recommended_actions.map(
                        (action, index) => (
                          <li key={index}>{action}</li>
                        ),
                      )}
                    </ul>
                  )}
              </div>
            </section>
          </>
        )}

        <section>
          <div className="page-title">Station Operations Map</div>

          <div className="page-subtitle">
            Select a station for details. This also updates the
            forecast above.
          </div>

          <div
            className="split-row-map"
            style={{ marginBottom: 24 }}
          >
            <div className="card" style={{ padding: 0 }}>
              <StationMap
                stationsData={stationsAqi}
                onSelectStation={setSelectedStation}
                selectedStation={selectedStation}
              />
            </div>

            <div className="card station-detail-panel">
              <div className="command-strip-label">
                Selected Station
              </div>

              <div
                className="command-strip-value"
                style={{ fontSize: 20, marginBottom: 10 }}
              >
                {selectedStation}
              </div>

              <div className="feasibility-row">
                <span>Current AQI</span>
                <span>
                  {Number.isFinite(currentStationAqi)
                    ? Math.round(currentStationAqi)
                    : '—'}
                </span>
              </div>

              <div className="feasibility-row">
                <span>Category</span>
                <span>{forecast?.category ?? '—'}</span>
              </div>

              <div
                className="map-legend"
                style={{
                  marginTop: 16,
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span>
                  <span
                    className="map-legend-dot"
                    style={{ background: '#00e400' }}
                  />
                  Good
                </span>

                <span>
                  <span
                    className="map-legend-dot"
                    style={{ background: '#ffff00' }}
                  />
                  Moderate
                </span>

                <span>
                  <span
                    className="map-legend-dot"
                    style={{ background: '#ff7e00' }}
                  />
                  Poor
                </span>

                <span>
                  <span
                    className="map-legend-dot"
                    style={{ background: '#7e0023' }}
                  />
                  Severe
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="multicity">
          <div className="page-title">Regional Comparison</div>

          <div className="card">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>AQI</th>
                  <th>Category</th>
                  <th>Poor Days/Yr</th>
                </tr>
              </thead>

              <tbody>
                {cities.length > 0 ? (
                  cities.map((city) => (
                    <tr key={city.city}>
                      <td>{city.city}</td>

                      <td
                        style={{
                          color:
                            CATEGORY_COLORS[city.category] ??
                            'var(--text)',
                        }}
                      >
                        {city.avg_aqi_2024}
                      </td>

                      <td>{city.category}</td>
                      <td>{city.days_poor_or_worse}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">
                      Regional comparison data is unavailable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}