import Tooltip from '@/components/ui/Tooltip'
import Menu from '@/components/ui/Menu'
import AuthorityCheck from '@/components/shared/AuthorityCheck'
import VerticalMenuIcon from './VerticalMenuIcon'
import classNames from 'classnames'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/store'
import { toggleAdminPanel } from '@/store/theme/themeSlice'
import type { CommonProps } from '@/@types/common'
import type { Direction } from '@/@types/theme'
import type { NavigationTree } from '@/@types/navigation'

const { MenuItem } = Menu

interface CollapsedItemProps extends CommonProps {
    title: string
    translateKey: string
    direction?: Direction
}

interface DefaultItemProps {
    nav: NavigationTree
    onLinkClick?: (link: { key: string; title: string; path: string }) => void
    sideCollapsed?: boolean
    userAuthority: string[]
}

interface VerticalMenuItemProps extends CollapsedItemProps, DefaultItemProps {}

const CollapsedItem = ({
    title,
    translateKey,
    children,
    direction,
}: CollapsedItemProps) => {
    const { t } = useTranslation()

    return (
        <Tooltip
            title={t(translateKey) || title}
            placement={direction === 'rtl' ? 'left' : 'right'}
        >
            {children}
        </Tooltip>
    )
}

const DefaultItem = (props: DefaultItemProps) => {
    const { nav, onLinkClick, sideCollapsed, userAuthority } = props
    const isDisabled = nav.disabled
    const dispatch = useAppDispatch()

    const handleClick = (e: React.MouseEvent) => {
        if (isDisabled) {
            e.preventDefault()
            return
        }
        if (nav.action === 'toggleAdminPanel') {
            e.preventDefault()
            dispatch(toggleAdminPanel())
        }
        onLinkClick?.({
            key: nav.key,
            title: nav.title,
            path: nav.path,
        })
    }

    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            <MenuItem
                key={nav.key}
                eventKey={nav.key}
                className={classNames('campwise-nav-item', {
                    'campwise-nav-item-disabled': isDisabled,
                })}
                disabled={isDisabled}
            >
                <Link
                    to={isDisabled ? '#' : nav.path}
                    aria-disabled={isDisabled || undefined}
                    className={classNames(
                        'campwise-nav-link flex items-center h-full w-full',
                        isDisabled && 'pointer-events-none',
                    )}
                    tabIndex={isDisabled ? -1 : undefined}
                    target={nav.isExternalLink ? '_blank' : ''}
                    onClick={handleClick}
                >
                    <VerticalMenuIcon icon={nav.icon} />
                    {!sideCollapsed && (
                        <>
                            <span className="campwise-nav-label">
                                <Trans
                                    i18nKey={nav.translateKey}
                                    defaults={nav.title}
                                />
                            </span>
                            {isDisabled && (
                                <span className="campwise-nav-soon">Soon</span>
                            )}
                        </>
                    )}
                </Link>
            </MenuItem>
        </AuthorityCheck>
    )
}

const VerticalSingleMenuItem = ({
    nav,
    onLinkClick,
    sideCollapsed,
    userAuthority,
    direction,
}: Omit<VerticalMenuItemProps, 'title' | 'translateKey'>) => {
    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            {sideCollapsed ? (
                <CollapsedItem
                    title={nav.title}
                    translateKey={nav.translateKey}
                    direction={direction}
                >
                    <DefaultItem
                        nav={nav}
                        sideCollapsed={sideCollapsed}
                        userAuthority={userAuthority}
                        onLinkClick={onLinkClick}
                    />
                </CollapsedItem>
            ) : (
                <DefaultItem
                    nav={nav}
                    sideCollapsed={sideCollapsed}
                    userAuthority={userAuthority}
                    onLinkClick={onLinkClick}
                />
            )}
        </AuthorityCheck>
    )
}

export default VerticalSingleMenuItem
