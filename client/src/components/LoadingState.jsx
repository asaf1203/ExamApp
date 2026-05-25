export function LoadingState({ label = 'Loading', rows = 3 }) {
  return (
    <div aria-label={label} className="loading-stack" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index} />
      ))}
      <span className="visually-hidden">{label}</span>
    </div>
  )
}
