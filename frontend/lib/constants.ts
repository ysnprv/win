/**
 * Application-wide constants
 */

export const APP_NAME = 'OnBoard';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Optional WebSocket base URL for production (use wss://). If not provided we keep
// the legacy behavior of converting the HTTP(S) base URL to WS(S). Normalise the
// returned value by removing trailing slashes so consumers can safely append
// endpoint paths without accidentally creating duplicate slashes.
export const API_WS_BASE_URL = (
	(process.env.NEXT_PUBLIC_API_URL_WS && process.env.NEXT_PUBLIC_API_URL_WS) ||
	API_BASE_URL.replace(/^https?/, API_BASE_URL.startsWith('https') ? 'wss' : 'ws')
).replace(/\/+$/, '');

// Build-time flag to indicate whether the environment variable was explicitly set.
export const API_WS_ENV_DEFINED = Boolean(process.env.NEXT_PUBLIC_API_URL_WS);

// Common Virtual Interviewer websocket paths
export const VIRTUAL_INTERVIEWER_WS_AGENT_PATH = "/virtual-interviewer/ws/agent";
export const VIRTUAL_INTERVIEWER_WS_VOICE_PATH = "/virtual-interviewer/ws/voice";

// Add more constants as needed
