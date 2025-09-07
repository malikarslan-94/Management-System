import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ThemeState {
    theme: 'light' | 'dark'
    direction: 'ltr' | 'rtl'
    adminPanelOpen: boolean
}

const initialState: ThemeState = {
    theme: 'light',
    direction: 'ltr',
    adminPanelOpen: false
}

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light'
        },
        toggleDirection: (state) => {
            state.direction = state.direction === 'ltr' ? 'rtl' : 'ltr'
        },
        toggleAdminPanel: (state, action: PayloadAction<boolean | undefined>) => {
            state.adminPanelOpen = action.payload !== undefined 
                ? action.payload 
                : !state.adminPanelOpen
        },
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload
        },
        setDirection: (state, action: PayloadAction<'ltr' | 'rtl'>) => {
            state.direction = action.payload
        },
    },
})

export const {
    toggleTheme,
    toggleDirection,
    toggleAdminPanel,
    setTheme,
    setDirection,
} = themeSlice.actions

export default themeSlice.reducer
