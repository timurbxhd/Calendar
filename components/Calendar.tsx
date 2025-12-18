import React, { useState, useEffect } from 'react';
import { User, CalendarEvent } from '../types.ts';
import { getEvents, saveEvent, deleteEvent } from '../services/storageService.ts';
import EventModal from './EventModal.tsx';

interface CalendarProps {
  user: User;
  onLogout: () => void;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const Calendar: React.FC<CalendarProps> = ({ user, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Load events on mount
  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const loaded = await getEvents(user.id);
      setEvents(loaded);
    } catch (e) {
      console.error("Failed to load events", e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay(); // 0 is Sunday
    return day === 0 ? 6 : day - 1; // Convert to Mon=0 ... Sun=6
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const month = currentDate.getMonth() + 1; // 1-12
    const year = currentDate.getFullYear();
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    setSelectedDateStr(dateStr);
    setSelectedEvent(null);
    setModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedDateStr(event.date);
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleSaveEvent = async (event: CalendarEvent) => {
    await saveEvent(event);
    await loadEvents();
    setModalOpen(false);
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить это событие?')) {
      await deleteEvent(id);
      await loadEvents();
      setModalOpen(false);
    }
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-slate-50/50 min-h-[100px] border-b border-r border-slate-100"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      const dayEvents = events.filter(e => e.date === dateStr);

      days.push(
        <div 
          key={day} 
          onClick={() => handleDayClick(day)}
          className={`min-h-[100px] border-b border-r border-slate-200 p-2 cursor-pointer hover:bg-indigo-50 transition relative group ${isToday ? 'bg-indigo-50/50' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
              {day}
            </span>
          </div>
          
          <div className="space-y-1">
            {dayEvents.map(event => (
              <div 
                key={event.id}
                onClick={(e) => handleEventClick(e, event)}
                className={`${event.color} text-white text-xs px-2 py-1 rounded shadow-sm truncate hover:opacity-80 transition`}
                title={`${event.time} - ${event.title}`}
              >
                <span className="opacity-75 mr-1">{event.time}</span>
                {event.title}
              </div>
            ))}
          </div>
          
          {/* Quick Add Button on Hover */}
          <button className="absolute top-2 right-2 text-indigo-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
             </svg>
          </button>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Мой Календарь</h1>
            <p className="text-xs text-slate-500">Добро пожаловать, {user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-md transition text-slate-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="px-4 font-semibold text-slate-700 min-w-[140px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-md transition text-slate-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <button 
            onClick={onLogout}
            className="text-slate-500 hover:text-red-500 transition text-sm font-medium"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Calendar Grid */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative">
          {isLoadingEvents && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}
          
          {/* Days Header */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-3 text-center text-sm font-medium text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          {/* Days Cells */}
          <div className="grid grid-cols-7">
            {renderCalendarGrid()}
          </div>
        </div>
      </main>

      <EventModal
        userId={user.id}
        selectedDate={selectedDateStr}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvent}
        existingEvent={selectedEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

export default Calendar;
