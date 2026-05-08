export function StatsBar() {
  const stats = [
    { value: "500+", label: "Schools Automated" },
    { value: "50,000+", label: "Students Managed" },
    { value: "2M+", label: "Hours Saved Annually" },
    { value: "99.9%", label: "Uptime Guaranteed" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 animate-fade-in-up [animation-delay:400ms]">
      {stats.map((stat) => (
        <div key={stat.label}>
          <div className="text-xl sm:text-2xl font-bold text-text-primary">{stat.value}</div>
          <div className="text-xs sm:text-sm text-text-secondary mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}