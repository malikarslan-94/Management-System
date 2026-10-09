import type { Camp } from '@/services/CampService'
import type { AssignmentFilters } from '@/services/RoomAssignmentService'

type RoomStatus = { status: string }

/** Use the same room records for every dashboard room metric. */
export function summarizeRooms(rooms: RoomStatus[], camps: Camp[]) {
    const fromRecords = rooms.length > 0
    const campTotal = (key: keyof Camp) =>
        camps.reduce((total, camp) => {
            const value = camp[key]
            return (
                total +
                (typeof value === 'number' && Number.isFinite(value)
                    ? Math.max(0, value)
                    : 0)
            )
        }, 0)
    const total = fromRecords ? rooms.length : campTotal('totalRooms')
    const occupied = Math.min(
        total,
        fromRecords
            ? rooms.filter((room) => room.status === 'occupied').length
            : campTotal('occupiedRooms'),
    )
    const maintenance = fromRecords
        ? rooms.filter((room) => room.status === 'maintenance').length
        : campTotal('maintenanceRooms')
    const cleaning = fromRecords
        ? rooms.filter((room) => room.status === 'cleaning').length
        : campTotal('cleaningRooms')
    const available = Math.min(
        total - occupied,
        fromRecords
            ? rooms.filter((room) => room.status === 'available').length
            : Math.max(0, total - occupied - maintenance - cleaning),
    )
    const unavailable = total - occupied - available
    const percentage = (count: number) =>
        total > 0 ? (count / total) * 100 : 0

    return {
        fromRecords,
        total,
        occupied,
        available,
        unavailable,
        maintenance,
        occupiedPercent: percentage(occupied),
        availablePercent: percentage(available),
        unavailablePercent: percentage(unavailable),
    }
}

export function localDateKey(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-')
}

/** Checkout dates come from date-only inputs, stored at UTC midnight. */
export function upcomingCheckoutFilters(today: string): AssignmentFilters {
    const end = new Date(`${today}T00:00:00.000Z`)
    end.setUTCDate(end.getUTCDate() + 2)
    end.setUTCHours(23, 59, 59, 999)
    return {
        status: 'active',
        page: 1,
        limit: 6,
        expectedCheckoutFrom: `${today}T00:00:00.000Z`,
        expectedCheckoutTo: end.toISOString(),
        sortBy: 'expectedCheckoutDate',
    }
}

export function formatCheckoutDate(iso: string) {
    const date = new Date(iso)
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
          })
}

export function formatRelativeTime(
    iso: string | undefined,
    now = Date.now(),
): string {
    if (!iso) return '—'
    const then = new Date(iso).getTime()
    if (!Number.isFinite(then)) return '—'
    const mins = Math.floor(Math.max(0, now - then) / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    if (mins > 0) return `${mins} min ago`
    return 'Just now'
}
