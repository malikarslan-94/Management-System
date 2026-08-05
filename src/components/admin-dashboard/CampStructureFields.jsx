import { FormItem, Input, Button } from '@/components/ui'
import { Select } from '@/components/ui/select'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { emptyBuildingRow } from '@/services/CampService'
import React from 'react'

export const BUILDING_TYPES = [
    { value: 'residential', label: 'Residential' },
    { value: 'admin', label: 'Admin' },
    { value: 'medical', label: 'Medical' },
    { value: 'storage', label: 'Storage' },
    { value: 'other', label: 'Other' },
]

export const FLOOR_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: i === 0 ? '1 floor' : `${i + 1} floors`,
}))

/**
 * The "Structure" step of camp creation: is this camp one block or several, and
 * how many floors does each have.
 *
 * Shared by the Locations & Camps screen and the admin panel so the two cannot
 * drift apart. Only shown when creating — changing a camp's structure afterwards
 * means adding or removing buildings individually.
 *
 * @param structure {{ mode, singleFloors, rows }}
 * @param onChange  called with a partial structure patch
 */
const CampStructureFields = ({ structure, onChange }) => {
    const { mode, singleFloors, rows } = structure

    const updateRow = (index, patch) =>
        onChange({
            rows: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
        })

    return (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Structure
            </h4>

            <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                    <input
                        type="radio"
                        className="mt-1"
                        checked={mode === 'single'}
                        onChange={() => onChange({ mode: 'single' })}
                    />
                    <span className="text-sm">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            Single building / block
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                            The camp is one structure. A building named after the camp is
                            created for you.
                        </span>
                    </span>
                </label>

                {mode === 'single' && (
                    <div className="pl-6">
                        <FormItem label="Number of floors" className="mb-0">
                            <Select
                                value={
                                    FLOOR_OPTIONS.find((o) => o.value === String(singleFloors)) ||
                                    FLOOR_OPTIONS[0]
                                }
                                onChange={(selected) =>
                                    onChange({ singleFloors: selected ? selected.value : '1' })
                                }
                                options={FLOOR_OPTIONS}
                                classNamePrefix="react-select"
                            />
                        </FormItem>
                    </div>
                )}

                <label className="flex items-start gap-2 cursor-pointer">
                    <input
                        type="radio"
                        className="mt-1"
                        checked={mode === 'multi'}
                        onChange={() => onChange({ mode: 'multi' })}
                    />
                    <span className="text-sm">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            Multiple buildings
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                            Name each block and give it its own floor count.
                        </span>
                    </span>
                </label>

                {mode === 'multi' && (
                    <div className="pl-6 space-y-2">
                        {rows.map((row, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    className="flex-1"
                                    size="sm"
                                    value={row.name}
                                    onChange={(e) => updateRow(index, { name: e.target.value })}
                                    placeholder="e.g. Block A"
                                />
                                <div className="w-32">
                                    <Select
                                        size="sm"
                                        value={
                                            BUILDING_TYPES.find((o) => o.value === row.type) ||
                                            BUILDING_TYPES[0]
                                        }
                                        onChange={(selected) =>
                                            updateRow(index, { type: selected?.value })
                                        }
                                        options={BUILDING_TYPES}
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                <div className="w-28">
                                    <Select
                                        size="sm"
                                        value={
                                            FLOOR_OPTIONS.find((o) => o.value === row.floors) ||
                                            FLOOR_OPTIONS[0]
                                        }
                                        onChange={(selected) =>
                                            updateRow(index, { floors: selected?.value })
                                        }
                                        options={FLOOR_OPTIONS}
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="plain"
                                    icon={<HiOutlineTrash />}
                                    disabled={rows.length === 1}
                                    onClick={() =>
                                        onChange({ rows: rows.filter((_, i) => i !== index) })
                                    }
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            size="xs"
                            variant="plain"
                            icon={<HiOutlinePlus />}
                            onClick={() => onChange({ rows: [...rows, emptyBuildingRow()] })}
                        >
                            Add another building
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CampStructureFields
