function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return view
}

export async function subscribeToPush(apiFn: (path: string, options?: RequestInit) => Promise<any>): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  try {
    const reg = await navigator.serviceWorker.ready
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
    if (!vapidPublicKey) return

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer,
      })
    }

    const subJson = sub.toJSON()
    await apiFn('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      }),
    })
  } catch (err) {
    console.error('[push] subscription failed:', err)
  }
}
