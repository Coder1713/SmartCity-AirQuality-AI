function CityIllustration() {
  return (
    <svg width="270" height="190" viewBox="0 0 270 190" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-v2-illustration">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d9eeb" stopOpacity="0.14" />
          <stop offset="1" stopColor="#6d9eeb" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="haze2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8a33d" stopOpacity="0.2" />
          <stop offset="1" stopColor="#e8a33d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="216" cy="42" r="66" fill="url(#sky)" />
      <rect x="0" y="128" width="270" height="62" fill="url(#haze2)" />
      <rect x="18" y="86" width="24" height="94" rx="3" fill="#1e2330" />
      <rect x="50" y="58" width="28" height="122" rx="3" fill="#181c27" />
      <rect x="86" y="100" width="20" height="80" rx="3" fill="#1e2330" />
      <rect x="114" y="42" width="30" height="138" rx="3" fill="#181c27" />
      <rect x="152" y="74" width="22" height="106" rx="3" fill="#1e2330" />
      <rect x="180" y="52" width="26" height="128" rx="3" fill="#181c27" />
      <rect x="214" y="92" width="20" height="88" rx="3" fill="#1e2330" />
      <circle cx="234" cy="36" r="18" fill="#e8a33d" opacity="0.28" />
      <circle cx="234" cy="36" r="9" fill="#e8a33d" opacity="0.5" />
    </svg>
  );
}

export default function CommandStrip({ result, cities, loading }) {
  const worstCity = cities.length > 0 ? cities[0] : null;
  const currentAqi = result ? result.forecast.predicted_aqi : (worstCity ? worstCity.avg_aqi_2024 : '—');
  const highRiskCount = cities.filter(c => c.avg_aqi_2024 > 150).length;

  return (
    <div className="hero-v2">
      <div>
        <div className="hero-v2-eyebrow">Smart City Air Quality Intelligence</div>
        <h1 className="hero-v2-title">Mission Control</h1>
        <p className="hero-v2-tagline">AI-powered forecasting, source attribution, and intervention planning to help city officials act on air quality before it becomes a crisis.</p>

        <div className="hero-v2-meta-row">
          <div>
            <div className="command-strip-label">City</div>
            <div className="command-strip-value" style={{fontSize: 18}}>Delhi</div>
          </div>
          <div>
            <div className="command-strip-label">Pipeline Status</div>
            <span className={`pipeline-status-badge ${loading ? 'status-running' : result ? 'status-complete' : 'status-idle'}`}>
              {loading ? 'Running' : result ? 'Complete' : 'Idle'}
            </span>
          </div>
        </div>

        <div className="hero-v2-stats-row">
          <div className="hero-v2-stat">
            <div className="command-strip-label">Current AQI</div>
            <div className="command-strip-value" style={{fontSize: 24}}>{currentAqi}</div>
          </div>
          <div className="hero-v2-stat">
            <div className="command-strip-label">24h Forecast</div>
            <div className="command-strip-value" style={{fontSize: 24}}>{result?.decision_context?.forecast_24h_aqi ?? '—'}</div>
          </div>
          <div className="hero-v2-stat">
            <div className="command-strip-label">High Risk Stations</div>
            <div className="command-strip-value" style={{fontSize: 24}}>{highRiskCount}</div>
          </div>
          <div className="hero-v2-stat">
            <div className="command-strip-label">Active Interventions</div>
            <div className="command-strip-value" style={{fontSize: 24}}>{result ? 1 : 0}</div>
          </div>
        </div>
      </div>

      <CityIllustration />
    </div>
  );
}