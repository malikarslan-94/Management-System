import type { LocationSummary } from '@/services/LocationService'

const STORAGE_KEY = 'campwise_extra_locations_v1'

export type ExtraLocation = {
    id: string
    name: string
    address?: string
}

function simpleId(name: string): string {
    let h = 0
    for (let i = 0; i < name.length; i++) {
        h = (h << 5) - h + name.charCodeAt(i)
        h |= 0
    }
    return `derived-${Math.abs(h).toString(36)}`
}

export function readExtraLocations(): ExtraLocation[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const data = JSON.parse(raw) as unknown
        return Array.isArray(data) ? (data as ExtraLocation[]) : []
    } catch {
        return []
    }
}

export function saveExtraLocations(list: ExtraLocation[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/** Merge API camps (by `location` string) with user-defined locations not yet tied to camps. */
export function mergeLocationSummaries(
    camps: Array<{ location?: string }>,
    extras: ExtraLocation[],
): LocationSummary[] {
    const countByName = new Map<string, number>()
    for (const c of camps) {
        const n = c.location?.trim()
        if (!n) continue
        countByName.set(n, (countByName.get(n) || 0) + 1)
    }

    function campCountForName(name: string): number {
        const key = name.trim().toLowerCase()
        for (const [k, v] of countByName) {
            if (k.toLowerCase() === key) return v
        }
        return 0
    }

    const result: LocationSummary[] = []
    const covered = new Set<string>()

    for (const e of extras) {
        const name = e.name.trim()
        if (!name) continue
        result.push({
            id: e.id,
            name,
            address: e.address,
            campCount: campCountForName(name),
        })
        covered.add(name.toLowerCase())
    }

    for (const [campLoc, count] of countByName) {
        const key = campLoc.toLowerCase()
        if (covered.has(key)) continue
        result.push({
            id: simpleId(campLoc),
            name: campLoc,
            address: undefined,
            campCount: count,
        })
    }

    return result.sort((a, b) => a.name.localeCompare(b.name))
}

export function tryAppendExtraLocation(
    name: string,
    address: string | undefined,
    camps: Array<{ location?: string }>,
): { ok: true; list: ExtraLocation[] } | { ok: false; reason: string } {
    const trimmed = name.trim()
    if (!trimmed) return { ok: false, reason: 'Location name is required.' }

    const key = trimmed.toLowerCase()
    const fromCamps = new Set(
        camps
            .map((c) => c.location?.trim().toLowerCase())
            .filter(Boolean) as string[],
    )
    if (fromCamps.has(key)) {
        return {
            ok: false,
            reason:
                'This location name already exists from an existing camp. Pick another name or add a camp under it.',
        }
    }

    const list = readExtraLocations()
    const exists = list.some(
        (e) => e.name.trim().toLowerCase() === key,
    )
    if (exists) {
        return { ok: false, reason: 'A location with this name already exists.' }
    }

    const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const next: ExtraLocation = {
        id,
        name: trimmed,
        address: address?.trim() || undefined,
    }
    const merged = [...list, next]
    saveExtraLocations(merged)
    return { ok: true, list: merged }
}
