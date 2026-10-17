import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Page,
    Primary,
    Stats,
    Tabs,
    State,
    Badge,
    Pager,
    Panel,
    Field,
    Actions,
    Notice,
    Button,
    api,
    useRequest,
    useAccess,
    errorText,
    idOf,
    today,
    dayLabel,
    displayDate,
    type RecordData,
} from './shared'
const blank = () => ({
    occupantId: '',
    campId: '',
    buildingId: '',
    floor: '',
    roomId: '',
    startDate: '',
    expectedCheckoutDate: '',
    notes: '',
})
export default function CheckInOut() {
    const { can, settings } = useAccess(),
        [camp, setCamp] = useState(''),
        [day, setDay] = useState(today(settings.timezone)),
        [search, setSearch] = useState(''),
        [tab, setTab] = useState('due'),
        [page, setPage] = useState(1)
    const camps = useRequest<RecordData[]>('/api/camps')
    const list = useRequest<RecordData>('/api/assignments/operations', {
        campId: camp || undefined,
        date: day,
        search: search || undefined,
        tab,
        page,
        limit: 15,
    })
    const [wizard, setWizard] = useState(false),
        [step, setStep] = useState(0),
        [form, setForm] = useState(blank()),
        [resident, setResident] = useState<RecordData | null>(null),
        [residentSearch, setResidentSearch] = useState('')
    const people = useRequest<RecordData>('/api/employees', {
        status: 'Active',
        unassigned: 'true',
        search: residentSearch || undefined,
        limit: 30,
    })
    const rooms = useRequest<RecordData[]>('/api/rooms', {
        campId: form.campId || undefined,
        status: 'available',
    })
    const [selected, setSelected] = useState<RecordData | null>(null),
        [after, setAfter] = useState('cleaning'),
        [notes, setNotes] = useState(''),
        [error, setError] = useState(''),
        [success, setSuccess] = useState(''),
        [saving, setSaving] = useState(false)
    const change = (key: string, value: string) =>
        setForm((v) => ({
            ...v,
            [key]: value,
            ...(key === 'campId'
                ? { roomId: '', buildingId: '', floor: '' }
                : key === 'buildingId'
                  ? { roomId: '', floor: '' }
                  : key === 'floor'
                    ? { roomId: '' }
                    : {}),
        }))
    const resetFilter = (set: (v: string) => void, v: string) => {
        set(v)
        setPage(1)
    }
    const openCheckin = () => {
        setWizard(true)
        setStep(0)
        setForm({
            ...blank(),
            startDate: today(settings.timezone),
            campId: camp,
        })
        setResident(null)
        setError('')
        people.reload()
        rooms.reload()
    }
    const close = () => {
        if (saving) return
        setWizard(false)
        setSelected(null)
        setError('')
    }
    const changed = () => {
        list.reload()
        rooms.reload()
        people.reload()
        window.dispatchEvent(new Event('campwise-data-changed'))
    }
    const roomList = rooms.data || [],
        buildingOptions = Array.from(
            new Map(
                roomList.map((room) => [
                    idOf(room.buildingId),
                    room.buildingId?.name || 'Building',
                ]),
            ).entries(),
        )
    const filteredRooms = roomList.filter(
        (room) =>
            (!form.buildingId || idOf(room.buildingId) === form.buildingId) &&
            (!form.floor || String(room.floor) === form.floor),
    )
    const room = roomList.find((room) => idOf(room) === form.roomId)
    const submitCheckin = async () => {
        setSaving(true)
        setError('')
        try {
            await api.post('/api/assignments', {
                ...form,
                occupantType:
                    resident?.employeeType === 'Visitor'
                        ? 'Temporary Visitor'
                        : 'Employee',
            })
            setWizard(false)
            setSuccess(
                'Resident checked in. Room and stay records have been updated.',
            )
            changed()
        } catch (e) {
            setError(errorText(e))
            rooms.reload()
        } finally {
            setSaving(false)
        }
    }
    const submitCheckout = async () => {
        if (!selected) return
        setSaving(true)
        setError('')
        try {
            await api.put(`/api/assignments/${idOf(selected)}`, {
                status: 'completed',
                roomAfterCheckout: after,
                checkoutNotes: notes,
            })
            setSelected(null)
            setSuccess('Check-out completed and room status updated.')
            changed()
        } catch (e) {
            setError(errorText(e))
            list.reload()
        } finally {
            setSaving(false)
        }
    }
    const summary = list.data?.summary
    return (
        <Page
            title="Check-In / Check-Out"
            description="Manage daily arrivals and departures."
            action={
                can('stays') ? (
                    <Primary onClick={openCheckin}>New check-in</Primary>
                ) : undefined
            }
        >
            {success && <Notice type="success">{success}</Notice>}
            <Stats
                items={[
                    {
                        label:
                            day === today(settings.timezone)
                                ? 'Checked in today'
                                : 'Checked in on date',
                        value: summary?.checkedIn ?? '—',
                    },
                    {
                        label:
                            day === today(settings.timezone)
                                ? 'Due today'
                                : 'Due on date',
                        value: summary?.due ?? '—',
                        tone: 'amber',
                    },
                    {
                        label: 'Overdue',
                        value: summary?.overdue ?? '—',
                        tone: 'red',
                    },
                    {
                        label:
                            day === today(settings.timezone)
                                ? 'Checked out today'
                                : 'Checked out on date',
                        value: summary?.checkedOut ?? '—',
                    },
                ]}
            />
            <div className="cw-toolbar">
                <select
                    aria-label="Filter camp"
                    value={camp}
                    onChange={(e) => resetFilter(setCamp, e.target.value)}
                >
                    <option value="">All camps</option>
                    {camps.data?.map((c) => (
                        <option key={idOf(c)} value={idOf(c)}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <input
                    aria-label="Reference date"
                    type="date"
                    value={day}
                    onChange={(e) => resetFilter(setDay, e.target.value)}
                    style={{ flex: '0 1 180px' }}
                />
                <input
                    aria-label="Search resident or room"
                    placeholder="Search resident or room…"
                    value={search}
                    onChange={(e) => resetFilter(setSearch, e.target.value)}
                />
            </div>
            {camps.error && <Notice>{camps.error}</Notice>}
            <Tabs
                active={tab}
                onChange={(v) => resetFilter(setTab, v)}
                items={[
                    { key: 'due', label: 'Due & overdue' },
                    { key: 'checked_in', label: 'Checked in' },
                    { key: 'history', label: 'History' },
                ]}
            />
            <State
                loading={list.loading}
                error={list.error}
                empty={
                    !list.data?.data?.length &&
                    'No stays match this date and your filters.'
                }
                retry={list.reload}
            >
                <div className="cw-card">
                    <div className="cw-table-wrap">
                        <table className="cw-table cw-operational-table">
                            <thead>
                                <tr>
                                    <th>Resident</th>
                                    <th>Camp / Room</th>
                                    <th>Expected checkout</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.data?.data?.map((a: RecordData) => {
                                    const p = a.occupantDetails
                                    const status =
                                        a.status === 'active'
                                            ? dayLabel(a.expectedCheckoutDate) <
                                              day
                                                ? 'Overdue'
                                                : dayLabel(
                                                        a.expectedCheckoutDate,
                                                    ) === day
                                                  ? 'Due today'
                                                  : 'Active'
                                            : a.status
                                    return (
                                        <tr key={idOf(a)}>
                                            <td>
                                                <strong>
                                                    {p
                                                        ? `${p.firstName} ${p.lastName}`
                                                        : 'Resident unavailable'}
                                                </strong>
                                                <small>{p?.employeeId}</small>
                                            </td>
                                            <td data-label="Camp / Room">
                                                {a.roomId?.camp?.name || '—'}
                                                <small>
                                                    {a.roomId?.buildingId?.name}{' '}
                                                    · {a.roomId?.roomNumber}
                                                </small>
                                            </td>
                                            <td data-label="Expected checkout">
                                                {displayDate(
                                                    a.expectedCheckoutDate,
                                                    settings.dateFormat,
                                                )}
                                            </td>
                                            <td data-label="Status">
                                                <Badge value={status} />
                                            </td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelected(a)
                                                        setAfter('cleaning')
                                                        setNotes('')
                                                        setError('')
                                                    }}
                                                >
                                                    {a.status === 'active' &&
                                                    can('stays')
                                                        ? 'Check out'
                                                        : 'View stay'}
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pager
                        page={page}
                        totalPages={list.data?.totalPages || 0}
                        total={list.data?.total || 0}
                        onPage={setPage}
                    />
                </div>
            </State>
            <Panel title="New check-in" open={wizard} onClose={close}>
                <div className="cw-steps">
                    {['Resident', 'Room', 'Review'].map((s, i) => (
                        <span key={s} className={step === i ? 'is-active' : ''}>
                            {i + 1}. {s}
                        </span>
                    ))}
                </div>
                {error && <Notice>{error}</Notice>}
                {step === 0 && (
                    <>
                        <Field label="Find an active resident">
                            <input
                                value={residentSearch}
                                onChange={(e) =>
                                    setResidentSearch(e.target.value)
                                }
                                placeholder="Name or employee ID"
                            />
                        </Field>
                        <State
                            loading={people.loading}
                            error={people.error}
                            retry={people.reload}
                            empty={
                                !people.data?.data?.length &&
                                'No unassigned active residents found.'
                            }
                        >
                            <div className="cw-result-list">
                                {people.data?.data?.map((p: RecordData) => (
                                    <button
                                        key={idOf(p)}
                                        aria-pressed={
                                            idOf(resident) === idOf(p)
                                        }
                                        onClick={() => {
                                            setResident(p)
                                            setForm((v) => ({
                                                ...v,
                                                occupantId: idOf(p),
                                                campId: idOf(p.campId) || camp,
                                                roomId: '',
                                            }))
                                        }}
                                    >
                                        <strong>
                                            {p.firstName} {p.lastName}
                                        </strong>
                                        <br />
                                        {p.employeeId} ·{' '}
                                        {p.campId?.name || 'No camp assigned'}
                                    </button>
                                ))}
                            </div>
                        </State>
                        {can('residents') && (
                            <Link
                                className="cw-link"
                                to="/employees?action=add"
                            >
                                Register a new resident →
                            </Link>
                        )}
                        <div className="cw-form-actions">
                            <Button onClick={close}>Cancel</Button>
                            <Button
                                variant="solid"
                                color="blue-600"
                                disabled={!resident}
                                onClick={() => setStep(1)}
                            >
                                Choose room
                            </Button>
                        </div>
                    </>
                )}
                {step === 1 && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (!room) {
                                setError('Choose an available room.')
                                return
                            }
                            if (form.expectedCheckoutDate <= form.startDate) {
                                setError(
                                    'Expected checkout must be after check-in.',
                                )
                                return
                            }
                            setError('')
                            setStep(2)
                        }}
                    >
                        <div className="cw-card cw-details">
                            <strong>
                                {resident?.firstName} {resident?.lastName}
                            </strong>
                            <p>{resident?.employeeId}</p>
                        </div>
                        <Field label="Camp">
                            <select
                                required
                                value={form.campId}
                                disabled={!!idOf(resident?.campId)}
                                onChange={(e) =>
                                    change('campId', e.target.value)
                                }
                            >
                                <option value="">Choose camp</option>
                                {camps.data?.map((c) => (
                                    <option key={idOf(c)} value={idOf(c)}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="cw-grid-two">
                            <Field label="Building">
                                <select
                                    value={form.buildingId}
                                    onChange={(e) =>
                                        change('buildingId', e.target.value)
                                    }
                                >
                                    <option value="">All buildings</option>
                                    {buildingOptions.map(([id, name]) => (
                                        <option key={id} value={id}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Floor">
                                <select
                                    value={form.floor}
                                    onChange={(e) =>
                                        change('floor', e.target.value)
                                    }
                                >
                                    <option value="">All floors</option>
                                    {[
                                        ...new Set(
                                            roomList
                                                .filter(
                                                    (r) =>
                                                        !form.buildingId ||
                                                        idOf(r.buildingId) ===
                                                            form.buildingId,
                                                )
                                                .map((r) => String(r.floor)),
                                        ),
                                    ]
                                        .sort()
                                        .map((f) => (
                                            <option key={f}>{f}</option>
                                        ))}
                                </select>
                            </Field>
                        </div>
                        <Field label="Available room">
                            <select
                                required
                                disabled={!form.campId || rooms.loading}
                                value={form.roomId}
                                onChange={(e) =>
                                    change('roomId', e.target.value)
                                }
                            >
                                <option value="">Choose room</option>
                                {filteredRooms.map((r) => (
                                    <option key={idOf(r)} value={idOf(r)}>
                                        {r.roomNumber} · {r.type} · Floor{' '}
                                        {r.floor}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        {rooms.error && <Notice>{rooms.error}</Notice>}
                        {!rooms.loading &&
                            form.campId &&
                            !filteredRooms.length && (
                                <Notice type="info">
                                    No rooms available for these filters.
                                </Notice>
                            )}
                        <Notice type="info">
                            One active assignment per room. Capacity is room
                            information; this flow assigns the whole room.
                        </Notice>
                        <div className="cw-grid-two">
                            <Field label="Check-in date">
                                <input
                                    required
                                    type="date"
                                    value={form.startDate}
                                    max={today(settings.timezone)}
                                    onChange={(e) =>
                                        change('startDate', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Expected check-out">
                                <input
                                    required
                                    type="date"
                                    min={form.startDate}
                                    value={form.expectedCheckoutDate}
                                    onChange={(e) =>
                                        change(
                                            'expectedCheckoutDate',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                        </div>
                        <Field label="Notes (optional)">
                            <textarea
                                maxLength={2000}
                                value={form.notes}
                                onChange={(e) =>
                                    change('notes', e.target.value)
                                }
                            />
                        </Field>
                        <div className="cw-form-actions">
                            <Button type="button" onClick={() => setStep(0)}>
                                Back
                            </Button>
                            <Button
                                variant="solid"
                                color="blue-600"
                                type="submit"
                                disabled={!form.roomId}
                            >
                                Review check-in
                            </Button>
                        </div>
                    </form>
                )}
                {step === 2 && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            void submitCheckin()
                        }}
                    >
                        <div className="cw-card cw-details">
                            <h3>
                                {resident?.firstName} {resident?.lastName}
                            </h3>
                            <p>
                                {
                                    camps.data?.find(
                                        (c) => idOf(c) === form.campId,
                                    )?.name
                                }
                            </p>
                            <p>
                                {room?.buildingId?.name} · {room?.roomNumber}
                            </p>
                            <p>
                                Check-in:{' '}
                                {displayDate(
                                    form.startDate,
                                    settings.dateFormat,
                                )}
                            </p>
                            <p>
                                Expected checkout:{' '}
                                {displayDate(
                                    form.expectedCheckoutDate,
                                    settings.dateFormat,
                                )}
                            </p>
                            {form.notes && <p>{form.notes}</p>}
                        </div>
                        <Notice type="info">
                            Confirming creates the stay and marks this room
                            occupied.
                        </Notice>
                        <div className="cw-form-actions">
                            <Button
                                type="button"
                                disabled={saving}
                                onClick={() => setStep(1)}
                            >
                                Back
                            </Button>
                            <Button
                                type="submit"
                                loading={saving}
                                variant="solid"
                                color="blue-600"
                            >
                                Confirm check-in
                            </Button>
                        </div>
                    </form>
                )}
            </Panel>
            <Panel
                title={
                    selected?.status === 'active' && can('stays')
                        ? 'Review check-out'
                        : 'Stay details'
                }
                open={!!selected}
                onClose={close}
            >
                {selected && (
                    <>
                        <div className="cw-card cw-details">
                            <h3>
                                {selected.occupantDetails?.firstName}{' '}
                                {selected.occupantDetails?.lastName}
                            </h3>
                            <p>{selected.occupantDetails?.employeeId}</p>
                            <p>{selected.roomId?.camp?.name}</p>
                            <p>
                                {selected.roomId?.buildingId?.name} ·{' '}
                                {selected.roomId?.roomNumber}
                            </p>
                            <p>
                                Check-in:{' '}
                                {displayDate(
                                    selected.startDate,
                                    settings.dateFormat,
                                )}
                            </p>
                            <p>
                                Expected checkout:{' '}
                                {displayDate(
                                    selected.expectedCheckoutDate,
                                    settings.dateFormat,
                                )}
                            </p>
                            <Badge value={selected.status} />
                        </div>
                        {error && <Notice>{error}</Notice>}
                        {selected.status === 'active' && can('stays') ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    void submitCheckout()
                                }}
                            >
                                <Field label="Check-out date">
                                    <input
                                        readOnly
                                        value={today(settings.timezone)}
                                    />
                                </Field>
                                {selected.roomId?.status === 'maintenance' ? (
                                    <Notice type="info">
                                        This room will remain blocked for
                                        maintenance after checkout.
                                    </Notice>
                                ) : (
                                    <>
                                        <span>Room after check-out</span>
                                        <div className="cw-choice">
                                            {['available', 'cleaning'].map(
                                                (s) => (
                                                    <label key={s}>
                                                        <input
                                                            type="radio"
                                                            name="roomState"
                                                            value={s}
                                                            checked={
                                                                after === s
                                                            }
                                                            onChange={() =>
                                                                setAfter(s)
                                                            }
                                                        />
                                                        {s === 'available'
                                                            ? 'Available'
                                                            : 'Cleaning'}
                                                    </label>
                                                ),
                                            )}
                                        </div>
                                        <Notice type="info">
                                            {after === 'cleaning'
                                                ? 'The room becomes assignable when cleaning is complete.'
                                                : 'The room will be available for a new check-in.'}
                                        </Notice>
                                    </>
                                )}
                                <Field label="Notes (optional)">
                                    <textarea
                                        maxLength={2000}
                                        value={notes}
                                        onChange={(e) =>
                                            setNotes(e.target.value)
                                        }
                                    />
                                </Field>
                                <Actions
                                    saving={saving}
                                    onCancel={close}
                                    label="Confirm check-out"
                                />
                            </form>
                        ) : (
                            <>
                                <p>
                                    Check-out:{' '}
                                    {displayDate(
                                        selected.checkOutTime,
                                        settings.dateFormat,
                                        settings.timezone,
                                    )}
                                </p>
                                <p className="mt-3">
                                    {selected.checkoutNotes ||
                                        selected.notes ||
                                        'No notes recorded.'}
                                </p>
                            </>
                        )}
                    </>
                )}
            </Panel>
        </Page>
    )
}
