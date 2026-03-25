import { cloneElement } from 'react'
import Logo from '@/components/template/Logo'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'
import { HiOutlineOfficeBuilding } from 'react-icons/hi'

interface SideProps extends CommonProps {
    content?: React.ReactNode
}

const Side = ({ children, content, ...rest }: SideProps) => {
    return (
        <div className="grid lg:grid-cols-3 h-full">
            <div
                className="bg-no-repeat bg-cover py-6 px-16 flex-col justify-between hidden lg:flex"
                style={{
                    backgroundImage: `url('/img/others/auth-side-bg.jpg')`,
                }}
            >
                <Logo mode="dark" />
                <div>
                    <div className="mb-6 flex items-start gap-4">
                        <div className="rounded-full bg-white/10 p-4 shrink-0">
                            <HiOutlineOfficeBuilding className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-white">
                            <div className="font-semibold text-xl leading-snug">
                                Welcome to {APP_NAME}
                            </div>
                            <span className="opacity-90 text-base block mt-1">
                                Camp & facility operations
                            </span>
                        </div>
                    </div>
                    <p className="text-lg text-white/90 leading-relaxed">
                        Manage locations, camps, rooms, assignments, staff, and
                        maintenance from one place—built for operations teams who
                        run day-to-day camp life.
                    </p>
                </div>
                <span className="text-white">
                    Copyright &copy; {`${new Date().getFullYear()}`}{' '}
                    <span className="font-semibold">{`${APP_NAME}`}</span>{' '}
                </span>
            </div>
            <div className="col-span-2 flex flex-col justify-center items-center bg-white dark:bg-gray-800">
                <div className="w-full xl:max-w-[450px] px-8 max-w-[380px]">
                    <div className="mb-8">{content}</div>
                    {children
                        ? cloneElement(children as React.ReactElement, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
        </div>
    )
}

export default Side
