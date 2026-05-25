export const toDate = (value) => (value ? new Date(value) : null)

export const formatDateTime = (value) => {
  const date = toDate(value)

  if (!date || Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export const formatDate = (value) => {
  const date = toDate(value)

  if (!date || Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date)
}

export const formatDuration = (minutes) => {
  const value = Number(minutes || 0)

  if (value < 60) {
    return `${value} min`
  }

  const hours = Math.floor(value / 60)
  const remainingMinutes = value % 60

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export const formatCountdown = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const padded = (value) => String(value).padStart(2, '0')

  return hours > 0
    ? `${hours}:${padded(minutes)}:${padded(seconds)}`
    : `${minutes}:${padded(seconds)}`
}

export const isPast = (value, now = new Date()) => {
  const date = toDate(value)

  return Boolean(date && date.getTime() <= now.getTime())
}

export const isFuture = (value, now = new Date()) => {
  const date = toDate(value)

  return Boolean(date && date.getTime() > now.getTime())
}

export const minIsoDate = (...values) => {
  const validDates = values
    .map((value) => toDate(value))
    .filter((date) => date && !Number.isNaN(date.getTime()))

  if (validDates.length === 0) {
    return null
  }

  return new Date(Math.min(...validDates.map((date) => date.getTime()))).toISOString()
}
