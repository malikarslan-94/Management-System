import {
    HiOutlineColorSwatch,
    HiOutlineDesktopComputer,
    HiOutlineTemplate,
    HiOutlineViewGridAdd,
    HiOutlineHome,
    HiOutlineLocationMarker,
    HiOutlineOfficeBuilding,
    HiOutlineUsers,
    HiOutlineClipboardCheck,
    HiOutlineCube,
    HiOutlineLogin,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlinePuzzle,
} from 'react-icons/hi'
import type { JSX } from 'react'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    home: <HiOutlineHome />,
    location: <HiOutlineLocationMarker />,
    building: <HiOutlineOfficeBuilding />,
    users: <HiOutlineUsers />,
    clipboardCheck: <HiOutlineClipboardCheck />,
    box: <HiOutlineCube />,
    tool: <HiOutlineCog />,
    login: <HiOutlineLogin />,
    activity: <HiOutlinePuzzle />,
    barChart: <HiOutlineChartBar />,
    settings: <HiOutlineCog />,
    singleMenu: <HiOutlineViewGridAdd />,
    collapseMenu: <HiOutlineTemplate />,
    groupSingleMenu: <HiOutlineDesktopComputer />,
    groupCollapseMenu: <HiOutlineColorSwatch />,
}

export default navigationIcon
