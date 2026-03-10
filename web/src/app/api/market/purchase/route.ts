import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { MARKET_ITEMS } from '@/lib/constants';

const DB_PATH = path.join(process.cwd(), '../src/data/complete.json');

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, quantity } = await req.json();
    const qty = parseInt(quantity, 10);

    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const item = MARKET_ITEMS.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const rawDb = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(rawDb);
    let user = null;
    let guildIdToUpdate = null;

    // Find User
    for (const guildId in db) {
      if (db[guildId][session.user.id]) {
        user = db[guildId][session.user.id];
        guildIdToUpdate = guildId;
        break;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found in complete.json' }, { status: 404 });
    }

    // 1. Level Check
    if (user.level < item.minLevel) {
      return NextResponse.json({ error: `Level requirement not met (Level ${item.minLevel}).` }, { status: 400 });
    }

    // 2. Stock Check
    const isLottery = item.id === 'lottery_ticket';
    const bought = user.market_stock?.[itemId] || 0;

    if (!isLottery) {
      const remaining = item.maxStock - bought;
      if (qty > remaining) {
        return NextResponse.json({ error: `Insufficient stock. You only have ${remaining} left.` }, { status: 400 });
      }
    }

    // 3. Balance Check
    const totalCost = item.cost * qty;
    if (user.tokens < totalCost) {
      return NextResponse.json({ error: `Insufficient funds. Cost: ${totalCost} CI.` }, { status: 400 });
    }

    // Process Transaction
    user.tokens -= totalCost;

    if (isLottery) {
      user.lottery = user.lottery || { current_tickets: 0, lifetime_tickets: 0, wins: { first: 0, second: 0, third: 0 }, joined: 0 };
      user.lottery.current_tickets += qty;
      user.lottery.lifetime_tickets += qty;
    } else {
      user.market_stock = user.market_stock || {};
      user.market_stock[itemId] = bought + qty;
    }

    // Save DB
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    // Generate Mock Codes
    const codes = Array.from({ length: qty }).map(
      () => `APEX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`
    );

    return NextResponse.json({
      message: `Successfully purchased ${qty}x ${item.name.replace(/ x\d+$/, '')}.`,
      codes: !isLottery ? codes : undefined,
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
