export type SignInCredential = {
    user: string
    password: string
}

export type SignInResponse = {
    token: string
    user: {
        id: string
        name: string
        role: string
    }
}

export type SignUpResponse = SignInResponse

export type SignUpCredential = {
    user: string
    email: string
    password: string
}

export type ForgotPassword = {
    email: string
}

export type ResetPassword = {
    password: string
}
