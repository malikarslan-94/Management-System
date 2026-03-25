import AdaptableCard from '@/components/shared/AdaptableCard'
import {
    Button,
    Card,
    FormContainer,
    FormItem,
    Input,
    Notification,
    Select,
    Tabs,
    toast,
} from '@/components/ui'
import Badge from '@/components/ui/Badge'
import { useCamps } from '@/hooks/useCamps'
import { useRooms } from '@/hooks/useRooms'
import { getRooms } from '@/services/RoomService'
import {
    appendStoredMaintenanceRequest,
    readStoredMaintenanceRequests,
    summarizeRequestStats,
} from '@/utils/maintenanceRequestStorage'
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ComponentType,
} from 'react'
import {
    HiOutlineCalendar,
    HiOutlineClipboardList,
    HiOutlineCube,
    HiOutlineExclamationCircle,
    HiOutlineInformationCircle,
    HiOutlineLocationMarker,
    HiOutlineOfficeBuilding,
    HiOutlineSparkles,
} from 'react-icons/hi'
import { HiOutlineWrench } from 'react-icons/hi2'
import { useSearchParams } from 'react-router-dom'

type TabKey = 'inventory' | 'repair'

type AreaType = 'room' | 'other'

type RequestKind = 'repair' | 'inspection' | 'other'

type Priority = 'low' | 'normal' | 'urgent'

type SelectOption<T extends string = string> = { value: T; label: string }

const REQUEST_KIND_OPTIONS: SelectOption<RequestKind>[] = [
    { value: 'repair', label: 'Repair / not working' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'other', label: 'Other' },
]

const AREA_TYPE_OPTIONS: SelectOption<AreaType>[] = [
    { value: 'room', label: 'Inside a room' },
    { value: 'other', label: 'Other area (mosque, pitch, etc.)' },
]

const PRIORITY_OPTIONS: SelectOption<Priority>[] = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
]

export interface MaintenanceFormState {
    itemName: string
    areaType: AreaType
    campId: string
    roomId: string
    locationNote: string
    requestKind: RequestKind
    priority: Priority
    description: string
    contactPhone: string
}

const initialForm: MaintenanceFormState = {
    itemName: '',
    areaType: 'room',
    campId: '',
    roomId: '',
    locationNote: '',
    requestKind: 'repair',
    priority: 'normal',
    description: '',
    contactPhone: '',
}

const InventoryMaintenance = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<TabKey>('inventory')
    const [form, setForm] = useState<MaintenanceFormState>(initialForm)
    const [errors, setErrors] = useState<
        Partial<Record<keyof MaintenanceFormState, string>>
    >({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [requestStatsVersion, setRequestStatsVersion] = useState(0)
    const [roomStats, setRoomStats] = useState<{
        loading: boolean
        totalRooms: number
        roomsInMaintenance: number
    }>({ loading: true, totalRooms: 0, roomsInMaintenance: 0 })

    const { camps, loading: campsLoading, fetchCamps } = useCamps()
    const { rooms: allRooms, loading: roomsLoading } = useRooms()

    const requestStats = useMemo(() => {
        const list = readStoredMaintenanceRequests()
        return summarizeRequestStats(list)
    }, [requestStatsVersion])

    useEffect(() => {
        fetchCamps()
    }, [fetchCamps])

    useEffect(() => {
        let cancelled = false
        getRooms().then((rooms) => {
            if (cancelled) return
            setRoomStats({
                loading: false,
                totalRooms: rooms.length,
                roomsInMaintenance: rooms.filter(
                    (r) => r.status === 'maintenance',
                ).length,
            })
        })
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'repair' || tab === 'inventory') {
            setActiveTab(tab)
        }
    }, [searchParams])

    const campOptions = useMemo(
        () =>
            (camps || []).map((c) => ({
                value: c._id || '',
                label: c.name,
            })),
        [camps],
    )

    const roomsForCamp = useMemo(() => {
        if (!form.campId) return []
        return (allRooms || []).filter((r) => {
            const cid =
                typeof r.camp === 'object' && r.camp && '_id' in r.camp
                    ? (r.camp as { _id: string })._id
                    : (r.camp as string)
            return cid === form.campId
        })
    }, [allRooms, form.campId])

    const roomOptions = useMemo(() => {
        return roomsForCamp.map((r) => ({
            value: r._id,
            label: `${r.roomNumber} (${typeof r.camp === 'object' && r.camp?.name ? r.camp.name : 'Room'})`,
        }))
    }, [roomsForCamp])

    const selectedCampOption = useMemo(
        () => campOptions.find((o) => o.value === form.campId) ?? null,
        [campOptions, form.campId],
    )

    const selectedRoomOption = useMemo(
        () => roomOptions.find((o) => o.value === form.roomId) ?? null,
        [roomOptions, form.roomId],
    )

    const handleTabChange = useCallback(
        (value: string) => {
            const next = value as TabKey
            setActiveTab(next)
            setSearchParams(next === 'inventory' ? {} : { tab: next }, {
                replace: true,
            })
        },
        [setSearchParams],
    )

    const setField = <K extends keyof MaintenanceFormState>(
        key: K,
        value: MaintenanceFormState[K],
    ) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value }
            if (key === 'campId') {
                next.roomId = ''
            }
            if (key === 'areaType' && value === 'other') {
                next.roomId = ''
                next.campId = ''
            }
            return next
        })
        setErrors((e) => ({ ...e, [key]: undefined }))
    }

    const validate = (): boolean => {
        const e: Partial<Record<keyof MaintenanceFormState, string>> = {}
        if (!form.itemName.trim())
            e.itemName = 'Please describe the item or issue.'
        if (!form.description.trim())
            e.description = 'Please add details for the maintenance team.'
        if (form.areaType === 'room') {
            if (!form.campId) e.campId = 'Select a camp.'
            if (!form.roomId) e.roomId = 'Select a room.'
        } else if (!form.locationNote.trim()) {
            e.locationNote =
                'Describe the location (e.g. mosque, playing area).'
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        if (!validate()) return
        setIsSubmitting(true)
        await new Promise((r) => setTimeout(r, 400))
        appendStoredMaintenanceRequest({
            itemName: form.itemName.trim(),
            requestKind: form.requestKind,
            priority: form.priority,
            areaType: form.areaType,
            campId: form.campId || undefined,
            roomId: form.roomId || undefined,
            locationNote: form.locationNote.trim() || undefined,
        })
        setRequestStatsVersion((v) => v + 1)
        toast.push(
            <Notification title="Request received" type="success">
                Your maintenance request has been recorded. Full tracking and
                inventory linking will be available in a future update.
            </Notification>,
        )
        setForm(initialForm)
        setErrors({})
        setIsSubmitting(false)
    }

    const StatCard = ({
        title,
        value,
        hint,
        icon: Icon,
        color = 'text-indigo-600 dark:text-indigo-400',
    }: {
        title: string
        value: string | number
        hint?: string
        icon: ComponentType<{ className?: string }>
        color?: string
    }) => (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="rounded-full bg-white dark:bg-gray-700 p-2.5 shadow-sm shrink-0">
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {title}
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
                        {value}
                    </p>
                    {hint ? (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 leading-snug">
                            {hint}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    title="Total repair requests"
                    value={requestStats.total}
                    hint="Recorded submissions (this device)"
                    icon={HiOutlineClipboardList}
                    color="text-indigo-600 dark:text-indigo-400"
                />
                <StatCard
                    title="Urgent"
                    value={requestStats.urgent}
                    hint="Marked urgent in queue"
                    icon={HiOutlineExclamationCircle}
                    color="text-amber-600 dark:text-amber-400"
                />
                <StatCard
                    title="Rooms in maintenance"
                    value={
                        roomStats.loading ? '—' : roomStats.roomsInMaintenance
                    }
                    hint={
                        roomStats.loading
                            ? 'Loading room catalog…'
                            : `Of ${roomStats.totalRooms} rooms in catalog`
                    }
                    icon={HiOutlineOfficeBuilding}
                    color="text-rose-600 dark:text-rose-400"
                />
                <StatCard
                    title="This month"
                    value={requestStats.thisMonth}
                    hint="Requests submitted this month"
                    icon={HiOutlineCalendar}
                    color="text-emerald-600 dark:text-emerald-400"
                />
            </div>

            <AdaptableCard>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <div className="border-b border-gray-200 dark:border-gray-700 px-4 pt-2">
                        <Tabs.TabList>
                            <Tabs.TabNav
                                value="inventory"
                                icon={<HiOutlineCube className="text-lg" />}
                            >
                                Inventory
                            </Tabs.TabNav>
                            <Tabs.TabNav
                                value="repair"
                                icon={<HiOutlineWrench className="text-lg" />}
                            >
                                Repair &amp; maintenance
                            </Tabs.TabNav>
                        </Tabs.TabList>
                    </div>

                    <Tabs.TabContent value="inventory" className="p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                        Preview
                                    </Badge>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Roadmap feature
                                    </span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    Room &amp; facility inventory
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Each camp has rooms and shared spaces.
                                    Inventory will list every item placed in a
                                    room or area—furniture, TVs, AC units,
                                    fixtures, and more—so you know counts,
                                    locations, and what can be moved or
                                    replaced.
                                </p>
                                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    <li className="flex gap-2">
                                        <HiOutlineSparkles className="text-indigo-500 shrink-0 mt-0.5" />
                                        <span>
                                            Per-room item lists with quantities
                                            and notes
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <HiOutlineLocationMarker className="text-indigo-500 shrink-0 mt-0.5" />
                                        <span>
                                            Later: mosques, playing fields, and
                                            other non-room areas
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <HiOutlineClipboardList className="text-indigo-500 shrink-0 mt-0.5" />
                                        <span>
                                            Roll-up views per camp and across the
                                            portfolio
                                        </span>
                                    </li>
                                </ul>
                            </div>
                            <Card className="lg:w-80 shrink-0 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-600">
                                <div className="p-4 flex gap-3">
                                    <HiOutlineInformationCircle className="text-xl text-indigo-500 shrink-0" />
                                    <div>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Why inventory matters
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Linking items to spaces makes
                                            maintenance faster and helps plan
                                            purchases and replacements.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </Tabs.TabContent>

                    <Tabs.TabContent value="repair" className="p-6">
                        <div className="max-w-2xl">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    Submit a maintenance request
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Use this form for repairs and service needs.
                                    Requests are stored for follow-up; workflow
                                    and asset linking will deepen over time.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <FormContainer layout="vertical" size="md">
                                    <FormItem
                                        label="Item or equipment"
                                        invalid={Boolean(errors.itemName)}
                                        errorMessage={errors.itemName}
                                    >
                                        <Input
                                            placeholder="e.g. Split AC, Smart TV, bathroom fixture"
                                            value={form.itemName}
                                            onChange={(e) =>
                                                setField(
                                                    'itemName',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </FormItem>

                                    <FormItem label="Request type">
                                        <Select<SelectOption<RequestKind>>
                                            value={
                                                REQUEST_KIND_OPTIONS.find(
                                                    (o) =>
                                                        o.value ===
                                                        form.requestKind,
                                                ) ?? null
                                            }
                                            onChange={(opt) =>
                                                setField(
                                                    'requestKind',
                                                    opt?.value ?? 'repair',
                                                )
                                            }
                                            options={REQUEST_KIND_OPTIONS}
                                            placeholder="Request type"
                                        />
                                    </FormItem>

                                    <FormItem label="Where is it?">
                                        <Select<SelectOption<AreaType>>
                                            value={
                                                AREA_TYPE_OPTIONS.find(
                                                    (o) =>
                                                        o.value ===
                                                        form.areaType,
                                                ) ?? null
                                            }
                                            onChange={(opt) =>
                                                setField(
                                                    'areaType',
                                                    opt?.value ?? 'room',
                                                )
                                            }
                                            options={AREA_TYPE_OPTIONS}
                                            placeholder="Location type"
                                        />
                                    </FormItem>

                                    {form.areaType === 'room' && (
                                        <>
                                            <FormItem
                                                label="Camp"
                                                invalid={Boolean(errors.campId)}
                                                errorMessage={errors.campId}
                                            >
                                                <Select
                                                    value={selectedCampOption}
                                                    onChange={(opt) =>
                                                        setField(
                                                            'campId',
                                                            opt?.value ?? '',
                                                        )
                                                    }
                                                    options={campOptions}
                                                    placeholder="Select camp"
                                                    isDisabled={campsLoading}
                                                    isLoading={campsLoading}
                                                />
                                            </FormItem>
                                            <FormItem
                                                label="Room"
                                                invalid={Boolean(errors.roomId)}
                                                errorMessage={errors.roomId}
                                            >
                                                <Select
                                                    value={selectedRoomOption}
                                                    onChange={(opt) =>
                                                        setField(
                                                            'roomId',
                                                            opt?.value ?? '',
                                                        )
                                                    }
                                                    options={roomOptions}
                                                    placeholder={
                                                        form.campId
                                                            ? 'Select room'
                                                            : 'Select a camp first'
                                                    }
                                                    isDisabled={
                                                        !form.campId ||
                                                        roomsLoading
                                                    }
                                                    isLoading={roomsLoading}
                                                />
                                            </FormItem>
                                        </>
                                    )}

                                    {form.areaType === 'other' && (
                                        <FormItem
                                            label="Location description"
                                            invalid={Boolean(
                                                errors.locationNote,
                                            )}
                                            errorMessage={errors.locationNote}
                                        >
                                            <Input
                                                textArea
                                                rows={3}
                                                placeholder="e.g. North playing field — floodlight pole"
                                                value={form.locationNote}
                                                onChange={(e) =>
                                                    setField(
                                                        'locationNote',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </FormItem>
                                    )}

                                    <FormItem label="Priority">
                                        <Select<SelectOption<Priority>>
                                            value={
                                                PRIORITY_OPTIONS.find(
                                                    (o) =>
                                                        o.value ===
                                                        form.priority,
                                                ) ?? null
                                            }
                                            onChange={(opt) =>
                                                setField(
                                                    'priority',
                                                    opt?.value ?? 'normal',
                                                )
                                            }
                                            options={PRIORITY_OPTIONS}
                                            placeholder="Priority"
                                        />
                                    </FormItem>

                                    <FormItem
                                        label="Description"
                                        invalid={Boolean(errors.description)}
                                        errorMessage={errors.description}
                                    >
                                        <Input
                                            textArea
                                            rows={4}
                                            placeholder="What should maintenance know? Symptoms, when it started, access notes…"
                                            value={form.description}
                                            onChange={(e) =>
                                                setField(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </FormItem>

                                    <FormItem
                                        label="Contact phone (optional)"
                                        extra="For urgent follow-up if we cannot reach you in-app"
                                    >
                                        <Input
                                            placeholder="+971 …"
                                            value={form.contactPhone}
                                            onChange={(e) =>
                                                setField(
                                                    'contactPhone',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </FormItem>

                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <Button
                                            variant="solid"
                                            type="submit"
                                            loading={isSubmitting}
                                        >
                                            Submit request
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="plain"
                                            onClick={() => {
                                                setForm(initialForm)
                                                setErrors({})
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </FormContainer>
                            </form>
                        </div>
                    </Tabs.TabContent>
                </Tabs>
            </AdaptableCard>
        </div>
    )
}

export default InventoryMaintenance
