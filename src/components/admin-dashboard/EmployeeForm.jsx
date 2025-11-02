// src/components/admin-dashboard/EmployeeForm.jsx
import { FormContainer, FormItem, Input } from '@/components/ui'
import { Select } from '@/components/ui/select'
import React from 'react'

const EmployeeForm = ({
    formData,
    errors,
    camps,
    rooms,
    handleInputChange,
    handleSelectChange,
    validateField,
    getClass,
}) => {
    const employeeTypes = [
        { value: 'Permanent', label: 'Permanent' },
        { value: 'Temporary', label: 'Temporary' },
        { value: 'Visitor', label: 'Visitor' },
    ]

    const statusOptions = [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
    ]

    // Filter rooms by selected camp
    const availableRooms = formData.campId
        ? rooms.filter(
              (room) =>
                  room.camp === formData.campId ||
                  room.camp?._id === formData.campId,
          )
        : []

    return (
        <FormContainer layout="vertical" size="sm">
            <div className="grid grid-cols-2 gap-4">
                <FormItem label="First Name" required>
                    <Input
                        name="firstName"
                        value={formData.firstName || ''}
                        onChange={handleInputChange}
                        onBlur={(e) =>
                            validateField('firstName', e.target.value)
                        }
                        className={`w-full ${getClass('firstName')}`}
                        placeholder="John"
                    />
                    {errors.firstName && (
                        <div className="text-xs text-red-600">
                            {errors.firstName}
                        </div>
                    )}
                </FormItem>

                <FormItem label="Last Name" required>
                    <Input
                        name="lastName"
                        value={formData.lastName || ''}
                        onChange={handleInputChange}
                        onBlur={(e) =>
                            validateField('lastName', e.target.value)
                        }
                        className={`w-full ${getClass('lastName')}`}
                        placeholder="Doe"
                    />
                    {errors.lastName && (
                        <div className="text-xs text-red-600">
                            {errors.lastName}
                        </div>
                    )}
                </FormItem>
            </div>

            <FormItem label="Email" required>
                <Input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    onBlur={(e) => validateField('email', e.target.value)}
                    className={`w-full ${getClass('email')}`}
                    placeholder="john.doe@example.com"
                />
                {errors.email && (
                    <div className="text-xs text-red-600">{errors.email}</div>
                )}
            </FormItem>

            <FormItem label="Phone" required>
                <Input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    onBlur={(e) => validateField('phone', e.target.value)}
                    className={`w-full ${getClass('phone')}`}
                    placeholder="+1234567890"
                />
                {errors.phone && (
                    <div className="text-xs text-red-600">{errors.phone}</div>
                )}
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
                <FormItem label="Department">
                    <Input
                        name="department"
                        value={formData.department || ''}
                        onChange={handleInputChange}
                        className="w-full"
                        placeholder="IT, HR, Finance..."
                    />
                </FormItem>

                <FormItem label="Designation">
                    <Input
                        name="designation"
                        value={formData.designation || ''}
                        onChange={handleInputChange}
                        className="w-full"
                        placeholder="Manager, Developer..."
                    />
                </FormItem>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormItem label="Employee Type" required>
                    <Select
                        value={
                            employeeTypes.find(
                                (opt) => opt.value === formData.employeeType,
                            ) || null
                        }
                        onChange={(selected) =>
                            handleSelectChange('employeeType')({
                                target: {
                                    value: selected
                                        ? selected.value
                                        : 'Permanent',
                                },
                            })
                        }
                        options={employeeTypes}
                        placeholder="Select employee type"
                        classNamePrefix="react-select"
                    />
                    {errors.employeeType && (
                        <div className="text-xs text-red-600">
                            {errors.employeeType}
                        </div>
                    )}
                </FormItem>

                <FormItem label="Status">
                    <Select
                        value={
                            statusOptions.find(
                                (opt) => opt.value === formData.status,
                            ) || null
                        }
                        onChange={(selected) =>
                            handleSelectChange('status')({
                                target: {
                                    value: selected ? selected.value : 'Active',
                                },
                            })
                        }
                        options={statusOptions}
                        placeholder="Select status"
                        classNamePrefix="react-select"
                    />
                </FormItem>
            </div>

            <FormItem label="Camp">
                <Select
                    value={
                        camps
                            .map((c) => ({ value: c._id, label: c.name }))
                            .find(
                                (opt) =>
                                    opt.value ===
                                    (typeof formData.campId === 'object' &&
                                    formData.campId
                                        ? formData.campId._id
                                        : formData.campId),
                            ) || null
                    }
                    onChange={(selected) =>
                        handleSelectChange('campId')({
                            target: { value: selected ? selected.value : '' },
                        })
                    }
                    options={camps.map((c) => ({
                        value: c._id,
                        label: c.name,
                    }))}
                    placeholder="Select a camp (optional)"
                    classNamePrefix="react-select"
                    isClearable
                />
            </FormItem>

            <FormItem label="Current Room">
                <Select
                    value={
                        availableRooms
                            .map((r) => ({
                                value: r._id,
                                label: `${r.roomNumber} (${r.type})`,
                            }))
                            .find(
                                (opt) => opt.value === formData.currentRoomId,
                            ) || null
                    }
                    onChange={(selected) =>
                        handleSelectChange('currentRoomId')({
                            target: {
                                value: selected ? selected.value : null,
                            },
                        })
                    }
                    options={availableRooms.map((r) => ({
                        value: r._id,
                        label: `${r.roomNumber} (${r.type})`,
                    }))}
                    placeholder={
                        formData.campId
                            ? 'Select a room (optional)'
                            : 'Select a camp first'
                    }
                    classNamePrefix="react-select"
                    isClearable
                    isDisabled={!formData.campId}
                />
                {!formData.campId && (
                    <div className="text-xs text-gray-500 mt-1">
                        Please select a camp first to assign a room
                    </div>
                )}
            </FormItem>
        </FormContainer>
    )
}

export default EmployeeForm
