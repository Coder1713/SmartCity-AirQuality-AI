function SkylineIllustration() {
  return (
    <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-v2-illustration">
      <defs>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8a33d" stopOpacity="0.15" />
          <stop offset="1" stopColor="#e8a33d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="90" width="220" height="50" fill="url(#haze)" />
      <rect x="15" y="60" width="18" height="70" fill="#232a3b" />
      <rect x="40" y="40" width="22" height="90" fill="#1e2431" />
      <rect x="70" y="70" width="16" height="60" fill="#232a3b" />
      <rect x="95" y="30" width="24" height="100" fill="#1e2431" />
      <rect x="128" y="55" width="18" height="75" fill="#232a3b" />
      <rect x="155" y="45" width="20" height="85" fill="#1e2431" />
      <rect x="184" y="65" width="16" height="65" fill="#232a3b" />
      <circle cx="180" cy="30" r="14" fill="#e8a33d" opacity="0.25" />
    </svg>
  );
}

export default function CommandStrip({ result, cities, loading, onRunPipeline }) {
  const worstCity = cities.length > 0 ? cities[0] : null;
  const currentAqi = result ? result.forecast.predicted_aqi : (worstCity ? worstCity.avg_aqi_2024 : '—');
  const highRiskCount = cities.filter(c => c.avg_aqi_2024 > 150).length;

  return (
    <div className="hero-v2">
      <div>
        <div className="hero-v2-eyebrow">Smart City Air Quality Intelligence</div>
        <h1 className="hero-v2-title">Mission Control</h1>
        <p className="hero-v2-tagline">AI-powered forecasting, source attribution, and intervention planning for urban air quality management.</p>

        <div className="hero-v2-meta-row">
          <div className="hero-v2-meta-item">
            <div className="command-strip-label">City</div>
            <div className="command-strip-value">Delhi</div>
          </div>
          <div className="hero-v2-meta-item">
            <div className="command-strip-label">Pipeline Status</div>
            <span className={`pipeline-status-badge ${loading ? 'status-running' : result ? 'status-complete' : 'status-idle'}`}>
              {loading ? 'Running' : result ? 'Complete' : 'Idle'}
            </span>
          </div>
        </div>

        <div className="hero-v2-stats-row">
          <div className="hero-v2-stat">
            <div className="command-strip-label">Current AQI</div>
            <div className="command-strip-value">{currentAqi}</div>
          </div>
          <div className="hero-v2-stat">
            <div className="command-strip-label">24h Forecast</div>
            <div className="command-strip-value">{result?.decision_context?.forecast_24h_aqi ?? '—'}</div>
          </div>
          <div className="hero-v2-stat">
            <div className="command-strip-label">High Risk Stations</div>
            <div className="command-strip-value">{highRiskCount}</div>
          </div>
          <div className="hero-v2-stat">
            <div className="command-strip-label">Active Interventions</div>
            <div className="command-strip-value">{result ? 1 : 0}</div>
          </div>
        </div>
      </div>

      <SkylineIllustration />
    </div>
  );
}