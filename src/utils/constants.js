module.exports = {
    COLORS: {
        PRIMARY: 0xE91E63, // Pink/Magenta
        SUCCESS: 0x00FF00,
        ERROR: 0xFF0000,
        WARNING: 0xFFA500
    },
    MARKET_ITEMS: [
        { id: 'twilight_echo', name: 'Twilight Echo Permit x1', cost: 50, maxStock: 15, minLevel: 1 },
        { id: 'weapon_echo', name: 'Weapon Echo Permit x1', cost: 50, maxStock: 15, minLevel: 1 },
        { id: 'adv_echo', name: 'Advanced Echo Permit x1', cost: 50, maxStock: 15, minLevel: 1 },
        { id: 'purifier_metal', name: 'Purifier Metal x100', cost: 30, maxStock: 20, minLevel: 1 },
        { id: 'ion_probes', name: 'Ion Probes x200', cost: 40, maxStock: 20, minLevel: 1 },
        { id: 'stellaris_exp', name: 'Stellaris EXP x10000', cost: 35, maxStock: 20, minLevel: 1 },
        { id: 'starmap_echo', name: 'Starmap Echo Permit x1', cost: 85, maxStock: 10, minLevel: 1 },
        { id: 'starsea_ticket', name: 'Starsea Ticket x1', cost: 100, maxStock: 10, minLevel: 1 },
        { id: 'diamond_box', name: 'Diamond Blind Box x1', cost: 100, maxStock: 15, minLevel: 1 },
        { id: 'red_eqpt', name: 'Red 2-Star Eqpt. Selection x1', cost: 100, maxStock: 10, minLevel: 1 },
        { id: 'ssr_box', name: 'SSR+ Stellaris Selection Box x1', cost: 400, maxStock: 2, minLevel: 11 },
        { id: 'lottery_ticket', name: 'Lottery Ticket', cost: 150, maxStock: 9999, minLevel: 21 }
    ],
    LEVEL_CONSTANTS: {
        BASE: 75,
        QUADRATIC: 15,
        MAX_LEVEL_SOFT: 30
    },
    TOKEN_REWARDS: {
        TIER_1: { min: 2, max: 10, amount: 20 },
        TIER_2: { min: 11, max: 20, amount: 45 },
        TIER_3: { min: 21, max: 30, amount: 77 },
        TIER_4: { min: 31, amount: 0 }
    }
};
