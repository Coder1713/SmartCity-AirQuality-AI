export default function CommandStrip({ result, cities, loading }) {
  const worstCity = cities.length > 0 ? cities[0] : null;
  const currentAqi = result ? result.forecast.predicted_aqi : (worstCity ? worstCity.avg_aqi_2024 : '—');
  const highRiskCount = cities.filter(c => c.avg_aqi_2024 > 150).length;
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="command-strip">
      <div className="command-strip-item">
        <div className="command-strip-label">City</div>
        <div className="command-strip-value">Delhi</div>
      </div>
      <div className="command-strip-item">
        <div className="command-strip-label">Pipeline Status</div>
        <span className={`pipeline-status-badge ${loading ? 'status-running' : result ? 'status-complete' : 'status-idle'}`}>
          {loading ? 'Running' : result ? 'Complete' : 'Idle'}
        </span>
      </div>
      <div className="command-strip-item">
        <div className="command-strip-label">Last Updated</div>
        <div className="command-strip-value" style={{fontSize: 14}}>{now}</div>
      </div>
      <div className="command-strip-item">
        <div className="command-strip-label">Current AQI</div>
        <div className="command-strip-value">{currentAqi}</div>
      </div>
      <div className="command-strip-item">
        <div className="command-strip-label">24h Forecast</div>
        <div className="command-strip-value">{result ? Math.round(result.forecast.predicted_aqi * 1.1) : '—'}</div>
      </div>
      <div className="command-strip-item">
        <div className="command-strip-label">High Risk Stations</div>
        <div className="command-strip-value">{highRiskCount}</div>
      </div>
      <div className="command-strip-item">
        <div className="command-strip-label">Active Interventions</div>
        <div className="command-strip-value">{result ? 1 : 0}</div>
      </div>
    </div>
  );
}