import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleAdminPanel } from '@/store/theme/themeSlice'
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
import { Button } from '@/components/ui'



const HeaderActionsStart = () => {
    const dispatch = useAppDispatch()
    const adminPanelOpen = useAppSelector(
        (state) => state.theme.adminPanelOpen
    )
    return (
        <>
            <MobileNav />
            <SideNavToggle />
            <Button
                title='Admin Panel'
                variant={adminPanelOpen ? 'solid' : 'plain'}
                onClick={() => dispatch(toggleAdminPanel())}
                className="transition-all duration-200"
            >
                {adminPanelOpen ? 'Close' : 'Admin Panel'}
            </Button>
        </>
    )
}

const HeaderActionsEnd = () => {
   

    return (
        <>
            <Search />
            <Notification />
           
            <SidePanel />
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
