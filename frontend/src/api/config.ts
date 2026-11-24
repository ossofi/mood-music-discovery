/** Base path of the REST API. Same origin by default (Vite proxy or reverse proxy in Docker). */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api/v1';

/** When true, the app starts an in-browser mock server (MSW) instead of calling a real backend. */
export const USE_MOCK: boolean = import.meta.env.VITE_API_MOCK === 'true';
