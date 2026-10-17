import { useAppSelector } from '@/store'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useAuth from '@/utils/hooks/useAuth'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import {
    HiOutlineLogout,
    HiOutlineUser,
    HiOutlineChevronDown,
} from 'react-icons/hi'
import type { CommonProps } from '@/@types/common'
import type { JSX } from 'react'

type DropdownList = {
    label: string
    path: string
    icon: JSX.Element
}

const dropdownItemList: DropdownList[] = []

const _UserDropdown = ({ className }: CommonProps) => {
    const { signOut } = useAuth()
    const user = useAppSelector(state => state.auth.user)
    const role = user.authority?.[0]?.replaceAll('_', ' ') || 'Account'

    const UserAvatar = (
        <div className={className}>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 py-1 pl-1 pr-2">
                <Avatar size={28} shape="circle" icon={<HiOutlineUser />} />
                <div className="hidden md:block leading-tight">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                        {user.user || 'Account'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {role}
                    </div>
                </div>
                <HiOutlineChevronDown className="hidden md:block text-gray-400" />
            </div>
        </div>
    )

    return (
        <div>
            <Dropdown
                menuStyle={{ minWidth: 240 }}
                renderTitle={UserAvatar}
                placement="bottom-end"
            >
                <Dropdown.Item variant="header">
                    <div className="py-2 px-3 flex items-center gap-2">
                        <Avatar shape="circle" icon={<HiOutlineUser />} />
                        <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100">
                                {user.user || 'Account'}
                            </div>
                            <div className="text-xs">{user.email}</div>
                        </div>
                    </div>
                </Dropdown.Item>
                <Dropdown.Item variant="divider" />
                {dropdownItemList.map((item) => (
                    <Dropdown.Item
                        key={item.label}
                        eventKey={item.label}
                        className="mb-1 px-0"
                    >
                        <Link
                            className="flex h-full w-full px-2"
                            to={item.path}
                        >
                            <span className="flex gap-2 items-center w-full">
                                <span className="text-xl opacity-50">
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </span>
                        </Link>
                    </Dropdown.Item>
                ))}
                {/* <Dropdown.Item variant="divider" /> */}
                <Dropdown.Item
                    eventKey="Sign Out"
                    className="gap-2"
                    onClick={signOut}
                >
                    <span className="text-xl opacity-50">
                        <HiOutlineLogout />
                    </span>
                    <span>Sign Out</span>
                </Dropdown.Item>
            </Dropdown>
        </div>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
