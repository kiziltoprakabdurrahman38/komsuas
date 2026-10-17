export default function Toast({ open, title, message, code, onClose }) {
  if (!open) return null

  return (
    <div className="toast-stack" role="status">
      <div className="toast-card animate-fade-in">
        <div>
          <strong>{title}</strong>
          <p>{message}</p>
          {code && <span className="toast-code">{code}</span>}
        </div>
        <button type="button" onClick={onClose} aria-label="Kapat">
          Kapat
        </button>
      </div>
    </div>
  )
}
