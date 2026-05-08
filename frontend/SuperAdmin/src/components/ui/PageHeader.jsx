export default function PageHeader({ title, description, breadcrumbs, actions }) {
  return (
    <div className="page-header">
      {breadcrumbs && (
        <div className="breadcrumb">
          {breadcrumbs.map((b, i) => (
            <span key={i}>
              {i > 0 && <span className="separator"> / </span>}
              {b.to ? <a href={b.to}>{b.label}</a> : <span className="current">{b.label}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
