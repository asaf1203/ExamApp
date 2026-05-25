import { useEffect, useRef, useState } from 'react'
import { appConfig } from '../config'

const getRemainingMs = (expiresAt) => {
  const target = expiresAt ? new Date(expiresAt).getTime() : 0

  if (!target || Number.isNaN(target)) {
    return 0
  }

  return Math.max(0, target - Date.now())
}

export const useCountdown = (expiresAt, onExpire) => {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(expiresAt))
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    expiredRef.current = false

    const tick = () => {
      const nextRemainingMs = getRemainingMs(expiresAt)
      setRemainingMs(nextRemainingMs)

      if (nextRemainingMs <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current?.()
      }
    }

    tick()
    const intervalId = window.setInterval(tick, appConfig.ui.countdownTickMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [expiresAt])

  return {
    isExpired: remainingMs <= 0,
    remainingMs,
  }
}
