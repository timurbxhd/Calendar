import { User, CalendarEvent } from '../types.ts';

const SESSION_KEY = 'calendar_app_session_uid';
const API_URL = 'http://localhost:3000/api';

// --- API Implementation ---

export const registerUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      if (res.status === 409) {
        console.warn('Username already taken');
      }
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("API Error (Register):", e);
    return null;
  }
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("API Error (Login):", e);
    return null;
  }
};

export const getEvents = async (userId: string): Promise<CalendarEvent[]> => {
  try {
    const res = await fetch(`${API_URL}/events?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return await res.json();
  } catch (e) {
    console.error("API Error (GetEvents):", e);
    return [];
  }
};

export const saveEvent = async (event: CalendarEvent): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    if (!res.ok) throw new Error('Failed to save event');
  } catch (e) {
    console.error("API Error (SaveEvent):", e);
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/events/${eventId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
  } catch (e) {
    console.error("API Error (DeleteEvent):", e);
  }
};

// --- Session Management (Client-side) ---

export const persistSession = (user: User) => {
  localStorage.setItem(SESSION_KEY, user.id);
  localStorage.setItem(SESSION_KEY + '_name', user.username);
};

export const getSession = async (): Promise<User | null> => {
  const userId = localStorage.getItem(SESSION_KEY);
  const username = localStorage.getItem(SESSION_KEY + '_name');
  
  if (!userId || !username) return null;

  // In a real production app, you would validate this token/session with the backend here.
  // For this simple demo, we trust the local storage if it exists.
  return { id: userId, username, passwordHash: '' };
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY + '_name');
};
