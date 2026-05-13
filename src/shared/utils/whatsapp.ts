export function openWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/[^0-9+]/g, '')
  const intl = cleaned.startsWith('+') ? cleaned
    : cleaned.startsWith('0') ? '+94' + cleaned.slice(1)
    : '+94' + cleaned
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${intl.replace('+', '')}?text=${encoded}`, '_blank', 'noopener,noreferrer')
}

export function promptWhatsApp(message: string) {
  const phone = window.prompt('Enter WhatsApp number (e.g. 0771234567):')
  if (!phone) return
  openWhatsApp(phone, message)
}
