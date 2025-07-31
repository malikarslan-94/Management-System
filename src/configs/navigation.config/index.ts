import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
    NAV_ITEM_TYPE_COLLAPSE,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'

const navigationConfig: NavigationTree[] = [
    {
        key: 'home',
        path: '/home',
        title: 'Dashboard',
        translateKey: 'nav.home',
        icon: 'home',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'locationCampManagement',
        path: '',
        title: 'Locations & Camps',
        translateKey: 'nav.locationCamp',
        icon: 'location', // update with proper icon in your icon set
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'roomManagement',
        path: '/rooms',
        title: 'Rooms',
        translateKey: 'nav.rooms',
        icon: 'building', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'employeeVisitorManagement',
        path: '/employees',
        title: 'Employees & Visitors',
        translateKey: 'nav.employeesVisitors',
        icon: 'users', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'roomAssignments',
        path: '/assignments',
        title: 'Assignments',
        translateKey: 'nav.assignments',
        icon: 'clipboardCheck', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'inventory',
        path: '/inventory',
        title: 'Inventory',
        translateKey: 'nav.inventory',
        icon: 'box', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'maintenance',
        path: '/maintenance',
        title: 'Maintenance',
        translateKey: 'nav.maintenance',
        icon: 'tool', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'checkInOut',
        path: '/check-in-out',
        title: 'Check-In / Check-Out',
        translateKey: 'nav.checkinCheckout',
        icon: 'login', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'recreationFacilities',
        path: '/facilities',
        title: 'Recreation Facilities',
        translateKey: 'nav.facilities',
        icon: 'activity', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'reports',
        path: '/reports',
        title: 'Reports',
        translateKey: 'nav.reports',
        icon: 'barChart', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'roleAccessManagement',
        path: '/settings',
        title: 'Settings & Roles',
        translateKey: 'nav.settingsRoles',
        icon: 'settings', // update with proper icon
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'], // restrict to admin only
        subMenu: [],
    },
]

export default navigationConfig
