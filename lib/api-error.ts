import axios from "axios"

export const getApiError = (err: unknown): string => {
    if (axios.isAxiosError(err)) return err.response?.data?.error ?? err.message
    if (err instanceof Error) return err.message
    return "Unexpected error."
}