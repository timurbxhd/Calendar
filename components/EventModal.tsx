import React, { useState, useEffect } from 'react';
import { CalendarEvent, EVENT_COLORS } from '../types';
import { parseNaturalLanguageEvent } from '../services/geminiService';

interface EventModalProps {
  userId: string;
  selectedDate: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  existingEvent?: CalendarEvent | null;
  onDelete?: (id: string) => void;
}

const EventModal: React.FC<EventModalProps> = ({ 
  userId, 
  selectedDate, 
  isOpen, 
  onClose, 
  onSave, 
  existingEvent,
  onDelete
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState('09:00');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) {
        setTitle(existingEvent.title);
        setDescription(existingEvent.description);
        setDate(existingEvent.date);
        setTime(existingEvent.time);
        setColor(existingEvent.color);
      } else {
        // Reset for new event
        setTitle('');
        setDescription('');
        setDate(selectedDate);
        setTime('09:00');
        setColor(EVENT_COLORS[0]);
      }
      setAiPrompt('');
    }
  }, [isOpen, existingEvent, selectedDate]);

  const handleSmartAdd = async () => {
    if (!aiPrompt.trim()) return;
    setIsThinking(true);
    try {
      const result = await parseNaturalLanguageEvent(aiPrompt, new Date());
      if (result) {
        setTitle(result.title);
        setDate(result.date);
        setTime(result.time);
        setDescription(result.description);
      }
    } catch (e) {
      console.error(e);
      alert('Не удалось распознать текст. Проверьте API Key.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: CalendarEvent = {
      id: existingEvent ? existingEvent.id : crypto.randomUUID(),
      userId,
      title,
      description,
      date,
      time,
      color,
    };
    onSave(newEvent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">
            {existingEvent ? 'Редактировать событие' : 'Новое событие'}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* AI Smart Add Section */}
          {!existingEvent && (
            <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-2">
                ✨ AI Умное добавление
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Например: Завтра в 3 дня встреча с коллегами..."
                  className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleSmartAdd}
                  disabled={isThinking || !aiPrompt}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isThinking ? '...' : 'AI'}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Время</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Цвет метки</label>
              <div className="flex gap-2">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full ${c} ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {existingEvent && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(existingEvent.id)}
                  className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-lg font-medium hover:bg-red-200 transition"
                >
                  Удалить
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventModal;