import ThemeToggle from './ThemeToggle';

const STATEMENT = 'Operasi penerbangan TNI Angkatan Udara dalam satu pandangan.';

export default function AuthShell({ title, note, statement = STATEMENT, children }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__brand">
          <img className="auth__crest" src="/logo_au.png" alt="" />
          <span className="auth__wordmark">SIMOPSUD</span>
        </div>
        <p className="auth__statement">{statement}</p>
        <p className="auth__foot">TNI Angkatan Udara · Mabesau</p>
      </aside>

      <main className="auth__panel">
        <div className="auth__theme"><ThemeToggle /></div>
        <div className="auth__form">
          <div>
            <h1 className="auth__title">{title}</h1>
            {note && <p className="auth__note">{note}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthField({ id, label, hint, action, trailing, type = 'text', ...input }) {
  return (
    <div className="auth-field">
      <div className="auth-row">
        <label className="auth-label" htmlFor={id}>{label}</label>
        {action}
      </div>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={type}
          className={trailing ? 'auth-input auth-input--reveal' : 'auth-input'}
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...input}
        />
        {trailing}
      </div>
      {hint && <p className="auth-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

export function AuthReveal({ shown, onToggle }) {
  return (
    <button type="button" className="auth-reveal" onClick={onToggle} aria-pressed={shown}>
      {shown ? 'Sembunyikan' : 'Tampilkan'}
    </button>
  );
}