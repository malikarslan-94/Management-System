import { useState } from 'react'
import { HiOutlineDownload, HiOutlinePrinter } from 'react-icons/hi'
import {
    Page,
    Stats,
    Tabs,
    Notice,
    Button,
    Field,
    api,
    useRequest,
    useAccess,
    errorText,
    idOf,
    today,
    kinds,
    type RecordData,
} from './shared'
const tabs = [
    { key: 'occupancy', label: 'Occupancy' },
    { key: 'residents', label: 'Resident roster' },
    { key: 'movements', label: 'Check-in / Check-out' },
    { key: 'facilities', label: 'Facilities' },
]
export default function Reports() {
    const { can, settings } = useAccess(),
        [type, setType] = useState('occupancy'),
        [filters, setFilters] = useState<RecordData>({
            campId: '',
            locationId: '',
            buildingId: '',
            department: '',
            residentType: '',
            residentStatus: '',
            facilityType: '',
            facilityStatus: '',
            eventType: '',
            from: today(settings.timezone),
            to: today(settings.timezone),
        })
    const camps = useRequest<RecordData[]>('/api/camps'),
        locations = useRequest<RecordData[]>('/api/locations'),
        buildings = useRequest<RecordData[]>('/api/buildings', {
            campId: filters.campId || undefined,
        })
    const [report, setReport] = useState<RecordData | null>(null),
        [loading, setLoading] = useState(false),
        [error, setError] = useState(''),
        [exporting, setExporting] = useState(false),
        [stale, setStale] = useState(false)
    const change = (key: string, value: string) => {
        setFilters((f) => ({
            ...f,
            [key]: value,
            ...(key === 'locationId'
                ? { campId: '', buildingId: '' }
                : key === 'campId'
                  ? { buildingId: '' }
                  : {}),
        }))
        if (report) setStale(true)
    }
    const generate = async () => {
        setLoading(true)
        setError('')
        try {
            const { data } = await api.post('/api/reports', {
                ...filters,
                type,
            })
            setReport(data)
            setStale(false)
        } catch (e) {
            setReport(null)
            setError(errorText(e))
        } finally {
            setLoading(false)
        }
    }
    const download = async () => {
        if (!report) return
        setExporting(true)
        setError('')
        try {
            const { data } = await api.get(`/api/reports/${report._id}/csv`, {
                responseType: 'blob',
            })
            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = `campwise-${report.type}-${report.createdAt.slice(
                0,
                10,
            )}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            const err = e as any
            if (err.response?.data instanceof Blob) {
                try {
                    setError(JSON.parse(await err.response.data.text()).message)
                } catch {
                    setError(
                        'Export failed. Generate a new preview and try again.',
                    )
                }
            } else setError(errorText(e))
        } finally {
            setExporting(false)
        }
    }
    const activeCamps = (camps.data || []).filter(
        (c) => !filters.locationId || idOf(c.locationId) === filters.locationId,
    )
    return (
        <Page
            title="Reports"
            description="Preview operational data before exporting."
            action={
                can('export') ? (
                    <div className="cw-inline-actions">
                        <Button
                            icon={<HiOutlinePrinter />}
                            disabled={!report || loading || stale}
                            onClick={() => window.print()}
                        >
                            Print / PDF
                        </Button>
                        <Button
                            variant="solid"
                            color="blue-600"
                            icon={<HiOutlineDownload />}
                            loading={exporting}
                            disabled={!report || loading || stale}
                            onClick={() => void download()}
                        >
                            Export CSV
                        </Button>
                    </div>
                ) : undefined
            }
        >
            <Tabs
                items={tabs}
                active={type}
                onChange={(v) => {
                    setType(v)
                    setFilters((f) => ({
                        ...f,
                        buildingId: '',
                        department: '',
                        residentType: '',
                        residentStatus: '',
                        facilityType: '',
                        facilityStatus: '',
                        eventType: '',
                    }))
                    setReport(null)
                    setError('')
                    setStale(false)
                }}
            />
            <form
                className="cw-card"
                style={{ padding: 18 }}
                onSubmit={(e) => {
                    e.preventDefault()
                    void generate()
                }}
            >
                <div className="cw-toolbar" style={{ margin: 0 }}>
                    <select
                        aria-label="Location"
                        value={filters.locationId}
                        onChange={(e) => change('locationId', e.target.value)}
                    >
                        <option value="">All locations</option>
                        {locations.data?.map((l) => (
                            <option key={idOf(l)} value={idOf(l)}>
                                {l.name}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Camp"
                        value={filters.campId}
                        onChange={(e) => change('campId', e.target.value)}
                    >
                        <option value="">All camps</option>
                        {activeCamps.map((c) => (
                            <option key={idOf(c)} value={idOf(c)}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    {type === 'occupancy' && (
                        <>
                            <select
                                aria-label="Building"
                                value={filters.buildingId}
                                onChange={(e) =>
                                    change('buildingId', e.target.value)
                                }
                            >
                                <option value="">All buildings</option>
                                {buildings.data
                                    ?.filter((b) =>
                                        activeCamps.some(
                                            (c) => idOf(c) === idOf(b.campId),
                                        ),
                                    )
                                    .map((b) => (
                                        <option key={idOf(b)} value={idOf(b)}>
                                            {b.name}
                                        </option>
                                    ))}
                            </select>
                            <span className="cw-badge">Current snapshot</span>
                        </>
                    )}
                    {type === 'residents' && (
                        <>
                            <input
                                aria-label="Department"
                                placeholder="All departments"
                                value={filters.department}
                                onChange={(e) =>
                                    change('department', e.target.value)
                                }
                            />
                            <select
                                aria-label="Resident type"
                                value={filters.residentType}
                                onChange={(e) =>
                                    change('residentType', e.target.value)
                                }
                            >
                                <option value="">All resident types</option>
                                {['Permanent', 'Temporary', 'Visitor'].map(
                                    (v) => (
                                        <option key={v}>{v}</option>
                                    ),
                                )}
                            </select>
                            <select
                                aria-label="Resident status"
                                value={filters.residentStatus}
                                onChange={(e) =>
                                    change('residentStatus', e.target.value)
                                }
                            >
                                <option value="">All resident statuses</option>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                        </>
                    )}
                    {type === 'movements' && (
                        <>
                            <Field label="From">
                                <input
                                    required
                                    type="date"
                                    value={filters.from}
                                    onChange={(e) =>
                                        change('from', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="To">
                                <input
                                    required
                                    type="date"
                                    min={filters.from}
                                    value={filters.to}
                                    onChange={(e) =>
                                        change('to', e.target.value)
                                    }
                                />
                            </Field>
                            <select
                                aria-label="Event type"
                                value={filters.eventType}
                                onChange={(e) =>
                                    change('eventType', e.target.value)
                                }
                            >
                                <option value="">All events</option>
                                <option value="in">Check-in</option>
                                <option value="out">
                                    Check-out / Cancellation
                                </option>
                            </select>
                        </>
                    )}
                    {type === 'facilities' && (
                        <>
                            <select
                                aria-label="Facility type"
                                value={filters.facilityType}
                                onChange={(e) =>
                                    change('facilityType', e.target.value)
                                }
                            >
                                <option value="">All facility types</option>
                                {kinds.map(([k, l]) => (
                                    <option key={k} value={k}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                            <select
                                aria-label="Facility status"
                                value={filters.facilityStatus}
                                onChange={(e) =>
                                    change('facilityStatus', e.target.value)
                                }
                            >
                                <option value="">All statuses</option>
                                {['active', 'maintenance', 'inactive'].map(
                                    (s) => (
                                        <option key={s}>{s}</option>
                                    ),
                                )}
                            </select>
                        </>
                    )}
                    <Button
                        type="submit"
                        variant="solid"
                        color="blue-600"
                        loading={loading}
                        disabled={camps.loading || locations.loading}
                    >
                        Generate report
                    </Button>
                </div>
            </form>
            {(camps.error || locations.error || error) && (
                <Notice>{error || camps.error || locations.error}</Notice>
            )}
            {stale && (
                <Notice type="info">
                    Filters have changed. Generate a new report to refresh the
                    preview and exports.
                </Notice>
            )}
            {!report && !loading && !error && (
                <div className="cw-empty">
                    Choose your filters and generate a report.
                </div>
            )}
            {loading && (
                <div className="cw-empty" role="status">
                    Preparing your report…
                </div>
            )}
            {report && !loading && (
                <section className="cw-report-print">
                    <div className="cw-print-heading">
                        <div className="cw-inline-actions">
                            {report.logoUrl && (
                                <img
                                    src={report.logoUrl}
                                    alt="Organization logo"
                                    style={{
                                        maxWidth: 120,
                                        maxHeight: 48,
                                        objectFit: 'contain',
                                    }}
                                />
                            )}
                            <h1>{report.organization}</h1>
                        </div>
                        <h2>{report.title}</h2>
                    </div>
                    <p className="cw-report-meta">
                        Generated{' '}
                        {new Intl.DateTimeFormat('en-GB', {
                            timeZone: report.timezone,
                            dateStyle: 'medium',
                            timeStyle: 'short',
                        }).format(new Date(report.createdAt))}{' '}
                        · {report.timezone} · {report.filters.camp}
                        {report.filters.from
                            ? ` · ${report.filters.from} to ${report.filters.to}`
                            : ''}
                    </p>
                    <div className="cw-report-meta">
                        {Object.entries(report.filters)
                            .filter(([key, value]) => key !== 'camp' && !!value)
                            .map(
                                ([key, value]) =>
                                    `${key
                                        .replace(/([A-Z])/g, ' $1')
                                        .replace(/^./, (c) =>
                                            c.toUpperCase(),
                                        )}: ${value}`,
                            )
                            .join(' · ')}
                    </div>
                    {report.type === 'occupancy' ? (
                        <>
                            <Stats
                                items={[
                                    {
                                        label: 'Total rooms',
                                        value: report.summary.total,
                                    },
                                    {
                                        label: 'Occupied',
                                        value: report.summary.occupied,
                                    },
                                    {
                                        label: 'Available',
                                        value: report.summary.available,
                                    },
                                    {
                                        label: 'Unavailable',
                                        value: report.summary.unavailable,
                                    },
                                ]}
                            />
                            <div className="cw-report-charts">
                                <div className="cw-card cw-report-chart">
                                    <h2>Room occupancy</h2>
                                    <div className="cw-chart-body">
                                        <div
                                            className="cw-donut"
                                            style={{
                                                background: report.summary.total
                                                    ? `conic-gradient(#326bfa 0 ${
                                                          (report.summary
                                                              .occupied /
                                                              report.summary
                                                                  .total) *
                                                          100
                                                      }%,#48bf7e ${
                                                          (report.summary
                                                              .occupied /
                                                              report.summary
                                                                  .total) *
                                                          100
                                                      }% ${
                                                          ((report.summary
                                                              .occupied +
                                                              report.summary
                                                                  .available) /
                                                              report.summary
                                                                  .total) *
                                                          100
                                                      }%,#f5b544 ${
                                                          ((report.summary
                                                              .occupied +
                                                              report.summary
                                                                  .available) /
                                                              report.summary
                                                                  .total) *
                                                          100
                                                      }% 100%)`
                                                    : '#e5e9f0',
                                            }}
                                        >
                                            <div>
                                                <strong>
                                                    {report.summary.occupancy}%
                                                </strong>
                                                <small>Room occupancy</small>
                                            </div>
                                        </div>
                                        <div className="cw-legend">
                                            {[
                                                'occupied',
                                                'available',
                                                'unavailable',
                                            ].map((k) => (
                                                <div key={k}>
                                                    <span>
                                                        {k[0].toUpperCase() +
                                                            k.slice(1)}
                                                    </span>
                                                    <strong>
                                                        {report.summary[k]}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="cw-card cw-report-chart">
                                    <h2>By camp</h2>
                                    {report.rows.map((row: RecordData) => (
                                        <div className="cw-bar" key={row.camp}>
                                            <span>{row.camp}</span>
                                            <div className="cw-bar-track">
                                                <span
                                                    style={{
                                                        width: `${row.occupancy}%`,
                                                    }}
                                                />
                                            </div>
                                            <strong>{row.occupancy}%</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="cw-report-meta">
                            {report.rows.length} matching records
                        </p>
                    )}
                    <div className="cw-card">
                        <div className="cw-table-wrap">
                            <table className="cw-table">
                                <thead>
                                    <tr>
                                        {report.columns.map((c: RecordData) => (
                                            <th key={c.key}>{c.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.rows.map(
                                        (row: RecordData, i: number) => (
                                            <tr key={i}>
                                                {report.columns.map(
                                                    (c: RecordData) => (
                                                        <td key={c.key}>
                                                            {String(
                                                                row[c.key] ??
                                                                    '—',
                                                            )}
                                                            {c.key ===
                                                            'occupancy'
                                                                ? '%'
                                                                : ''}
                                                        </td>
                                                    ),
                                                )}
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                                {report.type === 'occupancy' && (
                                    <tfoot>
                                        <tr>
                                            {report.columns.map(
                                                (c: RecordData) => (
                                                    <td key={c.key}>
                                                        {c.key === 'camp'
                                                            ? 'Total'
                                                            : `${
                                                                  report
                                                                      .summary[
                                                                      c.key
                                                                  ]
                                                              }${
                                                                  c.key ===
                                                                  'occupancy'
                                                                      ? '%'
                                                                      : ''
                                                              }`}
                                                    </td>
                                                ),
                                            )}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        {!report.rows.length && (
                            <div className="cw-empty">
                                No records match these filters.
                            </div>
                        )}
                    </div>
                    {report.type === 'occupancy' && (
                        <p className="cw-report-meta">
                            Unavailable includes rooms marked for maintenance or
                            cleaning. Occupancy is based on rooms, not beds.
                        </p>
                    )}
                </section>
            )}
        </Page>
    )
}
