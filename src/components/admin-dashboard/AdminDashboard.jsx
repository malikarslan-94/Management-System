// src/components/admin-dashboard/AdminDashboard.jsx
import { Button, FormContainer, FormItem, Input } from '@/components/ui'
import { Select } from '@/components/ui/select'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleAdminPanel } from '@/store/theme/themeSlice'
import { useNavigate } from 'react-router-dom'
import React, { useCallback, useEffect, useState } from 'react'
import { HiArrowLeft, HiOutlineDuplicate, HiOutlinePlus } from 'react-icons/hi'
import { useBuildings } from '../../hooks/useBuildings'
import { useCamps } from '../../hooks/useCamps'
import { useEmployees } from '../../hooks/useEmployees'
import { useRooms } from '../../hooks/useRooms'

import {
    buildingsFromStructure,
    emptyBuildingRow,
    validateStructure,
} from '@/services/CampService'
import CampForm from './CampForm'
import CampsList from './CampsList'
import { BUILDING_TYPES, FLOOR_OPTIONS } from './CampStructureFields'
import RoomGeneratorForm from './RoomGeneratorForm'
import DialogWrapper from './DialogWrapper'
import EmployeeDetail from './EmployeeDetail'
import EmployeeForm from './EmployeeForm'
import EmployeeList from './EmployeeList'
import LoaderOverlay from './LoaderOverlay'
import RoomForm from './RoomForm'
import RoomsList from './RoomsList'
import Sidebar from './Sidebar'

const getInitialFormData = (tab) => {
    if (tab === 'camps') {
        return {
            type: 'camp',
            name: '',
            // Real reference to a Location document; `location` was a free-text
            // string that could not be resolved reliably.
            locationId: '',
            description: '',
            image: '',
            price: '',
            status: 'active',
            // Structure step — same as the Locations & Camps flow, so a camp
            // created here can accept rooms immediately too.
            structureMode: 'single',
            singleFloors: '1',
            buildingRows: [emptyBuildingRow()],
            id: undefined,
        }
    }
    if (tab === 'employees') {
        return {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            department: '',
            designation: '',
            employeeType: 'Permanent',
            campId: '',
            currentRoomId: null,
            status: 'Active',
            id: undefined,
        }
    }
    return {
        camp: '', // Used only to filter the building list; the API derives it
        buildingId: '',
        floor: 1,
        roomNumber: '',
        type: 'single', // Changed from roomType to type to match API
        capacity: '',
        price: '', // Changed from pricePerNight to price to match API
        amenities: [],
        status: 'available', // Replaces the isAvailable boolean
        description: '',
        images: [],
        id: undefined,
    }
}

const AdminDashboard = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const {
        camps,
        loading: campsLoading,
        addCamp,
        updateCamp,
        deleteCamp,
        fetchCamps,
    } = useCamps()

    const {
        rooms,
        loading: roomsLoading,
        addRoom,
        generateRooms,
        updateRoom,
        deleteRoom,
    } = useRooms()

    const {
        employees,
        loading: employeesLoading,
        addEmployee,
        updateEmployee,
        deleteEmployee,
    } = useEmployees()

    const { addBuilding } = useBuildings()

    const [activeTab, setActiveTab] = useState('camps')
    const [isOpen, setIsOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState(getInitialFormData('camps'))
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const showAddButton = activeTab !== 'users'
    const [errors, setErrors] = useState({})
    const adminPanelOpen = useAppSelector((state) => state.theme.adminPanelOpen)

    const isLoading = campsLoading || roomsLoading || employeesLoading

    useEffect(() => {
        document.body.style.overflow = adminPanelOpen ? 'hidden' : 'auto'
        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [adminPanelOpen])

    useEffect(() => {
        if (activeTab === 'rooms' || activeTab === 'employees') {
            fetchCamps()
        }
    }, [activeTab, fetchCamps])

    useEffect(() => {
        setFormData(getInitialFormData(activeTab))
        setErrors({})
    }, [activeTab])

    const validateField = useCallback(
        (name, value) => {
            const errs = { ...errors }

            switch (name) {
                case 'camp':
                case 'locationId':
                case 'buildingId':
                case 'name':
                case 'roomNumber':
                case 'type':
                    if (!value?.toString().trim()) errs[name] = 'Required'
                    else delete errs[name]
                    break
                case 'firstName':
                case 'lastName':
                case 'email':
                case 'phone':
                case 'employeeType':
                    if (activeTab === 'employees') {
                        if (!value?.toString().trim()) errs[name] = 'Required'
                        else if (
                            name === 'email' &&
                            value &&
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                        ) {
                            errs[name] = 'Invalid email format'
                        } else delete errs[name]
                    }
                    break
                case 'capacity':
                case 'price':
                    const num = Number(value)
                    if (isNaN(num) || num < 0) errs[name] = 'Must be ≥ 0'
                    else delete errs[name]
                    break
                default:
                    break
            }

            setErrors(errs)
            return Object.keys(errs).length === 0
        },
        [activeTab, formData, errors],
    )

    const validateForm = useCallback(() => {
        let fields = []
        if (activeTab === 'camps') {
            fields = ['name', 'locationId']
        } else if (activeTab === 'employees') {
            fields = ['firstName', 'lastName', 'email', 'phone', 'employeeType']
        } else {
            // buildingId is required now — a room cannot exist outside a building.
            fields = [
                'camp',
                'buildingId',
                'roomNumber',
                'type',
                'capacity',
                'price',
            ]
        }
        return fields.every((field) => validateField(field, formData[field]))
    }, [activeTab, formData, validateField])

    const handleInputChange = (e) => {
        const { name, value, type } = e.target
        const val = type === 'number' ? value : value
        setFormData((prev) => ({ ...prev, [name]: val }))
    }

    const handleSelectChange = useCallback(
        (name) => (e) => {
            const val = e?.target?.value ?? e
            setFormData((prev) => ({ ...prev, [name]: val }))
            validateField(name, val)
        },
        [validateField],
    )

    /** Sets a form field directly, for values that aren't plain inputs (arrays, modes). */
    const setFieldValue = useCallback((name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }, [])

    // Add a building to an existing camp — same action as the camp cards on
    // Locations & camps.
    const [buildingModalOpen, setBuildingModalOpen] = useState(false)
    const [buildingTargetCamp, setBuildingTargetCamp] = useState(null)
    const [buildingForm, setBuildingForm] = useState(emptyBuildingRow())
    const [buildingSubmitting, setBuildingSubmitting] = useState(false)

    const handleOpenAddBuilding = (camp) => {
        setBuildingTargetCamp({ id: camp._id, name: camp.name })
        setBuildingForm(emptyBuildingRow())
        setBuildingModalOpen(true)
    }

    const handleSaveBuilding = async () => {
        if (!buildingTargetCamp || !buildingForm.name.trim()) {
            setErrors((prev) => ({
                ...prev,
                buildingName: 'Building name is required',
            }))
            return
        }
        setBuildingSubmitting(true)
        try {
            await addBuilding({
                campId: buildingTargetCamp.id,
                name: buildingForm.name.trim(),
                type: buildingForm.type,
                floors: Math.max(1, parseInt(buildingForm.floors, 10) || 1),
                status: 'active',
            })
            await fetchCamps()
            setBuildingModalOpen(false)
            setErrors({})
        } catch {
            /* addBuilding already toasts */
        } finally {
            setBuildingSubmitting(false)
        }
    }

    // Bulk room generation — same capability as Room Management on the dashboard.
    const [isGenerateOpen, setIsGenerateOpen] = useState(false)
    const [generateCampId, setGenerateCampId] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [generateValid, setGenerateValid] = useState(false)
    const generatePayloadRef = React.useRef(null)

    const handleGenerateRooms = async () => {
        const payload = generatePayloadRef.current
        if (!payload?.buildingId || payload.floors.length === 0) return

        setIsGenerating(true)
        try {
            await generateRooms(payload.buildingId, payload.floors)
            setIsGenerateOpen(false)
            setGenerateCampId('')
        } catch {
            /* generateRooms already toasts, including every colliding number */
        } finally {
            setIsGenerating(false)
        }
    }

    const handleAmenityChange = useCallback((amenity, checked) => {
        setFormData((prev) => {
            const setA = new Set(prev.amenities || [])
            checked ? setA.add(amenity) : setA.delete(amenity)
            return { ...prev, amenities: Array.from(setA) }
        })
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) {
            console.error('Validation failed', errors)
            return
        }

        try {
            if (isEditing) {
                if (activeTab === 'camps') {
                    const campData = {
                        name: formData.name,
                        locationId: formData.locationId,
                        description: formData.description,
                        price: Number(formData.price) || 0,
                        image: formData.image || '',
                        rating: Number(formData.rating) || 0,
                        status: formData.status || 'active',
                    }
                    await updateCamp(formData._id || formData.id, campData)
                } else if (activeTab === 'employees') {
                    // Extract ID from populated objects if they exist
                    const campIdValue =
                        typeof formData.campId === 'object' && formData.campId
                            ? formData.campId._id || formData.campId
                            : formData.campId?.toString().trim() || undefined
                    const employeeData = {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                        iqamaNumber: formData.iqamaNumber,
                        employeeId: formData.employeeId,
                        department: formData.department?.trim() || undefined,
                        designation: formData.designation?.trim() || undefined,
                        employeeType: formData.employeeType || 'Permanent',
                        campId: campIdValue,
                        status: formData.status || 'Active',
                    }
                    // Remove undefined fields to avoid sending them
                    Object.keys(employeeData).forEach(
                        (key) =>
                            employeeData[key] === undefined &&
                            delete employeeData[key],
                    )
                    await updateEmployee(
                        formData._id || formData.id,
                        employeeData,
                    )
                } else {
                    // `camp` is omitted deliberately: the API derives it from
                    // the building so the two can never disagree.
                    const roomData = {
                        buildingId: formData.buildingId,
                        floor: Number(formData.floor) || 1,
                        roomNumber: formData.roomNumber,
                        type: formData.type,
                        capacity: Number(formData.capacity),
                        price: Number(formData.price) || 0,
                        amenities: formData.amenities || [],
                        status: formData.status || 'available',
                        description: formData.description || '',
                        images: formData.images || [],
                    }
                    await updateRoom(formData._id || formData.id, roomData)
                }
            } else {
                if (activeTab === 'camps') {
                    // Same structure step as the Locations & Camps flow, through
                    // the same helpers, so both produce identical payloads.
                    const buildings = buildingsFromStructure({
                        mode: formData.structureMode || 'single',
                        campName: formData.name || '',
                        singleFloors: formData.singleFloors || '1',
                        rows: formData.buildingRows || [],
                    })

                    const structureError = validateStructure(buildings)
                    if (structureError) {
                        setErrors((prev) => ({
                            ...prev,
                            buildingRows: structureError,
                        }))
                        return
                    }

                    const campData = {
                        name: formData.name,
                        locationId: formData.locationId,
                        description: formData.description,
                        price: Number(formData.price) || 0,
                        image: formData.image || '',
                        buildings,
                    }
                    await addCamp(campData)
                    await fetchCamps() // ✅ refresh list after adding
                } else if (activeTab === 'employees') {
                    // Extract ID from populated objects if they exist
                    const campIdValue =
                        typeof formData.campId === 'object' && formData.campId
                            ? formData.campId._id || formData.campId
                            : formData.campId?.toString().trim() || undefined
                    const employeeData = {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                        iqamaNumber: formData.iqamaNumber,
                        employeeId: formData.employeeId,
                        department: formData.department?.trim() || undefined,
                        designation: formData.designation?.trim() || undefined,
                        employeeType: formData.employeeType || 'Permanent',
                        campId: campIdValue,
                        status: formData.status || 'Active',
                    }
                    // Remove undefined fields to avoid sending them
                    Object.keys(employeeData).forEach(
                        (key) =>
                            employeeData[key] === undefined &&
                            delete employeeData[key],
                    )
                    await addEmployee(employeeData)
                } else {
                    // `camp` is omitted deliberately: the API derives it from
                    // the building so the two can never disagree.
                    const roomData = {
                        buildingId: formData.buildingId,
                        floor: Number(formData.floor) || 1,
                        roomNumber: formData.roomNumber,
                        type: formData.type,
                        capacity: Number(formData.capacity),
                        price: Number(formData.price) || 0,
                        amenities: formData.amenities || [],
                        status: formData.status || 'available',
                        description: formData.description || '',
                        images: formData.images || [],
                    }
                    await addRoom(roomData)
                    // ✅ Refresh rooms list after adding
                    if (activeTab === 'rooms') {
                        // Rooms will be refreshed automatically by the useRooms hook
                    }
                }
            }

            // ✅ close modal only after success
            setIsOpen(false)
            setFormData(getInitialFormData(activeTab))
            setErrors({})
        } catch (error) {
            alert(
                `Failed to ${isEditing ? 'update' : 'create'} ${activeTab.slice(
                    0,
                    -1,
                )}. Please check the console for details.`,
            )
        }
    }

    const handleDelete = async (id) => {
        const itemType = activeTab.slice(0, -1) // Remove 's' from 'camps', 'rooms', or 'employees'
        if (
            !window.confirm(
                `Are you sure you want to ${
                    activeTab === 'employees' ? 'deactivate' : 'delete'
                } this ${itemType}? ${
                    activeTab === 'employees'
                        ? 'The employee will be marked as Inactive.'
                        : 'This action cannot be undone.'
                }`,
            )
        )
            return

        try {
            if (activeTab === 'camps') {
                await deleteCamp(id)
            } else if (activeTab === 'employees') {
                await deleteEmployee(id)
            } else {
                await deleteRoom(id)
            }
        } catch (err) {
            console.error(`Error deleting ${itemType}:`, err)
            alert(
                `Failed to ${
                    activeTab === 'employees' ? 'deactivate' : 'delete'
                } ${itemType}. Please try again.`,
            )
        }
    }

    const handleViewEmployee = (employee) => {
        setSelectedEmployee(employee)
    }

    const handleAddNew = () => {
        setFormData(getInitialFormData(activeTab))
        setIsEditing(false)
        setIsOpen(true)
        setErrors({})
    }

    const handleEdit = (item) => {
        // References come back populated from the API, so flatten them to ids
        // before they reach the form's select inputs.
        const idOf = (value) =>
            typeof value === 'object' && value !== null
                ? value._id || ''
                : value || ''

        const formData = {
            ...item,
            id: item._id,
            locationId: idOf(item.locationId),
            camp: idOf(item.camp),
            buildingId: idOf(item.buildingId),
        }
        setFormData(formData)
        setIsEditing(true)
        setIsOpen(true)
        setErrors({})
    }

    if (!adminPanelOpen) return null

    const getClass = (field) =>
        errors[field] ? 'border-red-500 focus:border-red-500' : ''

    return (
        <div className="fixed inset-0 z-40 flex">
            <div className="w-64 bg-white h-full shadow-lg">
                <Sidebar
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        if (tab === 'users') {
                            dispatch(toggleAdminPanel())
                            navigate('/settings-roles')
                        } else setActiveTab(tab)
                    }}
                />
            </div>
            <div className="flex-1 bg-gray-100 h-full overflow-y-auto relative">
                <div className="p-6">
                    <button
                        onClick={() => dispatch(toggleAdminPanel())}
                        className="absolute top-0 left-0 flex items-center text-slate-800 text-xl z-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    >
                        <HiArrowLeft className="mr-1" />
                    </button>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold capitalize">
                            {activeTab}
                        </h1>
                        <div className="flex gap-2">
                            {activeTab === 'rooms' && (
                                <Button
                                    icon={<HiOutlineDuplicate />}
                                    onClick={() => setIsGenerateOpen(true)}
                                >
                                    Generate Rooms
                                </Button>
                            )}
                            {showAddButton && (
                                <Button
                                    icon={<HiOutlinePlus />}
                                    variant="solid"
                                    onClick={handleAddNew}
                                >
                                    Add New {activeTab.slice(0, -1)}
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="relative">
                        <LoaderOverlay isLoading={isLoading} />
                        {activeTab === 'camps' ? (
                            <CampsList
                                camps={camps}
                                rooms={rooms}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onAddBuilding={handleOpenAddBuilding}
                            />
                        ) : activeTab === 'employees' ? (
                            <EmployeeList
                                employees={employees}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onView={handleViewEmployee}
                            />
                        ) : (
                            <RoomsList
                                rooms={rooms}
                                camps={camps}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        )}
                    </div>
                </div>
            </div>
            <DialogWrapper
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={`${isEditing ? 'Edit' : 'Add'} ${activeTab.slice(
                    0,
                    -1,
                )}`}
                onConfirm={handleSubmit}
                isLoading={isLoading}
            >
                {activeTab === 'camps' ? (
                    <CampForm
                        formData={formData}
                        errors={errors}
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                        handleSelectChange={handleSelectChange}
                        setFieldValue={setFieldValue}
                        validateField={validateField}
                        getClass={getClass}
                    />
                ) : activeTab === 'employees' ? (
                    <EmployeeForm
                        formData={formData}
                        errors={errors}
                        camps={camps}
                        rooms={rooms}
                        handleInputChange={handleInputChange}
                        handleSelectChange={handleSelectChange}
                        validateField={validateField}
                        getClass={getClass}
                    />
                ) : (
                    <RoomForm
                        formData={formData}
                        errors={errors}
                        camps={camps}
                        handleInputChange={handleInputChange}
                        handleSelectChange={handleSelectChange}
                        handleAmenityChange={handleAmenityChange}
                        validateField={validateField}
                        getClass={getClass}
                    />
                )}
            </DialogWrapper>
            <DialogWrapper
                isOpen={buildingModalOpen}
                onClose={() => setBuildingModalOpen(false)}
                title="Add building / block"
                subtitle={
                    buildingTargetCamp
                        ? `Camp: ${buildingTargetCamp.name}`
                        : undefined
                }
                onConfirm={handleSaveBuilding}
                isLoading={buildingSubmitting}
                confirmLabel="Save building"
            >
                <FormContainer layout="vertical" size="sm">
                    <FormItem
                        label="Name"
                        required
                        extra="e.g. Block A, Building 1, Main Building"
                    >
                        <Input
                            value={buildingForm.name}
                            onChange={(e) =>
                                setBuildingForm((f) => ({
                                    ...f,
                                    name: e.target.value,
                                }))
                            }
                            placeholder="Building name"
                        />
                        {errors.buildingName && (
                            <div className="text-xs text-red-600">
                                {errors.buildingName}
                            </div>
                        )}
                    </FormItem>
                    <FormItem label="Type">
                        <Select
                            value={
                                BUILDING_TYPES.find(
                                    (o) => o.value === buildingForm.type,
                                ) || BUILDING_TYPES[0]
                            }
                            onChange={(selected) =>
                                setBuildingForm((f) => ({
                                    ...f,
                                    type: selected?.value || 'residential',
                                }))
                            }
                            options={BUILDING_TYPES}
                            classNamePrefix="react-select"
                        />
                    </FormItem>
                    <FormItem
                        label="Number of floors"
                        extra="Use 1 for containers or single-storey blocks"
                    >
                        <Select
                            value={
                                FLOOR_OPTIONS.find(
                                    (o) => o.value === buildingForm.floors,
                                ) || FLOOR_OPTIONS[0]
                            }
                            onChange={(selected) =>
                                setBuildingForm((f) => ({
                                    ...f,
                                    floors: selected?.value || '1',
                                }))
                            }
                            options={FLOOR_OPTIONS}
                            classNamePrefix="react-select"
                        />
                    </FormItem>
                </FormContainer>
            </DialogWrapper>
            <DialogWrapper
                isOpen={isGenerateOpen}
                onClose={() => {
                    setIsGenerateOpen(false)
                    setGenerateCampId('')
                }}
                title="Generate Rooms"
                subtitle="Create every room on a floor at once. Nothing is saved if any room number is already taken."
                onConfirm={handleGenerateRooms}
                isLoading={isGenerating}
                confirmLabel="Generate"
                loadingLabel="Generating..."
                confirmDisabled={!generateValid}
            >
                <RoomGeneratorForm
                    camps={camps}
                    campId={generateCampId}
                    onCampChange={setGenerateCampId}
                    onValidChange={setGenerateValid}
                    formRef={generatePayloadRef}
                />
            </DialogWrapper>
            {selectedEmployee && (
                <EmployeeDetail
                    employee={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </div>
    )
}

export default AdminDashboard
