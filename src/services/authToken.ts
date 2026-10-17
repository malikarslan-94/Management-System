import store from '@/store'
export function getAccessToken(): string {
    return store.getState().auth.session.token || ''
}
