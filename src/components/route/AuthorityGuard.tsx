import { PropsWithChildren } from 'react'
import useAuthority from '@/utils/hooks/useAuthority'

type AuthorityGuardProps = PropsWithChildren<{
    userAuthority?: string[]
    authority?: string[]
}>

const AuthorityGuard = (props: AuthorityGuardProps) => {
    const { userAuthority = [], authority = [], children } = props

    const roleMatched = useAuthority(userAuthority, authority)

    return (
        <>
            {roleMatched ? (
                children
            ) : (
                <div className="p-8">
                    <h3>Access restricted</h3>
                    <p className="mt-3">
                        Your role does not allow this page. Contact your
                        administrator.
                    </p>
                </div>
            )}
        </>
    )
}

export default AuthorityGuard
