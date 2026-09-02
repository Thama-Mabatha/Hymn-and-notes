import type { ReaderSettings } from '../types';
const prefix = 'nyimbo-dza-vhatendi:';
export const defaultSettings: ReaderSettings = { textSize: 'medium', spacing: 'comfortable', theme: 'system', focusMode: false };
export function readLocal<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(prefix + key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
export function writeLocal<T>(key: string, value: T) { try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* Some browsers block this, so just keep the app moving. */ } }
export const recentHymns = () => readLocal<number[]>('recent-hymns', []);
export const rememberHymn = (number: number) => writeLocal('recent-hymns', [number, ...recentHymns().filter((item) => item !== number)].slice(0, 16));
