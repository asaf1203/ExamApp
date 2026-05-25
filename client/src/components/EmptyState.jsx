export function EmptyState({ action = null, description, title }) {
  return (
    <div className="empty-state">
      <h2 className="h5">{title}</h2>
      {description && <p className="text-secondary mb-3">{description}</p>}
      {action}
    </div>
  )
}
