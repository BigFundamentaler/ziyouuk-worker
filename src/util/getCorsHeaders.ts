import { Env } from '../env'
import {AllowedProdOrigins} from '../config'
// ✅ 判断是否是 localhost 或 127.0.0.1 的任意端口
function isLocalhostOrigin(origin: string): boolean {
    try {
        const url = new URL(origin)
        return (
            (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
            /^[0-9]*$/.test(url.port) // 可选：确保是数字端口或空
        )
    } catch {
        return false
    }
}
export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
    const origin = request.headers.get('Origin')
    const requestHeaders = request.headers.get('Access-Control-Request-Headers') || ''

    const isDev = env.ENV_TYPE === 'development'

    let allowOrigin = ''

    if (isDev && origin && isLocalhostOrigin(origin)) {
        allowOrigin = origin
    } else if (!isDev && origin && AllowedProdOrigins.includes(origin)) {
        allowOrigin = origin
    }

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': requestHeaders || 'Content-Type, Authorization',
        'Access-Control-Max-Age': '0',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    }
}
