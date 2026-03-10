import fs from 'fs';
import path from 'path';

// Since the bot and web are in the same repo for this exercise, we can use the relative path.
// Adjust this in production to point to the correct shared volume or absolute path.
const DB_PATH = path.join(process.cwd(), '../src/data/complete.json');

export function getDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read database:', error);
  }
  return {};
}

export function getUser(userId: string) {
  const db = getDatabase();
  for (const guildId in db) {
    if (db[guildId][userId]) {
      return db[guildId][userId];
    }
  }
  return null;
}
