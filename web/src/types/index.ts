export type Status = 'safe'|'warn';
export interface BasePoint { id: number; lat: number; lng: number; status: Status }
export interface Station extends BasePoint { name: string; picture?: string }
export interface Pile extends BasePoint { code: string }
export interface User { id: number; username: string; role: 'admin'|'user' }
