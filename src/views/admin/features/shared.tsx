import {
    useEffect,
    useState,
    useId,
    isValidElement,
    cloneElement,
    type ReactElement,
    type ReactNode,
} from 'react'
import { HiOutlinePlus, HiOutlineRefresh } from 'react-icons/hi'
import api from '@/services/api'
import Button from '@/components/ui/Button'
import Drawer from '@/components/ui/Drawer'
import { errorText, useAccess } from '@/components/shared/AccessProvider'
import './features.css'
export { api, Button, useAccess, errorText }
export type RecordData = Record<string, any>
export const idOf = (v: any): string => String(v?._id || v?.id || v || '')
export function today(timezone = 'Asia/Riyadh') {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date())
}
export function dayLabel(v?: string) {
    return v ? v.slice(0, 10) : '—'
}
export function displayDate(
    value?: string,
    format = 'DD MMM YYYY',
    timezone = 'UTC',
) {
    if (!value || !Number.isFinite(Date.parse(value))) return '—'
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        day: '2-digit',
        month: format === 'DD MMM YYYY' ? 'short' : '2-digit',
        year: 'numeric',
    }).formatToParts(new Date(value))
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    if (format === 'YYYY-MM-DD') return `${p.year}-${p.month}-${p.day}`
    if (format === 'DD/MM/YYYY') return `${p.day}/${p.month}/${p.year}`
    return `${p.day} ${p.month} ${p.year}`
}
export function useRequest<T>(url: string, params: RecordData = {}) {
    const [data, setData] = useState<T | null>(null),
        [loading, setLoading] = useState(true),
        [error, setError] = useState(''),
        [revision, setRevision] = useState(0)
    const key = JSON.stringify(params)
    useEffect(() => {
        let alive = true
        setLoading(true)
        setError('')
        api.get<T>(url, { params: JSON.parse(key) })
            .then((r) => {
                if (alive) setData(r.data)
            })
            .catch((e) => {
                if (alive) {
                    setError(errorText(e))
                    setData(null)
                }
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [url, key, revision])
    return {
        data,
        loading,
        error,
        reload: () => setRevision((v) => v + 1),
        setData,
    }
}
export function Page({
    title,
    description,
    action,
    children,
}: {
    title: string
    description: string
    action?: ReactNode
    children: ReactNode
}) {
    return (
        <main className="cw-workspace">
            <header className="cw-heading">
                <div>
                    <h1>{title}</h1>
                    <p>{description}</p>
                </div>
                {action}
            </header>
            {children}
        </main>
    )
}
export function Primary({
    children,
    onClick,
    disabled = false,
}: {
    children: ReactNode
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <Button
            variant="solid"
            color="blue-600"
            icon={<HiOutlinePlus />}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </Button>
    )
}
export function Stats({
    items,
}: {
    items: { label: string; value: number | string; tone?: string }[]
}) {
    return (
        <div className="cw-stats">
            {items.map((x) => (
                <section className="cw-card cw-stat" key={x.label}>
                    <span>{x.label}</span>
                    <strong className={x.tone ? `cw-${x.tone}` : ''}>
                        {x.value}
                    </strong>
                </section>
            ))}
        </div>
    )
}
export function Badge({ value }: { value: string }) {
    return (
        <span
            className={`cw-badge cw-badge-${value
                .toLowerCase()
                .replaceAll(' ', '-')}`}
        >
            {value}
        </span>
    )
}
export function Notice({
    children,
    type = 'error',
}: {
    children: ReactNode
    type?: 'error' | 'success' | 'info'
}) {
    return (
        <div
            className={`cw-notice cw-notice-${type}`}
            role={type === 'error' ? 'alert' : 'status'}
        >
            {children}
        </div>
    )
}
export function State({
    loading,
    error,
    empty,
    retry,
    children,
}: {
    loading: boolean
    error: string
    empty?: string | false
    retry: () => void
    children: ReactNode
}) {
    if (loading)
        return (
            <div className="cw-empty" role="status">
                Loading records…
            </div>
        )
    if (error)
        return (
            <div className="cw-empty">
                <Notice>{error}</Notice>
                <Button onClick={retry} icon={<HiOutlineRefresh />}>
                    Retry
                </Button>
            </div>
        )
    if (empty) return <div className="cw-card cw-empty">{empty}</div>
    return <>{children}</>
}
export function Field({
    label,
    children,
    hint,
}: {
    label: string
    children: ReactNode
    hint?: string
}) {
    const id = useId()
    return (
        <div className="cw-field">
            <label htmlFor={id}>{label}</label>
            {isValidElement(children)
                ? cloneElement(children as ReactElement<{ id?: string }>, {
                      id,
                  })
                : children}
            {hint && <small>{hint}</small>}
        </div>
    )
}
export function Panel({
    title,
    open,
    onClose,
    children,
}: {
    title: string
    open: boolean
    onClose: () => void
    children: ReactNode
}) {
    return (
        <Drawer
            title={title}
            isOpen={open}
            onClose={onClose}
            onRequestClose={onClose}
            width={470}
            className="cw-drawer"
            bodyClass="cw-drawer-body"
            contentLabel={title}
        >
            <div className="cw-workspace cw-form-body">{children}</div>
        </Drawer>
    )
}
export function Actions({
    saving,
    onCancel,
    label = 'Save',
}: {
    saving: boolean
    onCancel: () => void
    label?: string
}) {
    return (
        <footer className="cw-form-actions">
            <Button type="button" disabled={saving} onClick={onCancel}>
                Cancel
            </Button>
            <Button
                type="submit"
                variant="solid"
                color="blue-600"
                loading={saving}
            >
                {label}
            </Button>
        </footer>
    )
}
export function Pager({
    page,
    totalPages,
    total,
    onPage,
}: {
    page: number
    totalPages: number
    total: number
    onPage: (n: number) => void
}) {
    return (
        <footer className="cw-pager">
            <span>
                {total} record{total === 1 ? '' : 's'} · Page {page} of{' '}
                {Math.max(totalPages, 1)}
            </span>
            <div>
                <Button
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                >
                    Previous
                </Button>
                <Button
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPage(page + 1)}
                >
                    Next
                </Button>
            </div>
        </footer>
    )
}
export function Tabs({
    items,
    active,
    onChange,
}: {
    items: { key: string; label: string }[]
    active: string
    onChange: (v: string) => void
}) {
    return (
        <div className="cw-tabs" role="tablist">
            {items.map((t) => (
                <button
                    role="tab"
                    aria-selected={t.key === active}
                    key={t.key}
                    className={active === t.key ? 'is-active' : ''}
                    onClick={() => onChange(t.key)}
                >
                    {t.label}
                </button>
            ))}
        </div>
    )
}
export const kinds = [
    ['mosque', 'Mosque'],
    ['mess', 'Mess / Dining'],
    ['playing_area', 'Playing area'],
    ['recreation_center', 'Recreation center'],
    ['medical', 'Medical'],
    ['laundry', 'Laundry'],
    ['parking', 'Parking'],
    ['other', 'Other'],
]
export const kindName = (value: string) =>
    kinds.find((k) => k[0] === value)?.[1] || value
