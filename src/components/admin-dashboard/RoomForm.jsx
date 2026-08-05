import { buildingApi } from '@/services/api'
import { Checkbox, FormContainer, FormItem, Input } from '@/components/ui'
import { Select } from '@/components/ui/select'
import React, { useEffect, useState } from 'react'

const AMENITIES = ['wifi', 'ac', 'tv', 'balcony', 'kitchen']
const ROOM_TYPES = [
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
    { value: 'suite', label: 'Suite' },
    { value: 'family', label: 'Family' },
]
// Mirrors the backend enum. Replaces the old available/not-available checkbox,
// which could not express maintenance or cleaning.
const ROOM_STATUSES = [
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'cleaning', label: 'Cleaning' },
]

const RoomForm = ({
    formData,
    errors,
    camps,
    handleInputChange,
    handleSelectChange,
    handleAmenityChange,
    validateField,
    getClass,
}) => {
    const [buildings, setBuildings] = useState([])
    const [buildingsLoading, setBuildingsLoading] = useState(false)

    useEffect(() => {
        if (!formData.camp) {
            setBuildings([])
            return
        }

        setBuildingsLoading(true)
        buildingApi
            .getAll({ campId: formData.camp })
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : []
                setBuildings(data)

                if (data.length === 1) {
                    // Auto-select the only building and reset floor to 1
                    handleSelectChange('buildingId')({ target: { value: data[0]._id } })
                    handleSelectChange('floor')({ target: { value: 1 } })
                } else {
                    // Reset building + floor when camp changes
                    handleSelectChange('buildingId')({ target: { value: '' } })
                    handleSelectChange('floor')({ target: { value: 1 } })
                }
            })
            .catch(() => setBuildings([]))
            .finally(() => setBuildingsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.camp])

    const selectedBuilding = buildings.find((b) => b._id === formData.buildingId)
    const showBuildingDropdown = buildings.length >= 2
    const showFloorPicker = selectedBuilding && selectedBuilding.floors > 1
    const noBuildingsError = !buildingsLoading && formData.camp && buildings.length === 0

    const floorOptions = selectedBuilding
        ? Array.from({ length: selectedBuilding.floors }, (_, i) => ({
              value: i + 1,
              label: `Floor ${i + 1}`,
          }))
        : []

    return (
        <FormContainer layout="vertical" size="sm">
            {/* Camp */}
            <FormItem label="Camp" required>
                <Select
                    value={
                        camps
                            .map((c) => ({ value: c._id, label: c.name }))
                            .find((opt) => opt.value === formData.camp) || null
                    }
                    onChange={(selected) =>
                        handleSelectChange('camp')({
                            target: { value: selected ? selected.value : '' },
                        })
                    }
                    options={camps.map((c) => ({ value: c._id, label: c.name }))}
                    placeholder="Select a camp"
                    classNamePrefix="react-select"
                />
                {errors.camp && (
                    <div className="text-xs text-red-600">{errors.camp}</div>
                )}
            </FormItem>

            {/* Building section — only renders once a camp is selected */}
            {formData.camp && (
                <>
                    {buildingsLoading && (
                        <div className="text-xs text-gray-400 py-1">
                            Loading buildings...
                        </div>
                    )}

                    {noBuildingsError && (
                        <div className="text-xs text-red-500 py-1 font-medium">
                            No buildings found in this camp. Please add a building first.
                        </div>
                    )}

                    {/* Single building — auto-selected, just show label */}
                    {!buildingsLoading && buildings.length === 1 && (
                        <div className="text-xs text-gray-500 py-1">
                            Building:{' '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {buildings[0].name}
                            </span>{' '}
                            (auto-selected)
                        </div>
                    )}

                    {/* Multiple buildings — show dropdown */}
                    {showBuildingDropdown && (
                        <FormItem label="Building" required>
                            <Select
                                value={
                                    buildings
                                        .map((b) => ({ value: b._id, label: b.name }))
                                        .find((opt) => opt.value === formData.buildingId) || null
                                }
                                onChange={(selected) => {
                                    handleSelectChange('buildingId')({
                                        target: { value: selected ? selected.value : '' },
                                    })
                                    // Reset floor when building changes
                                    handleSelectChange('floor')({ target: { value: 1 } })
                                }}
                                options={buildings.map((b) => ({
                                    value: b._id,
                                    label: b.name,
                                }))}
                                placeholder="Select a building"
                                classNamePrefix="react-select"
                            />
                            {errors.buildingId && (
                                <div className="text-xs text-red-600">
                                    {errors.buildingId}
                                </div>
                            )}
                        </FormItem>
                    )}

                    {/* Floor picker — only shown when building has multiple floors */}
                    {showFloorPicker && (
                        <FormItem label="Floor" required>
                            <Select
                                value={
                                    floorOptions.find(
                                        (opt) => opt.value === Number(formData.floor),
                                    ) || floorOptions[0] || null
                                }
                                onChange={(selected) =>
                                    handleSelectChange('floor')({
                                        target: { value: selected ? selected.value : 1 },
                                    })
                                }
                                options={floorOptions}
                                placeholder="Select floor"
                                classNamePrefix="react-select"
                            />
                        </FormItem>
                    )}
                </>
            )}

            {/* Room Number */}
            <FormItem label="Room Number" required>
                <Input
                    name="roomNumber"
                    value={formData.roomNumber || ''}
                    onChange={handleInputChange}
                    onBlur={(e) => validateField('roomNumber', e.target.value)}
                    className={`w-full ${getClass('roomNumber')}`}
                />
                {errors.roomNumber && (
                    <div className="text-xs text-red-600">{errors.roomNumber}</div>
                )}
            </FormItem>

            {/* Room Type */}
            <FormItem label="Room Type" required>
                <Select
                    value={ROOM_TYPES.find((opt) => opt.value === formData.type) || null}
                    onChange={(selected) =>
                        handleSelectChange('type')({
                            target: { value: selected ? selected.value : '' },
                        })
                    }
                    options={ROOM_TYPES}
                    placeholder="Select type"
                    classNamePrefix="react-select"
                />
                {errors.type && (
                    <div className="text-xs text-red-600">{errors.type}</div>
                )}
            </FormItem>

            {/* Capacity */}
            <FormItem label="Capacity" required>
                <Input
                    type="number"
                    name="capacity"
                    min="1"
                    value={formData.capacity || ''}
                    onChange={handleInputChange}
                    onBlur={(e) => validateField('capacity', e.target.value)}
                    className={`w-full ${getClass('capacity')}`}
                />
                {errors.capacity && (
                    <div className="text-xs text-red-600">{errors.capacity}</div>
                )}
            </FormItem>

            <input type="hidden" name="price" value={formData.price || 0} />

            {/* Status */}
            <FormItem label="Status" required>
                <Select
                    value={
                        ROOM_STATUSES.find((opt) => opt.value === formData.status) ||
                        ROOM_STATUSES[0]
                    }
                    onChange={(selected) =>
                        handleSelectChange('status')({
                            target: { value: selected ? selected.value : 'available' },
                        })
                    }
                    options={ROOM_STATUSES}
                    classNamePrefix="react-select"
                />
            </FormItem>

            {/* Amenities */}
            <FormItem label="Amenities">
                <div className="grid grid-cols-2 gap-2">
                    {AMENITIES.map((amenity) => (
                        <Checkbox
                            key={amenity}
                            checked={formData.amenities?.includes(amenity)}
                            onChange={(checked) =>
                                handleAmenityChange(amenity, checked)
                            }
                        >
                            {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                        </Checkbox>
                    ))}
                </div>
            </FormItem>

            {/* Description */}
            <FormItem label="Description">
                <Input
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    placeholder="Room description..."
                    className="w-full"
                />
            </FormItem>
        </FormContainer>
    )
}

export default RoomForm
