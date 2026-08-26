import Header from '@/components/template/Header'
import SidePanel from '@/components/template/SidePanel'
import UserDropdown from '@/components/template/UserDropdown'
import SideNavToggle from '@/components/template/SideNavToggle'
import MobileNav from '@/components/template/MobileNav'
import SideNav from '@/components/template/SideNav'
import Notification from '@/components/template/Notification'
import Search from '@/components/template/Search'
import View from '@/views'
import AdminDashboard from '@/views/admin/AdminDashboard'
import navigationConfig from '@/configs/navigation.config'
import useMenuActive from '@/utils/hooks/useMenuActive'
import { useAppSelector } from '@/store'

const HeaderActionsStart = () => {
    const currentRouteKey = useAppSelector(
        (state) => state.base.common.currentRouteKey,
    )
    const { activedRoute } = useMenuActive(navigationConfig, currentRouteKey)

    return (
        <>
            <MobileNav />
            <SideNavToggle />
            <span className="font-medium text-gray-900 dark:text-gray-100 hidden sm:inline">
                {activedRoute?.title || 'Dashboard'}
            </span>
        </>
    )
}

const HeaderActionsEnd = () => {
    return (
        <>
            <Search />
            <Notification />
            <SidePanel />
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            <UserDropdown hoverable={false} />
        </>
    )
}

const ModernLayout = () => {
    return (
        <>
            <div className="app-layout-modern flex flex-auto flex-col">
                <div className="flex flex-auto min-w-0">
                    <SideNav />
                    <div className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
                        <Header
                            className="border-b border-gray-200 dark:border-gray-700"
                            headerEnd={<HeaderActionsEnd />}
                            headerStart={<HeaderActionsStart />}
                        />
                        <View />
                    </div>
                </div>
            </div>
            <AdminDashboard />
        </>
    )
}

export default ModernLayout
