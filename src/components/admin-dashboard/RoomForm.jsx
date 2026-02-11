// src/components/admin-dashboard/RoomForm.jsx
import { Checkbox, FormContainer, FormItem, Input } from '@/components/ui'
import { Select } from '@/components/ui/select'
import React from 'react'

const RoomForm = ({
    formData,
    errors,
    camps,
    handleInputChange,
    handleSelectChange,
    handleCheckboxChange,
    handleAmenityChange,
    validateField,
    getClass,
}) => {
    const AMENITIES = ['wifi', 'ac', 'tv', 'balcony', 'kitchen']
    const roomTypes = [
        { value: 'single', label: 'Single' },
        { value: 'double', label: 'Double' },
        { value: 'suite', label: 'Suite' },
        { value: 'family', label: 'Family' },
    ]

    return (
        <FormContainer layout="vertical" size="sm">
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
                    options={camps.map((c) => ({
                        value: c._id,
                        label: c.name,
                    }))}
                    placeholder="Select a camp"
                    classNamePrefix="react-select"
                />
                {errors.camp && (
                    <div className="text-xs text-red-600">{errors.camp}</div>
                )}
            </FormItem>

            <FormItem label="Room Number" required>
                <Input
                    name="roomNumber"
                    value={formData.roomNumber || ''}
                    onChange={handleInputChange}
                    onBlur={(e) => validateField('roomNumber', e.target.value)}
                    className={`w-full ${getClass('roomNumber')}`}
                />
                {errors.roomNumber && (
                    <div className="text-xs text-red-600">
                        {errors.roomNumber}
                    </div>
                )}
            </FormItem>

            <FormItem label="Room Type" required>
                <Select
                    value={
                        roomTypes.find((opt) => opt.value === formData.type) ||
                        null
                    }
                    onChange={(selected) =>
                        handleSelectChange('type')({
                            target: { value: selected ? selected.value : '' },
                        })
                    }
                    options={roomTypes}
                    placeholder="Select type"
                    classNamePrefix="react-select"
                />
                {errors.type && (
                    <div className="text-xs text-red-600">{errors.type}</div>
                )}
            </FormItem>

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
                    <div className="text-xs text-red-600">
                        {errors.capacity}
                    </div>
                )}
            </FormItem>

            {/* Price field hidden from UI but still in form data for backend */}
            <input
                type="hidden"
                name="price"
                value={formData.price || 0}
            />

            <FormItem label="Available" required>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        checked={formData.isAvailable}
                        onChange={(checked) =>
                            handleCheckboxChange('isAvailable')({
                                target: { value: checked },
                            })
                        }
                    >
                        Room is available for booking
                    </Checkbox>
                </div>
            </FormItem>

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
