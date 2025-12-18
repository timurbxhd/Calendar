import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// --- TYPES ---

interface User {
  id: string;
  username: string;
}

interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // ISO String YYYY-MM-DD
  time: string; // HH:mm
  color: string;
}

const EVENT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
];

// --- SERVICES ---

const API_URL = '/api';
const SESSION_KEY = 'calendar_app_session_uid';

const api = {
  register: async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { console.error(e); return null; }
  },

  login: async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { console.error(e); return null; }
  },

  getEvents: async (userId) => {
    try {
      const res = await fetch(`${API_URL}/events?userId=${userId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { console.error(e); return []; }
  },

  saveEvent: async (event) => {
    await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  },

  deleteEvent: async (id) => {
    await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
  },

  parseAI: async (prompt, referenceDate) => {
    try {
      const res = await fetch(`${API_URL}/ai/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, referenceDate })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { console.error(e); return null; }
  }
};

const session = {
  get: () => {
    const id = localStorage.getItem(SESSION_KEY);
    const username = localStorage.getItem(SESSION_KEY + '_name');
    return id && username ? { id, username } : null;
  },
  set: (user) => {
    localStorage.setItem(SESSION_KEY, user.id);
    localStorage.setItem(SESSION_KEY + '_name', user.username);
  },
  clear: () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY + '_name');
  }
};

// --- COMPONENTS ---

// 1. Auth Component
const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) return setError('Заполните все поля');

    setIsLoading(true);
    try {
      const user = isLogin 
        ? await api.login(username, password)
        : await api.register(username, password);
      
      if (user) {
        session.set(user);
        onLogin(user);
      } else {
        setError(isLogin ? 'Неверные данные' : 'Ошибка регистрации (возможно, имя занято)');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">{isLogin ? 'Вход' : 'Регистрация'}</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Логин" disabled={isLoading} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Пароль" disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 hover:underline">
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Event Modal Component
const EventModal = ({ userId, selectedDate, isOpen, onClose, onSave, existingEvent, onDelete }) => {
  const [formData, setFormData] = useState({ title: '', description: '', date: '', time: '09:00', color: EVENT_COLORS[0] });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) {
        setFormData(existingEvent);
      } else {
        setFormData({ title: '', description: '', date: selectedDate, time: '09:00', color: EVENT_COLORS[0] });
      }
      setAiPrompt('');
    }
  }, [isOpen, existingEvent, selectedDate]);

  const handleSmartAdd = async () => {
    if (!aiPrompt) return;
    setIsThinking(true);
    const res = await api.parseAI(aiPrompt, new Date());
    setIsThinking(false);
    if (res) setFormData({ ...formData, ...res });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">{existingEvent ? 'Редактировать' : 'Новое событие'}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="p-6">
          {!existingEvent && (
            <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-2">
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="AI: Встреча завтра в 15:00..." className="flex-1 px-3 py-2 text-sm border rounded-lg" />
              <button onClick={handleSmartAdd} disabled={isThinking} className="bg-indigo-600 text-white px-3 rounded-lg text-sm">
                {isThinking ? '...' : 'AI'}
              </button>
            </div>
          )}
          <form onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...formData, id: existingEvent?.id || crypto.randomUUID(), userId });
          }} className="space-y-4">
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Название" />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Описание" rows={3} />
            <div className="flex gap-2">
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setFormData({...formData, color: c})} className={`w-8 h-8 rounded-full ${c} ${formData.color === c ? 'ring-2 ring-slate-400' : ''}`} />
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              {existingEvent && <button type="button" onClick={() => onDelete(existingEvent.id)} className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg">Удалить</button>}
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg">Сохранить</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// 3. Calendar Component
const Calendar = ({ user, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState({ open: false, date: '', event: null });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setEvents(await api.getEvents(user.id));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user.id]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-900">📅 Мой Календарь</h1>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="px-3 py-1 hover:bg-white rounded">←</button>
            <span className="px-4 py-1 font-semibold min-w-[150px] text-center">
              {currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="px-3 py-1 hover:bg-white rounded">→</button>
          </div>
          <button onClick={onLogout} className="text-red-500 hover:underline text-sm">Выйти</button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="bg-white rounded-2xl shadow border grid grid-cols-7">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="p-3 text-center text-slate-400 font-medium border-b">{d}</div>)}
          
          {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50 border-b border-r" />)}
          
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div key={day} onClick={() => setModal({ open: true, date: dateStr, event: null })} 
                   className={`min-h-[120px] border-b border-r p-2 cursor-pointer hover:bg-indigo-50 transition ${isToday ? 'bg-indigo-50' : ''}`}>
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{day}</div>
                <div className="space-y-1">
                  {dayEvents.map(ev => (
                    <div key={ev.id} onClick={(e) => { e.stopPropagation(); setModal({ open: true, date: dateStr, event: ev }); }} 
                         className={`${ev.color} text-white text-xs px-2 py-1 rounded truncate hover:opacity-80`}>
                      {ev.time} {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <EventModal 
        userId={user.id}
        selectedDate={modal.date}
        isOpen={modal.open}
        existingEvent={modal.event}
        onClose={() => setModal({ ...modal, open: false })}
        onSave={async (ev) => { await api.saveEvent(ev); await loadData(); setModal({ ...modal, open: false }); }}
        onDelete={async (id) => { if(confirm('Удалить?')) { await api.deleteEvent(id); await loadData(); setModal({ ...modal, open: false }); } }}
      />
    </div>
  );
};

// 4. Main App
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(session.get());
    setLoading(false);
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Загрузка...</div>;

  return user ? <Calendar user={user} onLogout={() => { session.clear(); setUser(null); }} /> : <Auth onLogin={setUser} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
