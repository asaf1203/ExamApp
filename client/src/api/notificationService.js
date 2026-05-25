import { apiClient, mockRequest } from './apiClient'
import { getAuthenticatedMockUser } from './authService'
import { mockDb, persistMockDb } from './mockDb'

const sortByNewest = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

export const listNotifications = async () =>
  apiClient.isMock
    ? mockRequest(() => {
        const user = getAuthenticatedMockUser()
        const notifications = sortByNewest(
          (mockDb.notifications ?? []).filter((item) => item.userId === user.id),
        )

        return {
          items: notifications.slice(0, 12),
          unreadCount: notifications.filter((item) => !item.readAt).length,
        }
      })
    : apiClient.get('/notifications')

export const markNotificationsRead = async () =>
  apiClient.isMock
    ? mockRequest(() => {
        const user = getAuthenticatedMockUser()
        const now = new Date().toISOString()
        const notifications = mockDb.notifications ?? []

        notifications.forEach((item) => {
          if (item.userId === user.id && !item.readAt) {
            item.readAt = now
          }
        })
        persistMockDb()

        return { success: true }
      })
    : apiClient.post('/notifications/read')

// TODO backend: replace with paginated notification endpoints and optional
// websocket/SSE delivery for real-time exam and grading events.
