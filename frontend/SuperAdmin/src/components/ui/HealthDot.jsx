export default function HealthDot({ status = 'unknown', size = 8, pulse = true }) {
  const shouldPulse = pulse && (status === 'critical' || status === 'degraded');

  return (
    <span
      className={`dot ${status}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        animation: shouldPulse ? 'pulse 1.5s infinite' : 'none',
      }}
    />
  );
}
