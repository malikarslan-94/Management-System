import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number | string
}

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        className,
        imgClass,
        style,
        logoWidth = 'auto',
    } = props

    const src =
        type === 'streamline'
            ? '/img/logo/camp-logo-icon.png'
            : '/img/logo/camp-logo-cropped.png'

    return (
        <div
            className={classNames('logo flex items-center', className)}
            style={{
                ...style,
                ...{ width: logoWidth },
            }}
        >
            <img
                className={classNames(
                    type === 'streamline' ? 'h-8 w-8' : 'h-8 w-auto',
                    imgClass,
                )}
                src={src}
                alt={`${APP_NAME} logo`}
            />
        </div>
    )
}

export default Logo
