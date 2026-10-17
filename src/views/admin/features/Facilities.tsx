import { useState } from 'react'
import {
    HiOutlineOfficeBuilding,
    HiOutlineViewGrid,
    HiOutlineViewList,
} from 'react-icons/hi'
import {
    Page,
    Primary,
    Stats,
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
    kinds,
    kindName,
    type RecordData,
} from './shared'
const blank = {
    campId: '',
    kind: 'recreation_center',
    name: '',
    capacity: '',
    openingHours: '',
    description: '',
    status: 'active',
}
export default function Facilities() {
    const { can } = useAccess(),
        [camp, setCamp] = useState(''),
        [kind, setKind] = useState(''),
        [status, setStatus] = useState(''),
        [search, setSearch] = useState(''),
        [page, setPage] = useState(1),
        [view, setView] = useState('cards')
    const camps = useRequest<RecordData[]>('/api/camps'),
        list = useRequest<RecordData>('/api/facilities', {
            campId: camp || undefined,
            kind: kind || undefined,
            status: status || undefined,
            search: search || undefined,
            page,
            limit: 12,
        })
    const [open, setOpen] = useState(false),
        [editing, setEditing] = useState<RecordData | null>(null),
        [form, setForm] = useState(blank),
        [saving, setSaving] = useState(false),
        [error, setError] = useState(''),
        [success, setSuccess] = useState('')
    const change = (key: string, value: string) =>
            setForm((v) => ({ ...v, [key]: value })),
        close = () => {
            if (!saving) {
                setOpen(false)
                setError('')
            }
        }
    const show = (record: RecordData | null) => {
        setEditing(record)
        setForm(
            record
                ? {
                      campId: idOf(record.campId),
                      kind: record.kind,
                      name: record.name,
                      capacity: record.capacity ? String(record.capacity) : '',
                      openingHours: record.openingHours || '',
                      description: record.description || '',
                      status: record.status,
                  }
                : { ...blank, campId: camp },
        )
        setError('')
        setOpen(true)
    }
    const filter = (set: (v: string) => void, v: string) => {
        set(v)
        setPage(1)
    }
    const save = async () => {
        setError('')
        setSaving(true)
        try {
            const data = {
                ...form,
                capacity: form.capacity ? Number(form.capacity) : 0,
            }
            if (editing)
                await api.patch(`/api/facilities/${idOf(editing)}`, data)
            else await api.post('/api/facilities', data)
            setOpen(false)
            setSuccess(editing ? 'Facility updated.' : 'Facility added.')
            list.reload()
        } catch (e) {
            setError(errorText(e))
        } finally {
            setSaving(false)
        }
    }
    const counts = list.data?.summary
    return (
        <Page
            title="Facilities"
            description="Manage shared spaces across your camps."
            action={
                can('facilities') ? (
                    <Primary onClick={() => show(null)}>Add facility</Primary>
                ) : undefined
            }
        >
            {success && <Notice type="success">{success}</Notice>}
            <Stats
                items={[
                    { label: 'Total', value: counts?.total ?? '—' },
                    {
                        label: 'Active',
                        value: counts?.active ?? '—',
                        tone: 'green',
                    },
                    {
                        label: 'Maintenance',
                        value: counts?.maintenance ?? '—',
                        tone: 'amber',
                    },
                    { label: 'Inactive', value: counts?.inactive ?? '—' },
                ]}
            />
            <div className="cw-toolbar">
                <select
                    aria-label="Filter camp"
                    value={camp}
                    onChange={(e) => filter(setCamp, e.target.value)}
                >
                    <option value="">All camps</option>
                    {camps.data?.map((c) => (
                        <option key={idOf(c)} value={idOf(c)}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter facility type"
                    value={kind}
                    onChange={(e) => filter(setKind, e.target.value)}
                >
                    <option value="">All types</option>
                    {kinds.map(([k, label]) => (
                        <option key={k} value={k}>
                            {label}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter status"
                    value={status}
                    onChange={(e) => filter(setStatus, e.target.value)}
                >
                    <option value="">All statuses</option>
                    {['active', 'maintenance', 'inactive'].map((v) => (
                        <option key={v}>{v}</option>
                    ))}
                </select>
                <input
                    aria-label="Search facilities"
                    placeholder="Search facilities…"
                    value={search}
                    onChange={(e) => filter(setSearch, e.target.value)}
                />
                <Button
                    aria-label="Card view"
                    icon={<HiOutlineViewGrid />}
                    onClick={() => setView('cards')}
                />
                <Button
                    aria-label="List view"
                    icon={<HiOutlineViewList />}
                    onClick={() => setView('list')}
                />
            </div>
            {camps.error && <Notice>{camps.error}</Notice>}
            <State
                loading={list.loading}
                error={list.error}
                retry={list.reload}
                empty={
                    !list.data?.data?.length &&
                    'No facilities match your filters. Add a facility or adjust your search.'
                }
            >
                {view === 'cards' ? (
                    <div className="cw-facilities">
                        {list.data?.data.map((f: RecordData) => (
                            <article
                                className="cw-card cw-facility"
                                key={idOf(f)}
                            >
                                <div className="cw-facility-head">
                                    <HiOutlineOfficeBuilding />
                                    <div>
                                        <h3>{f.name}</h3>
                                        <p>{f.campId?.name}</p>
                                        <small>{kindName(f.kind)}</small>
                                    </div>
                                </div>
                                <div>
                                    <p>
                                        Capacity:{' '}
                                        {f.capacity
                                            ? `${f.capacity} ${
                                                  f.kind === 'parking'
                                                      ? 'spaces'
                                                      : 'people'
                                              }`
                                            : 'Not set'}
                                    </p>
                                    <p>Hours: {f.openingHours || 'Not set'}</p>
                                </div>
                                <footer className="cw-facility-foot">
                                    <Badge value={f.status} />
                                    <button onClick={() => show(f)}>
                                        View details →
                                    </button>
                                </footer>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="cw-card cw-table-wrap">
                        <table className="cw-table">
                            <thead>
                                <tr>
                                    <th>Facility</th>
                                    <th>Camp</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.data?.data.map((f: RecordData) => (
                                    <tr key={idOf(f)}>
                                        <td>{f.name}</td>
                                        <td>{f.campId?.name}</td>
                                        <td>{kindName(f.kind)}</td>
                                        <td>
                                            <Badge value={f.status} />
                                        </td>
                                        <td>
                                            <button onClick={() => show(f)}>
                                                View details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pager
                    page={page}
                    totalPages={list.data?.totalPages || 0}
                    total={list.data?.total || 0}
                    onPage={setPage}
                />
            </State>
            <Panel
                title={
                    editing
                        ? can('facilities')
                            ? 'Edit facility'
                            : 'Facility details'
                        : 'Add facility'
                }
                open={open}
                onClose={close}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        void save()
                    }}
                >
                    {error && <Notice>{error}</Notice>}
                    <fieldset disabled={saving || !can('facilities')}>
                        <Field label="Camp">
                            <select
                                required
                                value={form.campId}
                                disabled={!!editing}
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
                        <Field label="Type">
                            <select
                                value={form.kind}
                                onChange={(e) => change('kind', e.target.value)}
                            >
                                {kinds.map(([k, l]) => (
                                    <option key={k} value={k}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Facility name">
                            <input
                                required
                                maxLength={200}
                                value={form.name}
                                onChange={(e) => change('name', e.target.value)}
                            />
                        </Field>
                        <Field
                            label={`Capacity (${
                                form.kind === 'parking' ? 'spaces' : 'people'
                            })`}
                            hint="Leave empty if capacity is not recorded."
                        >
                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={form.capacity}
                                onChange={(e) =>
                                    change('capacity', e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Opening hours">
                            <input
                                placeholder="e.g. 06:00–22:00"
                                maxLength={200}
                                value={form.openingHours}
                                onChange={(e) =>
                                    change('openingHours', e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Status">
                            <select
                                value={form.status}
                                onChange={(e) =>
                                    change('status', e.target.value)
                                }
                            >
                                {['active', 'maintenance', 'inactive'].map(
                                    (v) => (
                                        <option key={v}>{v}</option>
                                    ),
                                )}
                            </select>
                        </Field>
                        <Field label="Description (optional)">
                            <textarea
                                maxLength={2000}
                                value={form.description}
                                onChange={(e) =>
                                    change('description', e.target.value)
                                }
                            />
                        </Field>
                    </fieldset>
                    {editing && form.status !== editing.status && (
                        <Notice type="info">
                            Saving changes the facility status from{' '}
                            {editing.status} to {form.status}. Accommodation
                            occupancy is unaffected.
                        </Notice>
                    )}
                    {can('facilities') && (
                        <Actions
                            saving={saving}
                            onCancel={close}
                            label="Save facility"
                        />
                    )}
                </form>
            </Panel>
        </Page>
    )
}
