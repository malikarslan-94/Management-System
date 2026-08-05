import { buildingApi, campApi } from '@/services/api'
import { FormContainer, FormItem, Input, Checkbox } from '@/components/ui'
import { Select } from '@/components/ui/select'
import React, { useEffect, useMemo, useState } from 'react'

const AMENITIES = ['wifi', 'ac', 'tv', 'balcony', 'kitchen']
const ROOM_TYPES = [
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
    { value: 'suite', label: 'Suite' },
    { value: 'family', label: 'Family' },
]

/** Default numbering for a floor: floor 1 → 101, floor 3 → 301. */
const defaultStart = (floor) => `${floor}01`

const makeFloorSpec = (floor) => ({
    floor,
    include: true,
    count: '10',
    startNumber: defaultStart(floor),
    type: 'double',
    capacity: '2',
})

/**
 * Generates every room on one or more floors of a building in a single request,
 * instead of one modal round-trip per room.
 *
 * Calls `onSubmit(buildingId, floorSpecs)` — the caller owns the API call so it
 * can refresh its own room list.
 */
const RoomGeneratorForm = ({ campId, onCampChange, camps, onValidChange, formRef }) => {
    const [buildings, setBuildings] = useState([])
    const [buildingsLoading, setBuildingsLoading] = useState(false)
    const [buildingId, setBuildingId] = useState('')
    const [floorSpecs, setFloorSpecs] = useState([])
    const [price, setPrice] = useState('0')
    const [amenities, setAmenities] = useState([])

    // Buildings for the chosen camp.
    useEffect(() => {
        if (!campId) {
            setBuildings([])
            setBuildingId('')
            return
        }
        setBuildingsLoading(true)
        campApi
            .getBuildings(campId)
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : []
                setBuildings(data)
                // One building means no choice to make.
                setBuildingId(data.length === 1 ? data[0]._id : '')
            })
            .catch(() => setBuildings([]))
            .finally(() => setBuildingsLoading(false))
    }, [campId])

    const selectedBuilding = useMemo(
        () => buildings.find((b) => b._id === buildingId),
        [buildings, buildingId],
    )

    // One row per floor the building actually has.
    useEffect(() => {
        if (!selectedBuilding) {
            setFloorSpecs([])
            return
        }
        setFloorSpecs(
            Array.from({ length: selectedBuilding.floors }, (_, i) => makeFloorSpec(i + 1)),
        )
    }, [selectedBuilding])

    const updateSpec = (floor, patch) =>
        setFloorSpecs((prev) => prev.map((s) => (s.floor === floor ? { ...s, ...patch } : s)))

    const activeSpecs = floorSpecs.filter((s) => s.include && Number(s.count) > 0)

    /** Preview of what will be created, e.g. "101–110". */
    const previewFor = (spec) => {
        const match = String(spec.startNumber).match(/^(.*?)(\d+)$/)
        const count = Number(spec.count)
        if (!match || !count) return '—'
        const [, prefix, digits] = match
        const start = parseInt(digits, 10)
        const end = start + count - 1
        const pad = (n) => `${prefix}${String(n).padStart(digits.length, '0')}`
        return count === 1 ? pad(start) : `${pad(start)}–${pad(end)}`
    }

    const totalRooms = activeSpecs.reduce((sum, s) => sum + Number(s.count || 0), 0)

    // Hand the caller a builder for the payload plus whether it is submittable.
    useEffect(() => {
        const valid = Boolean(buildingId) && activeSpecs.length > 0
        onValidChange?.(valid)
        if (formRef) {
            formRef.current = {
                buildingId,
                floors: activeSpecs.map((s) => ({
                    floor: s.floor,
                    count: Number(s.count),
                    startNumber: String(s.startNumber).trim(),
                    type: s.type,
                    capacity: Number(s.capacity),
                    price: Number(price) || 0,
                    amenities,
                })),
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildingId, floorSpecs, price, amenities])

    const campOptions = camps.map((c) => ({ value: c._id, label: c.name }))
    const buildingOptions = buildings.map((b) => ({
        value: b._id,
        label: `${b.name} (${b.floors} floor${b.floors === 1 ? '' : 's'})`,
    }))

    return (
        <FormContainer layout="vertical" size="sm">
            <FormItem label="Camp" required>
                <Select
                    value={campOptions.find((o) => o.value === campId) || null}
                    onChange={(selected) => onCampChange(selected ? selected.value : '')}
                    options={campOptions}
                    placeholder="Select a camp"
                    classNamePrefix="react-select"
                />
            </FormItem>

            {campId && (
                <>
                    {buildingsLoading && (
                        <div className="text-xs text-gray-400 py-1">Loading buildings...</div>
                    )}

                    {!buildingsLoading && buildings.length === 0 && (
                        <div className="text-xs text-red-500 py-1 font-medium">
                            No buildings in this camp. Add a building first.
                        </div>
                    )}

                    {buildings.length === 1 && (
                        <div className="text-xs text-gray-500 py-1">
                            Building:{' '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {buildings[0].name}
                            </span>{' '}
                            ({buildings[0].floors} floor
                            {buildings[0].floors === 1 ? '' : 's'}, auto-selected)
                        </div>
                    )}

                    {buildings.length >= 2 && (
                        <FormItem label="Building" required>
                            <Select
                                value={buildingOptions.find((o) => o.value === buildingId) || null}
                                onChange={(selected) => setBuildingId(selected ? selected.value : '')}
                                options={buildingOptions}
                                placeholder="Select a building"
                                classNamePrefix="react-select"
                            />
                        </FormItem>
                    )}
                </>
            )}

            {floorSpecs.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Rooms per floor
                    </div>

                    <div className="space-y-2">
                        {floorSpecs.map((spec) => (
                            <div
                                key={spec.floor}
                                className={`rounded border px-2 py-2 ${
                                    spec.include
                                        ? 'border-gray-200 dark:border-gray-600'
                                        : 'border-dashed border-gray-200 dark:border-gray-700 opacity-60'
                                }`}
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Checkbox
                                        checked={spec.include}
                                        onChange={(checked) => updateSpec(spec.floor, { include: checked })}
                                    >
                                        <span className="text-xs font-medium whitespace-nowrap">
                                            Floor {spec.floor}
                                        </span>
                                    </Checkbox>

                                    <div className="w-20">
                                        <Input
                                            size="sm"
                                            type="number"
                                            min="0"
                                            value={spec.count}
                                            disabled={!spec.include}
                                            onChange={(e) => updateSpec(spec.floor, { count: e.target.value })}
                                            placeholder="Qty"
                                        />
                                    </div>

                                    <div className="w-24">
                                        <Input
                                            size="sm"
                                            value={spec.startNumber}
                                            disabled={!spec.include}
                                            onChange={(e) =>
                                                updateSpec(spec.floor, { startNumber: e.target.value })
                                            }
                                            placeholder="Start"
                                        />
                                    </div>

                                    <div className="w-28">
                                        <Select
                                            size="sm"
                                            isDisabled={!spec.include}
                                            value={ROOM_TYPES.find((o) => o.value === spec.type)}
                                            onChange={(selected) =>
                                                updateSpec(spec.floor, { type: selected?.value })
                                            }
                                            options={ROOM_TYPES}
                                            classNamePrefix="react-select"
                                        />
                                    </div>

                                    <div className="w-20">
                                        <Input
                                            size="sm"
                                            type="number"
                                            min="1"
                                            value={spec.capacity}
                                            disabled={!spec.include}
                                            onChange={(e) =>
                                                updateSpec(spec.floor, { capacity: e.target.value })
                                            }
                                            placeholder="Cap"
                                        />
                                    </div>
                                </div>

                                {spec.include && (
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-6">
                                        Will create: {previewFor(spec)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <FormItem label="Price per room" className="mt-3 mb-2">
                        <Input
                            size="sm"
                            type="number"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </FormItem>

                    <FormItem label="Amenities (applied to every room)" className="mb-2">
                        <div className="grid grid-cols-3 gap-1">
                            {AMENITIES.map((amenity) => (
                                <Checkbox
                                    key={amenity}
                                    checked={amenities.includes(amenity)}
                                    onChange={(checked) =>
                                        setAmenities((prev) =>
                                            checked ? [...prev, amenity] : prev.filter((a) => a !== amenity),
                                        )
                                    }
                                >
                                    <span className="text-xs">{amenity}</span>
                                </Checkbox>
                            ))}
                        </div>
                    </FormItem>

                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 border-t border-gray-100 dark:border-gray-700 pt-2">
                        Total: {totalRooms} room{totalRooms === 1 ? '' : 's'}
                    </div>
                </div>
            )}
        </FormContainer>
    )
}

export default RoomGeneratorForm
