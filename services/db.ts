import Dexie, { Table } from 'dexie';
import { User, CalendarEvent } from '../types';

/**
 * В полноценном Docker-проекте этот файл был бы заменен на конфигурацию подключения
 * к PostgreSQL или MongoDB. В браузере мы используем IndexedDB как лучшую альтернативу
 * настоящей базе данных.
 */
export class CalendarAppDatabase extends Dexie {
  users!: Table<User>;
  events!: Table<CalendarEvent>;

  constructor() {
    super('CalendarAppDB');
    this.version(1).stores({
      users: 'id, &username', // id - primary key, username - unique index
      events: 'id, userId, date' // id - primary key, indexes on userId and date
    });
  }
}

export const db = new CalendarAppDatabase();
