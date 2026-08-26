import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    HiOutlineMap,
    HiOutlineOfficeBuilding,
    HiOutlineHome,
    HiOutlineUserGroup,
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineTrash,
    HiOutlineChevronRight,
} from 'react-icons/hi'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Statistic from '@/components/shared/Statistic/Statistic'
import Dialog from '@/components/ui/Dialog'
import {
    FormContainer,
    FormItem,
    Input,
    Notification,
    Select,
    Spinner,
    toast,
} from '@/components/ui'
import { useCamps } from '@/hooks/useCamps'
import { useBuildings } from '@/hooks/useBuildings'
import { useLocations } from '@/hooks/useLocations'
import {
    buildingsFromStructure,
    campLocationId,
    emptyBuildingRow,
    validateStructure,
    type BuildingSpec,
    type Camp,
} from '@/services/CampService'
import CampStructureFields, {
    BUILDING_TYPES,
    FLOOR_OPTIONS,
} from '@/components/admin-dashboard/CampStructureFields'

const emptyCampForm = (locationId = '') => ({
    locationId,
    name: '',
    description: '',
    price: '0',
    // A camp is either one block or several. Captured here so a new camp is
    // never left with nowhere to put rooms.
    mode: 'single' as 'single' | 'multi',
    singleFloors: '1',
    rows: [emptyBuildingRow()],
})

const LocationsCamps = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const {
        locations,
        loading: locationsLoading,
        error: locationsError,
        addLocation,
        deleteLocation,
        fetchLocations,
    } = useLocations()

    const {
        camps: allCamps,
        loading: campsLoading,
        error: campsError,
        addCamp,
        fetchCamps,
    } = useCamps()

    const { buildings, addBuilding, fetchBuildings } = useBuildings()

    const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [locationModalOpen, setLocationModalOpen] = useState(false)
    const [campModalOpen, setCampModalOpen] = useState(false)
    const [buildingModalOpen, setBuildingModalOpen] = useState(false)

    const [locationForm, setLocationForm] = useState({ name: '', city: '', address: '' })
    const [campForm, setCampForm] = useState(emptyCampForm())
    const [buildingTargetCamp, setBuildingTargetCamp] = useState<{ id: string; name: string } | null>(null)
    const [buildingForm, setBuildingForm] = useState(emptyBuildingRow())

    const [locationSubmitting, setLocationSubmitting] = useState(false)
    const [campSubmitting, setCampSubmitting] = useState(false)
    const [buildingSubmitting, setBuildingSubmitting] = useState(false)

    useEffect(() => {
        if (!selectedLocation && locations.length > 0) {
            setSelectedLocation(String(locations[0]._id))
        }
    }, [locations, selectedLocation])

    // Deep-link from Home / header / bookmarks:
    //   ?action=add-location | ?action=add-camp&location=<locationId>
    useEffect(() => {
        const action = searchParams.get('action')
        if (!action) return

        if (action === 'add-location') {
            setLocationForm({ name: '', city: '', address: '' })
            setLocationModalOpen(true)
        } else if (action === 'add-camp') {
            const locParam = searchParams.get('location') || selectedLocation || ''
            setCampForm(emptyCampForm(locParam))
            setCampModalOpen(true)
        }
        setSearchParams({}, { replace: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, setSearchParams])

    // Camps belong to a location by id now, not by matching location name strings.
    const camps = useMemo(() => {
        if (!selectedLocation || !Array.isArray(allCamps)) return []
        return allCamps.filter((c) => campLocationId(c) === selectedLocation)
    }, [selectedLocation, allCamps])

    const filteredCamps = useMemo(
        () => camps.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase())),
        [camps, search],
    )

    // Every figure below comes from the server's live counts — there are no
    // stored totalRooms/occupiedRooms fields to drift out of date any more.
    const stats = useMemo(() => {
        const campsArray = Array.isArray(allCamps) ? allCamps : []
        const totalRooms = campsArray.reduce((sum, c) => sum + (c.totalRooms || 0), 0)
        const occupiedRooms = campsArray.reduce((sum, c) => sum + (c.occupiedRooms || 0), 0)

        return {
            totalLocations: locations.length,
            totalCamps: campsArray.length,
            totalRooms,
            occupiedRooms,
            occupancyRate: totalRooms > 0 ? `${Math.round((occupiedRooms / totalRooms) * 100)}%` : '0%',
        }
    }, [allCamps, locations.length])

    const locationOptions = useMemo(
        () => locations.map((l) => ({ value: String(l._id), label: l.name })),
        [locations],
    )

    const navigateToAddLocation = () => navigate('/locations-camps?action=add-location')

    const navigateToAddCamp = () => {
        const q = selectedLocation ? `?action=add-camp&location=${selectedLocation}` : '?action=add-camp'
        navigate(`/locations-camps${q}`)
    }

    const warn = (title: string, message: string) =>
        toast.push(
            <Notification title={title} type="warning">
                {message}
            </Notification>,
        )

    // ─── Location ────────────────────────────────────────────────────────────
    const handleSaveLocation = async (e: React.FormEvent) => {
        e.preventDefault()
        const name = locationForm.name.trim()
        if (!name) {
            warn('Missing fields', 'Location name is required.')
            return
        }

        setLocationSubmitting(true)
        try {
            const created = await addLocation({
                name,
                city: locationForm.city.trim() || undefined,
                address: locationForm.address.trim() || undefined,
                status: 'active',
            })
            await fetchLocations()
            if (created?._id) setSelectedLocation(String(created._id))
            setLocationModalOpen(false)
            setLocationForm({ name: '', city: '', address: '' })
        } catch {
            /* addLocation already toasts */
        } finally {
            setLocationSubmitting(false)
        }
    }

    const handleDeleteLocation = async (locationId: string) => {
        try {
            await deleteLocation(locationId)
            if (selectedLocation === locationId) setSelectedLocation(null)
            await fetchLocations()
        } catch {
            /* the API explains why (e.g. it still has camps) and the hook toasts it */
        }
    }

    // ─── Camp ────────────────────────────────────────────────────────────────
    const handleSaveCamp = async (e: React.FormEvent) => {
        e.preventDefault()
        const name = campForm.name.trim()

        if (!campForm.locationId) {
            warn('Missing fields', 'Pick the location this camp belongs to.')
            return
        }
        if (!name) {
            warn('Missing fields', 'Camp name is required.')
            return
        }

        // Shared with the admin panel's camp form so both send identical payloads.
        const buildingSpecs = buildingsFromStructure({
            mode: campForm.mode,
            campName: name,
            singleFloors: campForm.singleFloors,
            rows: campForm.rows,
        })

        const structureError = validateStructure(buildingSpecs)
        if (structureError) {
            warn('Check the structure', structureError)
            return
        }

        setCampSubmitting(true)
        try {
            await addCamp({
                name,
                locationId: campForm.locationId,
                description: campForm.description.trim(),
                price: Number(campForm.price) || 0,
                buildings: buildingSpecs,
            })
            await Promise.all([fetchCamps(), fetchBuildings(), fetchLocations()])
            setSelectedLocation(campForm.locationId)
            setCampModalOpen(false)
            setCampForm(emptyCampForm(campForm.locationId))
        } catch {
            /* addCamp already toasts */
        } finally {
            setCampSubmitting(false)
        }
    }

    // ─── Building (added to an existing camp) ────────────────────────────────
    const handleOpenAddBuilding = (campId: string, campName: string) => {
        setBuildingTargetCamp({ id: campId, name: campName })
        setBuildingForm(emptyBuildingRow())
        setBuildingModalOpen(true)
    }

    const handleSaveBuilding = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!buildingTargetCamp || !buildingForm.name.trim()) {
            warn('Missing fields', 'Building name is required.')
            return
        }
        setBuildingSubmitting(true)
        try {
            await addBuilding({
                campId: buildingTargetCamp.id,
                name: buildingForm.name.trim(),
                type: buildingForm.type as BuildingSpec['type'],
                floors: Math.max(1, parseInt(buildingForm.floors, 10) || 1),
                status: 'active',
            })
            await fetchCamps()
            setBuildingModalOpen(false)
        } catch {
            /* addBuilding already toasts */
        } finally {
            setBuildingSubmitting(false)
        }
    }

    // ─── Render ──────────────────────────────────────────────────────────────
    const renderLocationCard = (location: (typeof locations)[0]) => {
        const id = String(location._id)
        const isSelected = selectedLocation === id
        const campCount = location.campCount ?? 0
        return (
            <Card
                key={id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                        ? 'ring-2 ring-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10'
                        : 'hover:border-indigo-200'
                }`}
                onClick={() => setSelectedLocation(id)}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={`p-2.5 rounded-lg shrink-0 ${
                            isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    >
                        <HiOutlineMap className="text-xl" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {location.name}
                        </h4>
                        {location.city || location.address ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {[location.city, location.address].filter(Boolean).join(' · ')}
                            </p>
                        ) : null}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {campCount === 0 ? 'No camps yet' : `${campCount} camp${campCount === 1 ? '' : 's'}`}
                        </p>
                    </div>

                    {campCount === 0 ? (
                        <Button
                            size="xs"
                            variant="plain"
                            icon={<HiOutlineTrash />}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                handleDeleteLocation(id)
                            }}
                        >
                            Delete
                        </Button>
                    ) : (
                        <HiOutlineChevronRight
                            className={`text-lg shrink-0 ${
                                isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-300'
                            }`}
                        />
                    )}
                </div>
            </Card>
        )
    }

    const renderCampCard = (camp: Camp) => {
        const campId = String(camp._id || camp.id)

        const campBuildings = (Array.isArray(buildings) ? buildings : []).filter((b) => {
            const bCampId = typeof b.campId === 'object' && b.campId !== null ? (b.campId as any)._id : b.campId
            return String(bCampId) === campId
        })

        const totalRooms = camp.totalRooms || 0
        const occupiedRooms = camp.occupiedRooms || 0
        const occupancyPercent = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
        const buildingCount = camp.buildingCount ?? campBuildings.length

        return (
            <Card key={campId} className="hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{camp.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {buildingCount} building{buildingCount === 1 ? '' : 's'} · {totalRooms} room
                            {totalRooms === 1 ? '' : 's'}
                        </p>
                    </div>
                    <Badge
                        content={camp.status || 'inactive'}
                        className={`shrink-0 ${
                            camp.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    />
                </div>

                {/* Occupancy spelled out — "0 / 4 rooms" reads clearer than three
                    separate counters the reader has to relate to each other. */}
                <div className="mt-4">
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                {occupiedRooms}
                            </span>{' '}
                            of {totalRooms} room{totalRooms === 1 ? '' : 's'} occupied
                        </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{occupancyPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${occupancyPercent}%` }}
                        />
                    </div>
                </div>

                {/* Buildings inside this camp, labelled so the rows aren't mistaken
                    for another set of camp-level figures. */}
                <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                        Buildings / blocks
                    </p>
                    {campBuildings.length > 0 ? (
                        <div className="space-y-1">
                            {campBuildings.map((b) => (
                                <div
                                    key={b._id}
                                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1.5"
                                >
                                    <span className="font-medium text-gray-700 dark:text-gray-200 truncate">
                                        {b.name}
                                    </span>
                                    <span className="text-gray-400 shrink-0 ml-2">
                                        {b.floors === 1 ? '1 floor' : `${b.floors} floors`}
                                        {' · '}
                                        {b.roomCount ?? 0} rooms
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            None yet — add a building before you can create rooms.
                        </p>
                    )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
                    <Button
                        size="xs"
                        variant="plain"
                        icon={<HiOutlinePlus />}
                        onClick={() => handleOpenAddBuilding(campId, camp.name)}
                    >
                        Add building / block
                    </Button>
                    {totalRooms === 0 && (
                        <Button
                            size="xs"
                            variant="plain"
                            icon={<HiOutlinePlus />}
                            onClick={() => navigate('/room-management')}
                        >
                            Add rooms
                        </Button>
                    )}
                </div>
            </Card>
        )
    }

    if (locationsLoading || campsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner />
            </div>
        )
    }

    if (locationsError || campsError) {
        return <div className="p-4 text-red-500">Error loading data: {locationsError || campsError}</div>
    }

    const selectedLocationName = locations.find((l) => String(l._id) === selectedLocation)?.name

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Locations &amp; camps</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                    Locations group camps by area. Add a location, then add camps under it — each camp is either a
                    single building or several, and every building can have multiple floors.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <Statistic
                    title="Total Locations"
                    value={stats.totalLocations}
                    icon={<HiOutlineMap className="text-2xl" />}
                    color="indigo"
                />
                <Statistic
                    title="Total Camps"
                    value={stats.totalCamps}
                    icon={<HiOutlineOfficeBuilding className="text-2xl" />}
                    color="blue"
                />
                <Statistic
                    title="Total Rooms"
                    value={stats.totalRooms}
                    icon={<HiOutlineHome className="text-2xl" />}
                    color="emerald"
                />
                <Statistic
                    title="Average Occupancy"
                    value={stats.occupancyRate}
                    icon={<HiOutlineUserGroup className="text-2xl" />}
                    color="amber"
                />
            </div>

            {/* One toolbar for the whole section: search plus both "add" actions,
                so the columns below hold nothing but the lists themselves. */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-xs">
                    <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                        className="pl-10 w-full"
                        placeholder="Search camps..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button icon={<HiOutlinePlus />} onClick={navigateToAddLocation}>
                        Add location
                    </Button>
                    <Button
                        variant="solid"
                        icon={<HiOutlinePlus />}
                        onClick={navigateToAddCamp}
                        disabled={!selectedLocation}
                    >
                        Add camp
                    </Button>
                </div>
            </div>

            {/* mt-3! overrides the wrapper's space-y-6 so the lists sit close to the toolbar. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-3!">
                <div className="lg:col-span-1 space-y-4">
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Locations
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Pick one to manage its camps
                        </p>
                    </div>

                    <div className="space-y-3">
                        {locations.length === 0 ? (
                            <Card className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                No locations yet. Add one to get started.
                            </Card>
                        ) : (
                            locations.map(renderLocationCard)
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Camps
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {selectedLocationName
                                ? `${filteredCamps.length} in ${selectedLocationName}`
                                : 'Select a location on the left'}
                        </p>
                    </div>

                    {selectedLocation ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredCamps.length > 0 ? (
                                filteredCamps.map(renderCampCard)
                            ) : (
                                <div className="col-span-2 py-12 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                                    <div className="text-4xl mb-2">🏕️</div>
                                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                                        No camps found
                                    </h4>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                                        {search
                                            ? 'Try a different search term'
                                            : `${selectedLocationName ?? 'This location'} has no camps yet.`}
                                    </p>
                                    <Button
                                        className="mt-4"
                                        variant="solid"
                                        icon={<HiOutlinePlus />}
                                        onClick={navigateToAddCamp}
                                    >
                                        Add camp
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card className="py-12 text-center border-dashed">
                            <div className="text-4xl mb-4">📍</div>
                            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">Select a location</h4>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Choose a location from the list on the left to view or manage its camps
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {/* ─── Add location ─────────────────────────────────────────────── */}
            <Dialog isOpen={locationModalOpen} onClose={() => setLocationModalOpen(false)} width={480}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add location</h3>
                    <form onSubmit={handleSaveLocation}>
                        <FormContainer layout="vertical" size="md">
                            <FormItem label="Location name" required>
                                <Input
                                    value={locationForm.name}
                                    onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Riyadh North"
                                />
                            </FormItem>
                            <FormItem label="City (optional)">
                                <Input
                                    value={locationForm.city}
                                    onChange={(e) => setLocationForm((f) => ({ ...f, city: e.target.value }))}
                                    placeholder="e.g. Riyadh"
                                />
                            </FormItem>
                            <FormItem label="Address (optional)">
                                <Input
                                    value={locationForm.address}
                                    onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))}
                                    placeholder="Short address or notes"
                                />
                            </FormItem>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="plain" onClick={() => setLocationModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="solid" loading={locationSubmitting}>
                                    Save location
                                </Button>
                            </div>
                        </FormContainer>
                    </form>
                </div>
            </Dialog>

            {/* ─── Add camp (with its structure) ────────────────────────────── */}
            <Dialog isOpen={campModalOpen} onClose={() => setCampModalOpen(false)} width={600}>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add camp</h3>
                    <form onSubmit={handleSaveCamp}>
                        <FormContainer layout="vertical" size="md">
                            <FormItem label="Location" required>
                                <Select
                                    value={locationOptions.find((o) => o.value === campForm.locationId) || null}
                                    onChange={(selected: any) =>
                                        setCampForm((f) => ({ ...f, locationId: selected?.value || '' }))
                                    }
                                    options={locationOptions}
                                    placeholder="Select a location"
                                />
                            </FormItem>

                            <FormItem label="Camp name" required>
                                <Input
                                    value={campForm.name}
                                    onChange={(e) => setCampForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Camp display name"
                                />
                            </FormItem>

                            <FormItem label="Description">
                                <Input
                                    textArea
                                    rows={2}
                                    value={campForm.description}
                                    onChange={(e) => setCampForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Short description"
                                />
                            </FormItem>

                            <FormItem label="Base price">
                                <Input
                                    type="number"
                                    min={0}
                                    value={campForm.price}
                                    onChange={(e) => setCampForm((f) => ({ ...f, price: e.target.value }))}
                                />
                            </FormItem>

                            {/* Structure: decided here so the camp can take rooms
                                immediately. Same component the admin panel uses. */}
                            <CampStructureFields
                                structure={{
                                    mode: campForm.mode,
                                    singleFloors: campForm.singleFloors,
                                    rows: campForm.rows,
                                }}
                                onChange={(patch) => setCampForm((f) => ({ ...f, ...patch }))}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="plain" onClick={() => setCampModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="solid" loading={campSubmitting}>
                                    Create camp
                                </Button>
                            </div>
                        </FormContainer>
                    </form>
                </div>
            </Dialog>

            {/* ─── Add building to an existing camp ─────────────────────────── */}
            <Dialog isOpen={buildingModalOpen} onClose={() => setBuildingModalOpen(false)} width={500}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Add building / block
                    </h3>
                    {buildingTargetCamp && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Camp: <span className="font-medium">{buildingTargetCamp.name}</span>
                        </p>
                    )}
                    <form onSubmit={handleSaveBuilding}>
                        <FormContainer layout="vertical" size="md">
                            <FormItem label="Name" required extra="e.g. Block A, Building 1, Main Building">
                                <Input
                                    value={buildingForm.name}
                                    onChange={(e) => setBuildingForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Building name"
                                />
                            </FormItem>
                            <FormItem label="Type">
                                <Select
                                    value={BUILDING_TYPES.find((o) => o.value === buildingForm.type) || BUILDING_TYPES[0]}
                                    onChange={(selected: any) =>
                                        setBuildingForm((f) => ({ ...f, type: selected?.value || 'residential' }))
                                    }
                                    options={BUILDING_TYPES}
                                />
                            </FormItem>
                            <FormItem label="Number of floors" extra="Use 1 for containers or single-storey blocks">
                                <Select
                                    value={FLOOR_OPTIONS.find((o) => o.value === buildingForm.floors) || FLOOR_OPTIONS[0]}
                                    onChange={(selected: any) =>
                                        setBuildingForm((f) => ({ ...f, floors: selected?.value || '1' }))
                                    }
                                    options={FLOOR_OPTIONS}
                                />
                            </FormItem>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="plain" onClick={() => setBuildingModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="solid" loading={buildingSubmitting}>
                                    Save building
                                </Button>
                            </div>
                        </FormContainer>
                    </form>
                </div>
            </Dialog>
        </div>
    )
}

export default LocationsCamps
