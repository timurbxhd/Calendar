export interface User {
  id: string;
  username: string;
  passwordHash: string; // Stored as plain text for this demo, usually hashed
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // ISO String YYYY-MM-DD
  time: string; // HH:mm
  color: string;
}

export enum ViewMode {
  Month = 'MONTH',
  List = 'LIST'
}

export const EVENT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
];