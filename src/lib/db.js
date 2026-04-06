import Dexie from 'dexie';

export const db = new Dexie('WeylandYutani_OS');

db.version(1).stores({
  // ++id: auto-increment
  // type: 'convo', 'intel', 'task'
  // created_at: for your half-life decay logic
  // *tags: for strict metadata filtering
  memories: '++id, type, created_at, *tags' 
});