import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number | string
}

const LOGO_SRC_PATH = '/img/logo/'

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
        logoWidth = 'auto',
    } = props

    return (
        <div
            className={classNames('logo flex items-center -my-3', className)}
            style={{
                ...style,
                ...{ width: logoWidth },
            }}
        >
            <img
                className={classNames('h-28 w-auto', imgClass)}
                src="/img/logo/camp-logo.png"
                alt={`${APP_NAME} logo`}
                style={{ backgroundColor: 'transparent' }}
            />
        </div>
    )
}

export default Logo
