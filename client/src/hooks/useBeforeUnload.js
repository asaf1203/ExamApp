import { useEffect } from 'react'

export const useBeforeUnload = (enabled, message = 'You have unsaved changes.') => {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = message
      return message
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, message])
}
