import { useRef, useEffect } from 'react';

function EnvironmentIllustration({ parallaxRef }) {
  return (
    <div className="hero-illustration-wrap" ref={parallaxRef}>
      <svg width="380" height="300" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{maxWidth: '100%'}}>
        <g className="hero-layer-back" data-depth="3">
          <ellipse cx="70" cy="60" rx="34" ry="16" fill="#fff" opacity="0.9" className="float-anim" />
          <ellipse cx="100" cy="52" rx="24" ry="12" fill="#fff" opacity="0.9" className="float-anim" style={{animationDelay: '1s'}} />
        </g>

        <g className="hero-layer-mid" data-depth="6">
          <path className="airflow-path" d="M20 250 Q 60 235, 100 250 T 180 250 T 260 250 T 340 250" stroke="var(--aqi-accent)" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
          <circle id="sensor-pulse" cx="200" cy="60" r="10" fill="var(--aqi-accent)" />
          <line x1="200" y1="70" x2="200" y2="100" stroke="var(--aqi-accent)" strokeWidth="3" />
          <circle cx="200" cy="60" r="18" stroke="var(--aqi-accent)" strokeWidth="2" opacity="0.5" fill="none" className="pulse-anim" />
          <circle cx="200" cy="60" r="26" stroke="var(--aqi-accent)" strokeWidth="1.5" opacity="0.3" fill="none" />
        </g>

        <g className="hero-layer-front" data-depth="9">
          <rect x="60" y="170" width="46" height="120" rx="6" fill="#3D6E97" opacity="0.92" />
          <rect x="116" y="130" width="52" height="160" rx="6" fill="#1F2937" opacity="0.9" />
          <rect x="178" y="190" width="38" height="100" rx="6" fill="#4C8F52" opacity="0.9" />
          <rect x="226" y="110" width="56" height="180" rx="6" fill="#1F2937" opacity="0.95" />
          <rect x="292" y="160" width="42" height="130" rx="6" fill="#F26B5E" opacity="0.92" />

          <rect x="70" y="185" width="8" height="8" rx="2" fill="#FBF8F2" opacity="0.85" />
          <rect x="86" y="185" width="8" height="8" rx="2" fill="#FBF8F2" opacity="0.85" />
          <rect x="70" y="205" width="8" height="8" rx="2" fill="#FBF8F2" opacity="0.85" />
          <rect x="86" y="205" width="8" height="8" rx="2" fill="#FBF8F2" opacity="0.85" />
          <rect x="236" y="130" width="9" height="9" rx="2" fill="#FBF8F2" opacity="0.7" />
          <rect x="254" y="130" width="9" height="9" rx="2" fill="#FBF8F2" opacity="0.7" />
          <rect x="236" y="152" width="9" height="9" rx="2" fill="#FBF8F2" opacity="0.7" />
          <rect x="254" y="152" width="9" height="9" rx="2" fill="#FBF8F2" opacity="0.7" />

          <circle cx="30" cy="270" r="20" fill="#4C8F52" />
          <rect x="26" y="285" width="8" height="20" fill="#7a5c3c" />
          <circle cx="355" cy="280" r="16" fill="#4C8F52" />
          <rect x="351" y="292" width="6" height="16" fill="#7a5c3c" />
        </g>
      </svg>
    </div>
  );
}

export default function CommandStrip({ result, cities, loading }) {
  const worstCity = cities.length > 0 ? cities[0] : null;
  const currentAqi = result ? result.forecast.predicted_aqi : (worstCity ? worstCity.avg_aqi_2024 : '—');
  const highRiskCount = cities.filter(c => c.avg_aqi_2024 > 150).length;
  const parallaxRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.innerWidth >= 1100;
    if (prefersReduced || !isDesktop || !parallaxRef.current) return;

    let raf = null;
    let targetX = 0, targetY = 0, curX = 0, curY = 0;

    const handleMove = (e) => {
      const rect = parallaxRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const relY = (e.clientY - rect.top - rect.height / 2) / rect.height;
      targetX = relX; targetY = relY;
    };

    const tick = () => {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      const layers = parallaxRef.current?.querySelectorAll('[data-depth]');
      layers?.forEach(layer => {
        const depth = parseFloat(layer.getAttribute('data-depth'));
        layer.style.transform = `translate(${curX * depth}px, ${curY * depth}px)`;
      });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMove);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', handleMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const aqiCategory = result?.forecast?.category;

  return (
    <div className="hero-v2" data-aqi-category={aqiCategory || undefined}>
      <div className="hero-bg-shape-1"></div>
      <div className="hero-bg-shape-2"></div>
      <div className="hero-bg-shape-3"></div>
      <div className="hero-bg-dots"></div>
      <svg className="hero-bg-airflow" viewBox="0 0 800 400" preserveAspectRatio="none">
        <path className="airflow-path" d="M0 120 Q 200 90, 400 130 T 800 110" stroke="#3D6E97" strokeWidth="2" fill="none" />
        <path className="airflow-path" d="M0 220 Q 220 250, 420 210 T 800 240" stroke="#4C8F52" strokeWidth="2" fill="none" />
        <path className="airflow-path" d="M0 320 Q 200 300, 400 330 T 800 310" stroke="#E8A83D" strokeWidth="2" fill="none" />
      </svg>

      <div>
        <div className="hero-v2-eyebrow">Smart City Air Quality Intelligence</div>
        <h1 className="hero-v2-title">Urban Air<br/>Quality Intelligence</h1>
        <p className="hero-v2-tagline">Forecast pollution, identify likely sources, and plan targeted interventions before air quality becomes critical.</p>

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

      <div className="hero-v2-illustration">
        <EnvironmentIllustration parallaxRef={parallaxRef} />
      </div>
    </div>
  );
}