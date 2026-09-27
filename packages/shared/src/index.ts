export type ApiError = { statusCode: number; message: string | string[]; error?: string };
export type ListResponse<T> = { items: T[]; total: number };
export type SelectOption = { id: number; label: string };
