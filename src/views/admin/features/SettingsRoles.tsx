import { useAppDispatch, signInSuccess } from '@/store'
import { useState } from 'react'
import {
    Page,
    Primary,
    Tabs,
    State,
    Badge,
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
    type RecordData,
} from './shared'
const labels: Record<string, string> = {
    structure: 'Manage locations, camps and buildings',
    rooms: 'Manage rooms',
    residents: 'Manage resident records',
    stays: 'Check in and check out',
    facilities: 'Manage facilities',
    reports: 'View reports',
    export: 'Export reports',
    users: 'Manage users and roles',
    preferences: 'Organization preferences',
}
const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    camp_manager: 'Camp Manager',
    reception: 'Reception',
    viewer: 'Viewer',
}
const blank = {
    name: '',
    email: '',
    role: 'viewer',
    assignedCamps: [] as string[],
    active: true,
    temporaryPassword: '',
}
export default function SettingsRoles() {
    const dispatch = useAppDispatch()
    const { user, settings, refresh } = useAccess(),
        [tab, setTab] = useState('users'),
        [search, setSearch] = useState(''),
        [role, setRole] = useState(''),
        [status, setStatus] = useState(''),
        [camp, setCamp] = useState(''),
        [selectedRole, setSelectedRole] = useState('camp_manager')
    const users = useRequest<RecordData[]>('/api/users'),
        roles = useRequest<RecordData[]>('/api/users/roles'),
        camps = useRequest<RecordData[]>('/api/camps'),
        activity = useRequest<RecordData[]>('/api/settings/activity')
    const [open, setOpen] = useState(false),
        [editing, setEditing] = useState<RecordData | null>(null),
        [form, setForm] = useState(blank),
        [review, setReview] = useState(false),
        [saving, setSaving] = useState(false),
        [error, setError] = useState(''),
        [success, setSuccess] = useState(''),
        [resetMode, setResetMode] = useState(false)
    const [preferences, setPreferences] = useState({ ...settings }),
        [currentPassword, setCurrentPassword] = useState(''),
        [password, setPassword] = useState('')
    const rows = (users.data || []).filter(
        (u) =>
            (!search ||
                `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(search.toLowerCase())) &&
            (!role || u.role === role) &&
            (!status || (status === 'active') === u.active) &&
            (!camp ||
                u.role === 'admin' ||
                u.assignedCamps.some((c: string) => idOf(c) === camp)),
    )
    const close = () => {
            if (!saving) {
                setOpen(false)
                setError('')
            }
        },
        show = (u: RecordData | null) => {
            setEditing(u)
            setForm(
                u
                    ? {
                          name: u.name,
                          email: u.email,
                          role: u.role,
                          assignedCamps: u.assignedCamps.map(idOf),
                          active: u.active,
                          temporaryPassword: '',
                      }
                    : blank,
            )
            setReview(false)
            setResetMode(false)
            setError('')
            setOpen(true)
        }
    const save = async () => {
        setSaving(true)
        setError('')
        try {
            if (resetMode)
                await api.post(`/api/users/${idOf(editing)}/reset-password`, {
                    temporaryPassword: form.temporaryPassword,
                })
            else if (editing)
                await api.patch(`/api/users/${idOf(editing)}`, form)
            else await api.post('/api/users', form)
            setOpen(false)
            setSuccess(
                resetMode
                    ? 'Temporary password saved. Share it securely with the user.'
                    : editing
                      ? 'User access updated. Changed access ends existing sessions.'
                      : 'User created. Share the temporary password securely; the user must change it at sign-in.',
            )
            users.reload()
            activity.reload()
            if (editing && idOf(editing) === user?.id) await refresh()
        } catch (e) {
            setError(errorText(e))
        } finally {
            setSaving(false)
        }
    }
    const selectedTemplate = roles.data?.find((r) => r.key === selectedRole)
    return (
        <Page
            title="Settings & Roles"
            description="Manage user access and camp permissions."
            action={<Primary onClick={() => show(null)}>Add user</Primary>}
        >
            {success && <Notice type="success">{success}</Notice>}
            <Tabs
                active={tab}
                onChange={(v) => {
                    setTab(v)
                    setError('')
                    if (v === 'preferences') setPreferences({ ...settings })
                }}
                items={[
                    { key: 'users', label: 'Users' },
                    { key: 'roles', label: 'Roles' },
                    { key: 'preferences', label: 'Preferences' },
                ]}
            />
            {tab === 'users' && (
                <>
                    <div className="cw-toolbar">
                        <input
                            aria-label="Search users"
                            placeholder="Search users…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            aria-label="Role filter"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="">All roles</option>
                            {Object.entries(roleLabels).map(([k, l]) => (
                                <option key={k} value={k}>
                                    {l}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Camp filter"
                            value={camp}
                            onChange={(e) => setCamp(e.target.value)}
                        >
                            <option value="">All camps</option>
                            {camps.data?.map((c) => (
                                <option key={idOf(c)} value={idOf(c)}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Account status filter"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <State
                        loading={users.loading}
                        error={users.error}
                        retry={users.reload}
                        empty={!rows.length && 'No users match these filters.'}
                    >
                        <div className="cw-card cw-table-wrap">
                            <table className="cw-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Camp access</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((u) => (
                                        <tr key={idOf(u)}>
                                            <td>
                                                <strong>{u.name}</strong>
                                                <small>{u.email}</small>
                                            </td>
                                            <td>{roleLabels[u.role]}</td>
                                            <td>
                                                {u.role === 'admin'
                                                    ? 'All camps'
                                                    : u.assignedCamps
                                                          .map(
                                                              (id: string) =>
                                                                  camps.data?.find(
                                                                      (c) =>
                                                                          idOf(
                                                                              c,
                                                                          ) ===
                                                                          idOf(
                                                                              id,
                                                                          ),
                                                                  )?.name,
                                                          )
                                                          .filter(Boolean)
                                                          .join(', ') ||
                                                      'No camps assigned'}
                                            </td>
                                            <td>
                                                <Badge
                                                    value={
                                                        u.active
                                                            ? 'active'
                                                            : 'inactive'
                                                    }
                                                />
                                                {u.mustChangePassword && (
                                                    <small>
                                                        Password change required
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    onClick={() => show(u)}
                                                >
                                                    Edit access
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </State>
                </>
            )}
            {tab === 'roles' && (
                <State
                    loading={roles.loading}
                    error={roles.error}
                    retry={roles.reload}
                >
                    <div className="cw-roles">
                        <div className="cw-card cw-role-list">
                            <h3>Role templates</h3>
                            {roles.data?.map((r) => (
                                <button
                                    key={r.key}
                                    className={
                                        r.key === selectedRole
                                            ? 'is-active'
                                            : ''
                                    }
                                    onClick={() => setSelectedRole(r.key)}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <div className="cw-card cw-permissions">
                            <h2>{selectedTemplate?.label}</h2>
                            <p>
                                {selectedRole === 'admin'
                                    ? 'Administrative access across all camps.'
                                    : 'Operational access is limited to assigned camps.'}
                            </p>
                            <div className="cw-permission">
                                <span>View authorized camps and rooms</span>
                                <strong className="cw-green">✓</strong>
                            </div>
                            {Object.entries(labels).map(([key, label]) => (
                                <div className="cw-permission" key={key}>
                                    <span>{label}</span>
                                    <strong
                                        className={
                                            selectedTemplate?.permissions.includes(
                                                key,
                                            )
                                                ? 'cw-green'
                                                : ''
                                        }
                                    >
                                        {selectedTemplate?.permissions.includes(
                                            key,
                                        )
                                            ? '✓'
                                            : '—'}
                                    </strong>
                                </div>
                            ))}
                            <Notice type="info">
                                Assign roles and camps from the Users tab. Role
                                templates are fixed.
                            </Notice>
                        </div>
                    </div>
                </State>
            )}
            {tab === 'preferences' && (
                <>
                    <form
                        className="cw-card cw-preferences"
                        onSubmit={async (e) => {
                            e.preventDefault()
                            setSaving(true)
                            setError('')
                            try {
                                await api.patch('/api/settings', preferences)
                                await refresh()
                                activity.reload()
                                setSuccess('Organization preferences saved.')
                            } catch (e) {
                                setError(errorText(e))
                            } finally {
                                setSaving(false)
                            }
                        }}
                    >
                        <h2>Organization preferences</h2>
                        <p className="my-4">
                            Used for operational dates and report headers.
                        </p>
                        {error && <Notice>{error}</Notice>}
                        <Field label="Organization name">
                            <input
                                required
                                maxLength={120}
                                value={preferences.name}
                                onChange={(e) =>
                                    setPreferences((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <Field label="Report logo URL (optional)">
                            <input
                                value={preferences.logoUrl}
                                placeholder="https://…"
                                onChange={(e) =>
                                    setPreferences((p) => ({
                                        ...p,
                                        logoUrl: e.target.value,
                                    }))
                                }
                            />
                        </Field>
                        <Field label="Operational timezone">
                            <select
                                value={preferences.timezone}
                                onChange={(e) =>
                                    setPreferences((p) => ({
                                        ...p,
                                        timezone: e.target.value,
                                    }))
                                }
                            >
                                {[
                                    ...new Set([
                                        preferences.timezone,
                                        'Asia/Riyadh',
                                        'Asia/Dubai',
                                        'Asia/Karachi',
                                        'UTC',
                                        'Europe/London',
                                        'America/New_York',
                                    ]),
                                ].map((z) => (
                                    <option key={z}>{z}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Date format">
                            <select
                                value={preferences.dateFormat}
                                onChange={(e) =>
                                    setPreferences((p) => ({
                                        ...p,
                                        dateFormat: e.target.value,
                                    }))
                                }
                            >
                                {[
                                    'DD MMM YYYY',
                                    'DD/MM/YYYY',
                                    'YYYY-MM-DD',
                                ].map((f) => (
                                    <option key={f}>{f}</option>
                                ))}
                            </select>
                        </Field>
                        <Button
                            type="submit"
                            loading={saving}
                            variant="solid"
                            color="blue-600"
                        >
                            Save preferences
                        </Button>
                    </form>
                    <form
                        className="cw-card cw-preferences mt-6"
                        onSubmit={async (e) => {
                            e.preventDefault()
                            setError('')
                            setSaving(true)
                            try {
                                const { data } = await api.post(
                                    '/api/change-password',
                                    {
                                        currentPassword,
                                        password,
                                    },
                                )
                                setSuccess(
                                    'Password changed. Other sessions have been signed out.',
                                )
                                dispatch(signInSuccess(data.token))
                                setCurrentPassword('')
                                setPassword('')
                                await refresh()
                            } catch (e) {
                                setError(errorText(e))
                            } finally {
                                setSaving(false)
                            }
                        }}
                    >
                        <h2>Change your password</h2>
                        <Field label="Current password">
                            <input
                                required
                                type="password"
                                autoComplete="current-password"
                                value={currentPassword}
                                onChange={(e) =>
                                    setCurrentPassword(e.target.value)
                                }
                            />
                        </Field>
                        <Field label="New password">
                            <input
                                required
                                minLength={10}
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Field>
                        <Button type="submit" loading={saving}>
                            Change password
                        </Button>
                    </form>
                </>
            )}
            <State
                loading={activity.loading}
                error={activity.error}
                retry={activity.reload}
            >
                <section className="cw-card cw-activity">
                    <h3>Recent access and settings activity</h3>
                    {activity.data?.length ? (
                        activity.data.slice(0, 10).map((a) => (
                            <p key={idOf(a)}>
                                <strong>
                                    {a.actor?.name || 'Administrator'}
                                </strong>{' '}
                                · {a.action.replaceAll('-', ' ')}
                                <small className="block">
                                    {new Date(a.createdAt).toLocaleString(
                                        'en-GB',
                                        { timeZone: settings.timezone },
                                    )}
                                </small>
                            </p>
                        ))
                    ) : (
                        <p>No access changes recorded yet.</p>
                    )}
                </section>
            </State>
            <Panel
                title={
                    resetMode
                        ? 'Reset password'
                        : editing
                          ? 'Edit user access'
                          : 'Add user'
                }
                open={open}
                onClose={close}
            >
                {error && <Notice>{error}</Notice>}
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        if (!review) {
                            setReview(true)
                            return
                        }
                        void save()
                    }}
                >
                    {review ? (
                        <>
                            <div className="cw-card cw-details">
                                <h3>
                                    Review{' '}
                                    {resetMode
                                        ? 'password reset'
                                        : 'user access'}
                                </h3>
                                <p>
                                    {form.name} · {form.email}
                                </p>
                                {resetMode ? (
                                    <p>
                                        Existing sessions will end. The user
                                        must change the temporary password at
                                        their next sign-in.
                                    </p>
                                ) : (
                                    <>
                                        <p>Role: {roleLabels[form.role]}</p>
                                        <p>
                                            Camps:{' '}
                                            {form.role === 'admin'
                                                ? 'All camps'
                                                : form.assignedCamps
                                                      .map(
                                                          (id) =>
                                                              camps.data?.find(
                                                                  (c) =>
                                                                      idOf(
                                                                          c,
                                                                      ) === id,
                                                              )?.name,
                                                      )
                                                      .join(', ') || 'None'}
                                        </p>
                                        <p>
                                            Account:{' '}
                                            {form.active
                                                ? 'Active'
                                                : 'Inactive'}
                                        </p>
                                    </>
                                )}
                            </div>
                            <Notice type="info">
                                {!editing
                                    ? 'Share the temporary password securely. No invitation email is sent.'
                                    : 'Confirm these changes before saving.'}
                            </Notice>
                        </>
                    ) : (
                        <fieldset disabled={saving}>
                            {!resetMode && (
                                <>
                                    <Field label="Name">
                                        <input
                                            required
                                            maxLength={200}
                                            value={form.name}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    name: e.target.value,
                                                }))
                                            }
                                        />
                                    </Field>
                                    <Field label="Email">
                                        <input
                                            required
                                            type="email"
                                            value={form.email}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    email: e.target.value,
                                                }))
                                            }
                                        />
                                    </Field>
                                    <Field label="Role">
                                        <select
                                            value={form.role}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    role: e.target.value,
                                                }))
                                            }
                                        >
                                            {Object.entries(roleLabels).map(
                                                ([k, l]) => (
                                                    <option key={k} value={k}>
                                                        {l}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </Field>
                                    {form.role !== 'admin' && (
                                        <Field label="Assigned camps">
                                            <div className="cw-check-list">
                                                {camps.data?.map((c) => (
                                                    <label key={idOf(c)}>
                                                        <input
                                                            type="checkbox"
                                                            checked={form.assignedCamps.includes(
                                                                idOf(c),
                                                            )}
                                                            onChange={(e) =>
                                                                setForm(
                                                                    (f) => ({
                                                                        ...f,
                                                                        assignedCamps:
                                                                            e
                                                                                .target
                                                                                .checked
                                                                                ? [
                                                                                      ...f.assignedCamps,
                                                                                      idOf(
                                                                                          c,
                                                                                      ),
                                                                                  ]
                                                                                : f.assignedCamps.filter(
                                                                                      (
                                                                                          id,
                                                                                      ) =>
                                                                                          id !==
                                                                                          idOf(
                                                                                              c,
                                                                                          ),
                                                                                  ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                        {c.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </Field>
                                    )}
                                    {!form.assignedCamps.length &&
                                        form.role !== 'admin' && (
                                            <Notice type="info">
                                                Without assigned camps this user
                                                has no operational data access.
                                            </Notice>
                                        )}
                                    <Field label="Account status">
                                        <select
                                            value={
                                                form.active
                                                    ? 'active'
                                                    : 'inactive'
                                            }
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    active:
                                                        e.target.value ===
                                                        'active',
                                                }))
                                            }
                                        >
                                            <option value="active">
                                                Active
                                            </option>
                                            <option value="inactive">
                                                Inactive
                                            </option>
                                        </select>
                                    </Field>
                                </>
                            )}
                            {(!editing || resetMode) && (
                                <Field
                                    label="Temporary password"
                                    hint="At least 10 characters. The user must change it after signing in."
                                >
                                    <input
                                        type="password"
                                        required
                                        minLength={10}
                                        autoComplete="new-password"
                                        value={form.temporaryPassword}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                temporaryPassword:
                                                    e.target.value,
                                            }))
                                        }
                                    />
                                </Field>
                            )}
                            {editing &&
                                !resetMode &&
                                idOf(editing) !== user?.id && (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setResetMode(true)
                                            setReview(false)
                                        }}
                                    >
                                        Reset password…
                                    </Button>
                                )}
                        </fieldset>
                    )}
                    <div className="cw-form-actions">
                        <Button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                review ? setReview(false) : close()
                            }
                        >
                            {review ? 'Back' : 'Cancel'}
                        </Button>
                        <Button
                            type="submit"
                            variant="solid"
                            color="blue-600"
                            loading={saving}
                        >
                            {review ? 'Confirm changes' : 'Review changes'}
                        </Button>
                    </div>
                </form>
            </Panel>
        </Page>
    )
}
