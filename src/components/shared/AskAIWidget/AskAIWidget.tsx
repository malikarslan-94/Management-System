import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CloseButton from '@/components/ui/CloseButton'
import { useConfig } from '@/components/ui/ConfigProvider'
import Input from '@/components/ui/Input'
import mcpService from '@/services/mcpService'
import classNames from 'classnames'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
    HiOutlineChat,
    HiOutlinePaperAirplane,
    HiSparkles,
} from 'react-icons/hi'
import { TbRobot } from 'react-icons/tb'

export interface Message {
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
}

export interface AskAIWidgetProps {
    className?: string
    onSendMessage?: (message: string) => Promise<string>
}

const AskAIWidget: React.FC<AskAIWidgetProps> = ({
    className,
    onSendMessage,
}) => {
    const { themeColor, primaryColorLevel } = useConfig()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showTooltip, setShowTooltip] = useState(true)
    const [hasNewMessage, setHasNewMessage] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const pulseControls = useAnimation()

    // Hide tooltip after 4s
    useEffect(() => {
        const timer = setTimeout(() => setShowTooltip(false), 4000)
        return () => clearTimeout(timer)
    }, [])

    // Pulse animation loop for the ring
    useEffect(() => {
        if (!isOpen) {
            pulseControls.start({
                scale: [1, 1.55, 1],
                opacity: [0.5, 0, 0.5],
                transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
            })
        } else {
            pulseControls.stop()
        }
    }, [isOpen, pulseControls])

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isOpen])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
        if (isOpen) setHasNewMessage(false)
    }, [isOpen])

    const handleToggle = () => {
        setShowTooltip(false)
        setIsOpen(!isOpen)
    }

    const handleClose = () => setIsOpen(false)

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: 'user',
            content: inputValue.trim(),
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        const messageToSend = inputValue.trim()
        setInputValue('')
        setIsLoading(true)

        console.log('[FE] send:', messageToSend.slice(0, 60))

        try {
            let response: string

            if (onSendMessage) {
                response = await onSendMessage(messageToSend)
            } else {
                try {
                    response = await mcpService.sendMessage(messageToSend)
                    console.log('[FE] received:', response?.slice(0, 60) ?? '')
                } catch (mcpError) {
                    const serverMessage = (mcpError instanceof Error ? mcpError.message : String(mcpError)) || 'Something went wrong. Please try again.'
                    console.log('[FE] MCP error:', serverMessage.slice(0, 60))
                    response = serverMessage.trim() || 'Unable to connect to AI. Please try again.'
                }
            }

            const displayContent =
                typeof response === 'string' && response.trim()
                    ? response.trim()
                    : 'Sorry, I couldn\'t get a response. Please try again.'

            console.log('[Chat] response reached chat section', {
                length: displayContent.length,
                preview: displayContent.slice(0, 80),
            })

            const aiMessage: Message = {
                id: `ai-${Date.now()}`,
                type: 'ai',
                content: displayContent,
                timestamp: new Date(),
            }
            console.log('[Chat] adding AI message to state')
            flushSync(() => {
                setMessages((prev) => {
                    const next = [...prev, aiMessage]
                    console.log('[Chat] setMessages called, prevLen=', prev.length, 'nextLen=', next.length)
                    return next
                })
            })
            console.log('[Chat] flushSync done, next render should show', messages.length + 1, 'messages')
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
            })
            if (!isOpen) setHasNewMessage(true)
        } catch (error) {
            const fallback = 'Sorry, I encountered an error. Please try again.'
            const content =
                (error instanceof Error ? error.message : null)?.trim() || fallback
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                type: 'ai',
                content: content || fallback,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const buttonColor = `${themeColor}-${primaryColorLevel}`

    return (
        <div className={classNames('ask-ai-widget', className)}>

            {/* ── Floating Trigger Button ── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="fixed bottom-6 ltr:right-6 rtl:left-6 z-50 flex flex-col items-end gap-3"
                    >
                        {/* Tooltip bubble */}
                        <AnimatePresence>
                            {showTooltip && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.9 }}
                                    transition={{ duration: 0.25 }}
                                    className="relative mr-1"
                                >
                                    <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-3 py-2 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-1.5">
                                        <HiSparkles className="text-yellow-400 dark:text-yellow-500 text-sm flex-shrink-0" />
                                        <span>Got a question? Ask AI!</span>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute -bottom-1.5 ltr:right-5 rtl:left-5 w-3 h-3 bg-gray-900 dark:bg-gray-100 rotate-45 rounded-sm" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Button + pulse ring wrapper */}
                        <div className="relative flex items-center justify-center">

                            {/* Animated outer pulse ring */}
                            <motion.div
                                animate={pulseControls}
                                className={`absolute inset-0 rounded-full bg-${themeColor}-${primaryColorLevel} pointer-events-none`}
                                style={{ borderRadius: '50%' }}
                            />

                            {/* Secondary softer ring */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.25, 0, 0.25],
                                }}
                                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                                className={`absolute inset-0 rounded-full bg-${themeColor}-${primaryColorLevel} pointer-events-none`}
                                style={{ borderRadius: '50%' }}
                            />

                            {/* Main button */}
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.93 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                                className="group"
                            >
                                <Button
                                    className="relative shadow-2xl rounded-full h-14 w-14 !p-0 flex items-center justify-center overflow-visible"
                                    color={buttonColor}
                                    variant="solid"
                                    onClick={handleToggle}
                                >
                                    {/* Shimmer overlay on button */}
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                                        className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-full"
                                        style={{ zIndex: 1 }}
                                    >
                                        <div
                                            className="h-full w-1/3 bg-white opacity-20 skew-x-12"
                                            style={{ transform: 'skewX(-20deg)' }}
                                        />
                                    </motion.div>

                                    <TbRobot className="text-2xl text-white relative z-10" />

                                    {/* AI / Ask AI badge */}
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
                                        className="absolute -top-2 -right-2 text-[10px] px-2 py-[3px] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-black shadow-lg z-20 leading-tight tracking-wide whitespace-nowrap transition-all duration-200 group-hover:-right-4"
                                    >
                                        <span className="inline group-hover:hidden">AI</span>
                                        <span className="hidden group-hover:inline">Ask AI</span>
                                    </motion.span>

                                    {/* Unread indicator */}
                                    {hasNewMessage && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white z-20"
                                        />
                                    )}
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Chat Panel ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className="fixed bottom-6 ltr:right-6 rtl:left-6 z-50 w-[400px] max-w-[calc(100vw-3rem)]"
                    >
                        <Card
                            className="shadow-2xl h-[600px] max-h-[calc(100vh-6rem)] flex flex-col overflow-hidden"
                            bodyClass="flex flex-col flex-1 min-h-0 overflow-hidden p-0"
                        >
                            {/* Header */}
                            <div className={`bg-${themeColor}-${primaryColorLevel} px-4 py-3 flex items-center justify-between`}>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <TbRobot className="text-white text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white text-sm leading-tight">
                                            AI Assistant
                                        </h4>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                                            <span className="text-white/70 text-[10px]">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <CloseButton
                                    onClick={handleClose}
                                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                />
                            </div>

                            {/* Messages Area - scrollable */}
                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-0">
                                <div className="px-4 py-4 space-y-4">
                                        {(() => {
                                            console.log('[Chat] render messages area', { messagesLength: messages.length, isOpen })
                                            return null
                                        })()}
                                        {messages.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.15 }}
                                                className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm"
                                            >
                                                <div className="text-center">
                                                    <div className={`w-14 h-14 rounded-2xl bg-${themeColor}-50 dark:bg-${themeColor}-900/30 flex items-center justify-center mx-auto mb-3`}>
                                                        <HiOutlineChat className={`text-2xl text-${themeColor}-${primaryColorLevel}`} />
                                                    </div>
                                                    <p className="font-medium text-gray-700 dark:text-gray-300">
                                                        How can I help?
                                                    </p>
                                                    <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">
                                                        Ask me anything about your workspace
                                                    </p>
                                                    {/* Quick prompts */}
                                                    <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                                                        {['Employee info', 'Room status', 'Help me'].map((prompt) => (
                                                            <button
                                                                key={prompt}
                                                                onClick={() => setInputValue(prompt)}
                                                                className={`text-xs px-2.5 py-1 rounded-full border border-${themeColor}-200 dark:border-${themeColor}-800 text-${themeColor}-${primaryColorLevel} hover:bg-${themeColor}-50 dark:hover:bg-${themeColor}-900/40 transition-colors`}
                                                            >
                                                                {prompt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            messages.map((message, idx) => (
                                                <motion.div
                                                    key={message.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx === messages.length - 1 ? 0 : 0 }}
                                                    className={classNames(
                                                        'flex',
                                                        message.type === 'user' ? 'justify-end' : 'justify-start',
                                                    )}
                                                >
                                                    {message.type === 'ai' && (
                                                        <div className={`w-6 h-6 rounded-full bg-${themeColor}-${primaryColorLevel} flex items-center justify-center mr-2 mt-0.5 flex-shrink-0`}>
                                                            <TbRobot className="text-white text-xs" />
                                                        </div>
                                                    )}
                                                    <div
                                                        className={classNames(
                                                            'max-w-[75%] rounded-2xl px-4 py-2.5',
                                                            message.type === 'user'
                                                                ? `bg-${themeColor}-${primaryColorLevel} text-white rounded-tr-sm`
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm',
                                                        )}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                                            {message.content || '\u00A0'}
                                                        </p>
                                                        <span
                                                            className={classNames(
                                                                'text-[10px] mt-1 block',
                                                                message.type === 'user'
                                                                    ? 'text-white/60 text-right'
                                                                    : 'text-gray-400',
                                                            )}
                                                        >
                                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}

                                        {isLoading && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex justify-start items-center gap-2"
                                            >
                                                <div className={`w-6 h-6 rounded-full bg-${themeColor}-${primaryColorLevel} flex items-center justify-center flex-shrink-0`}>
                                                    <TbRobot className="text-white text-xs" />
                                                </div>
                                                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        {[0, 1, 2].map((i) => (
                                                            <motion.span
                                                                key={i}
                                                                animate={{ y: [0, -4, 0] }}
                                                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                                                className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 block"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                            </div>

                            {/* Input Section */}
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-2">
                                    <Input
                                        ref={inputRef}
                                        className="flex-1"
                                        placeholder="Ask me anything..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        disabled={isLoading}
                                    />
                                    <motion.div whileTap={{ scale: 0.9 }}>
                                        <Button
                                            className="shrink-0"
                                            color={buttonColor}
                                            variant="solid"
                                            icon={<HiOutlinePaperAirplane className="text-lg text-white rotate-90" />}
                                            onClick={handleSend}
                                            disabled={!inputValue.trim() || isLoading}
                                            loading={isLoading}
                                        />
                                    </motion.div>
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
                                    AI responses may be inaccurate. Verify important info.
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

AskAIWidget.displayName = 'AskAIWidget'

export default AskAIWidget