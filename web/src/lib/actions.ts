import fs from 'fs';
import path from 'path';

// Using relative path for mono-repo exercise
const DB_PATH = path.join(process.cwd(), '../src/data/complete.json');

export async function getLeaderboard() {
  const users = [];
  try {
    if (fs.existsSync(DB_PATH)) {
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      for (const guildId in db) {
        for (const userId in db[guildId]) {
          users.push(db[guildId][userId]);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching leaderboard', err);
  }
  return users.sort((a, b) => (b.total_xp || b.xp) - (a.total_xp || a.xp));
}
