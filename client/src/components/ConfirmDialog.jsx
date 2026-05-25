export function ConfirmDialog({
  cancelLabel = 'Cancel',
  children,
  confirmLabel = 'Confirm',
  danger = false,
  onCancel,
  onConfirm,
  open,
  title,
}) {
  if (!open) {
    return null
  }

  return (
    <div aria-modal="true" className="dialog-backdrop" role="dialog">
      <div className="dialog-panel">
        <h2 className="h5 mb-2">{title}</h2>
        <div className="text-secondary">{children}</div>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-outline-secondary" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
