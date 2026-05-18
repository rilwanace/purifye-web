import { Link } from 'react-router-dom'

export default function BlockedPage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', color: '#e8e8e8', padding: '2rem', textAlign: 'center'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
        Your account has been suspended
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '2rem', maxWidth: 360, lineHeight: 1.6 }}>
        Access to your account has been temporarily suspended. Contact our support team to resolve this.
      </p>
      <a
        href="https://wa.me/94776227802"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block', background: '#ef4444', color: '#fff',
          padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
          fontWeight: 600, textDecoration: 'none', marginBottom: '1rem'
        }}
      >
        Contact support
      </a>
      <br />
      <Link to="/" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
        ← Back to bot selector
      </Link>
    </div>
  )
}
