const logLevel = process.env.LOG_LEVEL || 'info'

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
}

class Logger {
    log(level, message, metadata = {}) {
        if (levels[level] <= levels[logLevel]) {
            const timestamp = new Date().toISOString()
            const logEntry = {
                timestamp,
                level: level.toUpperCase(),
                message,
                ...metadata,
            }

            console.log(JSON.stringify(logEntry))
        }
    }

    error(message, metadata) {
        this.log('error', message, metadata)
    }

    warn(message, metadata) {
        this.log('warn', message, metadata)
    }

    info(message, metadata) {
        this.log('info', message, metadata)
    }

    debug(message, metadata) {
        this.log('debug', message, metadata)
    }
}

module.exports = new Logger()

