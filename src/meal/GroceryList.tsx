import Button from '../shared/components/Button'

export default function GroceryList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}>
        Grocery List
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 280, fontFamily: 'var(--font-sans)' }}>
        Auto-generated shopping lists from your meal plan. Coming soon.
      </p>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: '16px 24px',
        marginBottom: 24, width: '100%', maxWidth: 280,
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Subscription
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          $19<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Weekly plans · Batch prep · AI suggestions
        </div>
      </div>
      <Button style={{ width: '100%', maxWidth: 280 }} onClick={() => {}}>
        Upgrade to unlock
      </Button>
    </div>
  )
}
