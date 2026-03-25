const STORAGE_KEY = 'campwise_maintenance_requests_v1'

export interface StoredMaintenanceRequest {
    id: string
    createdAt: string
    itemName: string
    requestKind: string
    priority: string
    areaType: string
    campId?: string
    roomId?: string
    locationNote?: string
}

function safeParse(raw: string | null): StoredMaintenanceRequest[] {
    if (!raw) return []
    try {
        const data = JSON.parse(raw) as unknown
        return Array.isArray(data) ? (data as StoredMaintenanceRequest[]) : []
    } catch {
        return []
    }
}

export function readStoredMaintenanceRequests(): StoredMaintenanceRequest[] {
    if (typeof window === 'undefined') return []
    return safeParse(localStorage.getItem(STORAGE_KEY))
}

export function appendStoredMaintenanceRequest(
    payload: Omit<StoredMaintenanceRequest, 'id' | 'createdAt'>,
): StoredMaintenanceRequest {
    const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const createdAt = new Date().toISOString()
    const next: StoredMaintenanceRequest = {
        ...payload,
        id,
        createdAt,
    }
    const list = readStoredMaintenanceRequests()
    list.unshift(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return next
}

export function summarizeRequestStats(list: StoredMaintenanceRequest[]) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const urgent = list.filter((r) => r.priority === 'urgent').length
    const thisMonth = list.filter(
        (r) => new Date(r.createdAt) >= monthStart,
    ).length
    return {
        total: list.length,
        urgent,
        thisMonth,
    }
}
