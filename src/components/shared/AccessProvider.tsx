import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import api from '@/services/api'
import { useAppDispatch, setUser, signInSuccess } from '@/store'
import Button from '@/components/ui/Button'
export type AccessUser = {
    id: string
    name: string
    email: string
    role: string
    assignedCamps: string[]
    active: boolean
    mustChangePassword: boolean
    permissions: string[]
}
export type Organization = {
    name: string
    logoUrl: string
    timezone: string
    dateFormat: string
}
const defaults: Organization = {
    name: 'CampWise',
    logoUrl: '',
    timezone: 'Asia/Riyadh',
    dateFormat: 'DD MMM YYYY',
}
const Context = createContext<{
    user: AccessUser | null
    settings: Organization
    can: (p: string) => boolean
    refresh: () => Promise<void>
}>({
    user: null,
    settings: defaults,
    can: () => false,
    refresh: async () => {},
})
export const useAccess = () => useContext(Context)
export const errorText = (e: unknown) => {
    const error = e as {
        response?: { data?: { message?: string; error?: string } }
        message?: string
    }
    return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Please try again.'
    )
}
export default function AccessProvider({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch()
    const [user, setCurrent] = useState<AccessUser | null>(null),
        [settings, setSettings] = useState(defaults),
        [error, setError] = useState('')
    const [currentPassword, setCurrentPassword] = useState(''),
        [password, setPassword] = useState(''),
        [confirm, setConfirm] = useState(''),
        [saving, setSaving] = useState(false)
    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get('/api/me')
            setCurrent(data.user)
            setSettings(data.settings)
            setError('')
            dispatch(
                setUser({
                    user: data.user.name,
                    email: data.user.email,
                    authority: [data.user.role],
                }),
            )
        } catch (e) {
            setError(errorText(e))
        }
    }, [dispatch])
    useEffect(() => {
        void refresh()
        const handler = () => {
            void refresh()
        }
        window.addEventListener('focus', handler)
        const timer = setInterval(handler, 60000)
        return () => {
            window.removeEventListener('focus', handler)
            clearInterval(timer)
        }
    }, [refresh])
    if (!user)
        return (
            <div className="p-8" role="status">
                {error ? (
                    <>
                        <p role="alert">{error}</p>
                        <Button onClick={() => void refresh()}>Retry</Button>
                    </>
                ) : (
                    'Loading your workspace…'
                )}
            </div>
        )
    if (user.mustChangePassword)
        return (
            <div className="max-w-lg mx-auto p-8">
                <h2>Set your password</h2>
                <p className="my-4">
                    Replace your temporary password before opening your
                    workspace.
                </p>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault()
                        if (password !== confirm) {
                            setError('Passwords do not match.')
                            return
                        }
                        setSaving(true)
                        setError('')
                        try {
                            const { data } = await api.post(
                                '/api/change-password',
                                { currentPassword, password },
                            )
                            dispatch(signInSuccess(data.token))
                            await refresh()
                        } catch (e) {
                            setError(errorText(e))
                        } finally {
                            setSaving(false)
                        }
                    }}
                >
                    <label className="block my-4">
                        Temporary password
                        <input
                            required
                            type="password"
                            autoComplete="current-password"
                            className="input mt-2"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </label>
                    <label className="block my-4">
                        New password
                        <input
                            required
                            minLength={10}
                            type="password"
                            autoComplete="new-password"
                            className="input mt-2"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </label>
                    <label className="block my-4">
                        Confirm password
                        <input
                            required
                            type="password"
                            autoComplete="new-password"
                            className="input mt-2"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </label>
                    {error && (
                        <p role="alert" className="text-red-600 my-3">
                            {error}
                        </p>
                    )}
                    <Button variant="solid" type="submit" loading={saving}>
                        Save password
                    </Button>
                </form>
            </div>
        )
    return (
        <Context.Provider
            value={{
                user,
                settings,
                can: (p) => user.permissions.includes(p),
                refresh,
            }}
        >
            {error && (
                <div role="alert" className="p-3 bg-amber-50">
                    Could not refresh access: {error}
                </div>
            )}
            {children}
        </Context.Provider>
    )
}
