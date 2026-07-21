function SkylineIllustration() {
  return (
    <svg width="360" height="200" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{maxWidth: '100%'}}>
      <circle cx="300" cy="70" r="34" fill="#E8C93D" opacity="0.85" />
      {[...Array(14)].map((_, i) => (
        <circle key={i} className="twinkle" cx={20 + (i * 27) % 380} cy={20 + (i * 53) % 90} r="1.4" fill="#fff" opacity="0.6" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      <rect x="10" y="130" width="26" height="80" fill="#16241c" />
      <rect x="42" y="100" width="30" height="110" fill="#1c2f22" />
      <rect x="80" y="140" width="20" height="70" fill="#16241c" />
      <rect x="106" y="80" width="34" height="130" fill="#1c2f22" />
      <rect x="146" y="120" width="24" height="90" fill="#16241c" />
      <rect x="176" y="95" width="28" height="115" fill="#1c2f22" />
      <rect x="210" y="135" width="20" height="75" fill="#16241c" />
      <rect x="236" y="105" width="30" height="105" fill="#1c2f22" />
      <path d="M300 130 L300 105 M292 112 L308 112 M295 100 L305 100" stroke="#4FAE6B" strokeWidth="2" />
      <path d="M280 175 Q300 155 320 175" fill="none" stroke="#E8C93D" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="300" cy="180" rx="55" ry="12" fill="#0B1410" opacity="0.4" />
    </svg>
  );
}

export default function CommandStrip({ result, cities, loading }) {
  const worstCity = cities.length > 0 ? cities[0] : null;
  const currentAqi = result ? result.forecast.predicted_aqi : (worstCity ? worstCity.avg_aqi_2024 : '—');
  const highRiskCount = cities.filter(c => c.avg_aqi_2024 > 150).length;
  const category = result?.forecast?.category;

  return (
    <>
      <div className="hero-v2" data-aqi-category={category || undefined}>
        <div className="hero-sky-glow"></div>
        <div>
          <div className="hero-v2-eyebrow">Delhi Environmental</div>
          <h1 className="hero-v2-title">Operations <span className="accent">Center</span></h1>
          <p className="hero-v2-tagline">Real-time air quality intelligence for a cleaner tomorrow.</p>
          <div className="hero-v2-meta-row">
            <div>
              <div className="command-strip-label">Pipeline Status</div>
              <span className={`pipeline-status-badge ${loading ? 'status-running' : result ? 'status-complete' : 'status-idle'}`}>
                {loading ? 'Running' : result ? 'Ready' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
        <SkylineIllustration />
      </div>

      <div className="kpi-strip">
        <div className="kpi-tile">
          <div className="kpi-tile-label">Current AQI</div>
          <div className="kpi-tile-value">{currentAqi}</div>
          <div className="kpi-tile-tag">{category || 'Awaiting run'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-label">24h Forecast</div>
          <div className="kpi-tile-value">{result?.decision_context?.forecast_24h_aqi ?? '—'}</div>
          <div className="kpi-tile-tag">{result?.decision_context?.forecast_24h_category ?? 'No data yet'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-label">Top Contributor</div>
          <div className="kpi-tile-value" style={{fontSize: 18}}>{result?.attribution?.primary_source ?? '—'}</div>
          <div className="kpi-tile-tag">{result?.attribution?.confidence ? `${result.attribution.confidence} confidence` : 'Run pipeline'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-label">Pipeline Status</div>
          <div className="kpi-tile-value" style={{fontSize: 18}}>{loading ? 'Running' : result ? 'Ready' : 'Idle'}</div>
          <div className="kpi-tile-tag">{result ? 'Analysis complete' : 'Not started'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-label">High Risk Stations</div>
          <div className="kpi-tile-value">{highRiskCount}</div>
          <div className="kpi-tile-tag">of {cities.length || '—'} cities tracked</div>
        </div>
      </div>

      <div className="pipeline-strip">
        <div className="pipeline-strip-stages">
          {['Data Ingestion', 'Forecast Engine', 'Source Attribution', 'Action Insights'].map((label, i) => (
            <div key={label} style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <div className="pipeline-strip-stage">
                <div className="pipeline-strip-num">{i + 1}</div>
                <div style={{fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center'}}>{label}</div>
              </div>
              {i < 3 && <div className="pipeline-strip-dots"></div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}