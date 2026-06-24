import { BoatLevel, Card, Fish, FishCollectionEntry, FishPrices, Food, GameState, ItemId, Recipe, Talent, Weather } from "./types";

export const itemNames: Record<ItemId, string> = {
  wood: "木板",
  plastic: "塑料",
  rope: "绳子",
  scrap: "铁片",
  water: "淡水",
  hotpotBase: "火锅底料",
  veggiePack: "蔬菜包",
  meatSlices: "肉片",
  furnitureTicket: "家具券",
  commonCrate: "普通补给包",
  premiumCrate: "高级补给包",
  grilledFish: "烤鱼",
  fishSoup: "鱼汤",
  seafoodSkewer: "海鲜串",
  driftHotpot: "漂流火锅",
  deluxeSeafoodPot: "豪华海鲜锅",
  commonFish: "普通鱼",
  rareFish: "稀有鱼",
  mysteryFish: "神秘鱼",
};

export const itemEmoji: Record<ItemId, string> = {
  wood: "🪵",
  plastic: "🧴",
  rope: "🧶",
  scrap: "🔩",
  water: "💧",
  hotpotBase: "🌶️",
  veggiePack: "🥬",
  meatSlices: "🥩",
  furnitureTicket: "🎟️",
  commonCrate: "🎁",
  premiumCrate: "💝",
  grilledFish: "🍖",
  fishSoup: "🍵",
  seafoodSkewer: "🍢",
  driftHotpot: "🍲",
  deluxeSeafoodPot: "🥘",
  commonFish: "🐟",
  rareFish: "🐠",
  mysteryFish: "✨",
};

export const weatherList: Weather[] = ["晴天", "阴天", "暴雨", "大雾"];

export const talents: Talent[] = [
  { id: "fishing", name: "钓鱼高手", emoji: "🎣", description: "稀有鱼和神秘鱼概率上升。" },
  { id: "trading", name: "交易达人", emoji: "🛒", description: "卖鱼价格 +20%。" },
  { id: "lucky", name: "幸运漂流者", emoji: "🍀", description: "开补给包时 Rare 以上概率上升。" },
  { id: "crafting", name: "手作达人", emoji: "🔨", description: "载具升级需要的材料减少 20%。" },
];

export const boatNames: Record<BoatLevel, string> = {
  1: "破旧木筏",
  2: "加固木筏",
  3: "小型漂流屋",
  4: "海上小商铺",
};

export const boatHpByLevel: Record<BoatLevel, number> = {
  1: 60,
  2: 100,
  3: 150,
  4: 220,
};

export const fishList: Fish[] = [
  { id: "blue-sardine", name: "蓝纹沙丁鱼", emoji: "🐟", rarity: "Common", description: "成群游过木筏边的小鱼，鳞片像蓝色手账贴纸。", basePrice: 4, weatherHint: ["晴天"], timeHint: "白天常见" },
  { id: "drift-clown", name: "漂流小丑鱼", emoji: "🐠", rarity: "Common", description: "喜欢躲在塑料瓶旁边，好奇心很重。", basePrice: 5, weatherHint: ["晴天", "阴天"], timeHint: "天气温和时更多" },
  { id: "clear-shrimp", name: "透明小虾", emoji: "🦐", rarity: "Common", description: "几乎看不见的小虾，装在碗里像一勺海风。", basePrice: 3, weatherHint: ["晴天"], timeHint: "清晨容易出现" },
  { id: "shell-crab", name: "贝壳蟹", emoji: "🐚", rarity: "Common", description: "背着小贝壳慢慢爬，偶尔夹住钓线不肯放。", basePrice: 4, weatherHint: ["阴天"], timeHint: "午后常见" },
  { id: "puff-puffer", name: "鼓气河豚", emoji: "🐡", rarity: "Uncommon", description: "受到惊吓会鼓成圆球，看起来像漂在海上的气球。", basePrice: 9, weatherHint: ["阴天"], timeHint: "风平浪静时出现" },
  { id: "glow-squid", name: "夜光小鱿", emoji: "🦑", rarity: "Uncommon", description: "触须会发出淡淡蓝光，是夜晚海面的小灯。", basePrice: 10, weatherHint: ["大雾", "阴天"], timeHint: "傍晚以后" },
  { id: "baby-octo", name: "章鱼宝宝", emoji: "🐙", rarity: "Uncommon", description: "会用触手偷摸木板，好像想帮你装修。", basePrice: 11, weatherHint: ["阴天"], timeHint: "午后" },
  { id: "silver-flyfish", name: "银鳞飞鱼", emoji: "🐬", rarity: "Uncommon", description: "跃出海面时像一枚银色纸飞机。", basePrice: 12, weatherHint: ["晴天", "暴雨"], timeHint: "有浪时更多" },
  { id: "rainbow-coral", name: "彩虹珊瑚鱼", emoji: "🐠", rarity: "Rare", description: "尾巴像彩虹糖纸，游过时连海水都亮了一点。", basePrice: 22, weatherHint: ["晴天"], timeHint: "阳光强时" },
  { id: "red-lobster", name: "红钳龙虾", emoji: "🦞", rarity: "Rare", description: "挥舞着红色大钳子，像在给自己打广告。", basePrice: 24, weatherHint: ["暴雨", "阴天"], timeHint: "浪大时" },
  { id: "moon-jelly", name: "月光水母", emoji: "🪼", rarity: "Rare", description: "透明伞盖里像藏了一小块月亮。", basePrice: 28, weatherHint: ["大雾"], timeHint: "夜色变深后" },
  { id: "mist-eel", name: "海雾鳗", emoji: "🐉", rarity: "Epic", description: "从雾里滑出来又钻回去，只留下银色水痕。", basePrice: 55, weatherHint: ["大雾"], timeHint: "雾最浓的时候" },
  { id: "gem-shark", name: "小型宝石鲨", emoji: "🦈", rarity: "Epic", description: "背鳍像一颗小宝石，游得很快但脾气不坏。", basePrice: 68, weatherHint: ["暴雨"], timeHint: "暴雨过后" },
  { id: "star-koi", name: "星潮锦鲤", emoji: "✨", rarity: "Legendary", description: "传说会跟着星潮出现，鳞片像漂流夜空。", basePrice: 150, weatherHint: ["大雾"], timeHint: "极少出现" },
  { id: "gold-boxfish", name: "黄金箱鲷", emoji: "👑", rarity: "Legendary", description: "方方正正、金光闪闪，看起来像补给箱成精。", basePrice: 180, weatherHint: ["晴天", "大雾"], timeHint: "好运爆棚时" },
];

export const initialInventory: Record<ItemId, number> = {
  wood: 5,
  plastic: 0,
  rope: 1,
  scrap: 0,
  water: 2,
  hotpotBase: 0,
  veggiePack: 0,
  meatSlices: 0,
  furnitureTicket: 0,
  commonCrate: 1,
  premiumCrate: 0,
  grilledFish: 0,
  fishSoup: 0,
  seafoodSkewer: 0,
  driftHotpot: 0,
  deluxeSeafoodPot: 0,
  commonFish: 0,
  rareFish: 0,
  mysteryFish: 0,
};

export const foodItems: Food[] = [
  { id: "grilledFish", name: "烤鱼", emoji: "🍖", hunger: 25, mood: 3, description: "最基础的漂流食物，简单但可靠。" },
  { id: "fishSoup", name: "鱼汤", emoji: "🍵", hunger: 30, mood: 8, description: "热乎乎的鱼汤让人恢复了一点精神。" },
  { id: "seafoodSkewer", name: "海鲜串", emoji: "🍢", hunger: 40, mood: 10, description: "把今天的收获串起来烤，意外地很香。" },
  { id: "driftHotpot", name: "漂流火锅", emoji: "🍲", hunger: 50, mood: 30, description: "在海上煮火锅，这就是漂流生活的最高奢侈。" },
  { id: "deluxeSeafoodPot", name: "豪华海鲜锅", emoji: "🥘", hunger: 45, mood: 25, description: "高级鱼做出来的海鲜锅，心情大幅提升。" },
];

export const recipes: Recipe[] = [
  { id: "grilled-fish", name: "烤鱼", emoji: "🍖", description: "最基础的漂流食物，虽然简单但很可靠。", output: "grilledFish", fixedCost: { wood: 1 }, fishCount: 1 },
  { id: "fish-soup", name: "鱼汤", emoji: "🍵", description: "热乎乎的鱼汤让人恢复了一点精神。", output: "fishSoup", fixedCost: { water: 1 }, fishCount: 1 },
  { id: "seafood-skewer", name: "海鲜串", emoji: "🍢", description: "把今天的收获串起来烤，意外地很香。", output: "seafoodSkewer", fixedCost: { wood: 1 }, fishCount: 2 },
  { id: "drift-hotpot", name: "漂流火锅", emoji: "🍲", description: "在海上煮火锅，这就是漂流生活的最高奢侈。", output: "driftHotpot", fixedCost: { hotpotBase: 1, veggiePack: 1, meatSlices: 1, water: 1 } },
  { id: "deluxe-seafood-pot", name: "豪华海鲜锅", emoji: "🥘", description: "高级鱼做出来的海鲜锅，心情大幅提升。", output: "deluxeSeafoodPot", fixedCost: { veggiePack: 1, water: 1 }, fishCount: 1, rareFishOnly: true, allowRareFish: true },
];

export const cards: Card[] = [
  { id: "wood", name: "木板", rarity: "Common", emoji: "🪵", description: "修船和扩建都离不开的万能木板。", itemId: "wood", amount: 4 },
  { id: "plastic", name: "塑料", rarity: "Common", emoji: "🧴", description: "轻轻漂着的基础材料。", itemId: "plastic", amount: 3 },
  { id: "fish-snack", name: "海味小礼包", rarity: "Common", emoji: "🐟", description: "随机获得 2 条 Common 鱼。", fishRarity: "Common", amount: 2 },
  { id: "water", name: "淡水", rarity: "Common", emoji: "💧", description: "干净淡水，做饭和生存都需要。", itemId: "water", amount: 2 },
  { id: "scrap", name: "铁片", rarity: "Rare", emoji: "🔩", description: "能让木筏更结实的金属材料。", itemId: "scrap", amount: 3 },
  { id: "rare-fish-box", name: "稀有鱼罐", rarity: "Rare", emoji: "🐠", description: "随机获得 1 条 Rare 鱼。", fishRarity: "Rare", amount: 1 },
  { id: "hotpot-base", name: "火锅底料", rarity: "Rare", emoji: "🌶️", description: "漂流火锅的灵魂。", itemId: "hotpotBase", amount: 1 },
  { id: "furniture-ticket", name: "家具券", rarity: "Rare", emoji: "🎟️", description: "可以布置一件随机家具。", itemId: "furnitureTicket", amount: 1 },
  { id: "advanced-rod", name: "高级鱼竿", rarity: "Epic", emoji: "🎣", description: "提高 Rare 和 Epic 鱼出现概率。", equipment: "advancedRod" },
  { id: "water-purifier", name: "自动净水器", rarity: "Epic", emoji: "🚰", description: "每天结束时额外获得 1 份淡水。", equipment: "waterPurifier" },
  { id: "sofa", name: "豪华沙发", rarity: "Epic", emoji: "🛋️", description: "让漂流小屋立刻像家。", furniture: "豪华沙发" },
  { id: "grill", name: "海上烧烤架", rarity: "Epic", emoji: "🍢", description: "闻起来像假日码头。", equipment: "grill" },
  { id: "kitchen", name: "移动海上厨房", rarity: "Legendary", emoji: "🍳", description: "传说级海上料理设备。", equipment: "kitchen" },
  { id: "golden-rod", name: "黄金鱼竿", rarity: "Legendary", emoji: "🏆", description: "大幅提高 Epic 和 Legendary 鱼出现概率。", equipment: "goldenRod" },
  { id: "onsen", name: "迷你温泉", rarity: "Legendary", emoji: "♨️", description: "在木筏上泡汤，听起来就很离谱也很幸福。", furniture: "迷你温泉" },
  { id: "permit", name: "海上便利店许可证", rarity: "Legendary", emoji: "🏪", description: "你的海上商业梦开始发光。", equipment: "shopPermit" },
];

export const furniturePool = ["小木桌", "防水床垫", "海上火锅桌", "贝壳灯", "豪华沙发", "迷你温泉"];

export const upgradeRequirements: Partial<Record<BoatLevel, Partial<Record<ItemId, number>> & { coins?: number }>> = {
  1: { wood: 10, rope: 5, scrap: 3 },
  2: { wood: 20, plastic: 15, scrap: 8, coins: 100 },
  3: { wood: 30, scrap: 20, furnitureTicket: 3, coins: 300 },
};

export function createFishCollection(): Record<string, FishCollectionEntry> {
  return Object.fromEntries(fishList.map((fish) => [fish.id, { discovered: false, count: 0 }]));
}

export function createBaseFishPrices(): FishPrices {
  return Object.fromEntries(fishList.map((fish) => [fish.id, fish.basePrice]));
}

export function createInitialState(): GameState {
  return {
    started: false,
    day: 1,
    weather: "晴天",
    hunger: 85,
    mood: 80,
    coins: 20,
    boatHp: 60,
    boatMaxHp: 60,
    boatLevel: 1,
    inventory: { ...initialInventory },
    equipment: [],
    furniture: [],
    fishCollection: createFishCollection(),
    fishPrices: createBaseFishPrices(),
    tradePrices: { commonFish: 3, rareFish: 10, mysteryFish: 45 },
    logs: [
      {
        id: crypto.randomUUID(),
        day: 1,
        type: "event",
        title: "漂流开始",
        message: "你醒在海面上，身边只有小木筏和一个神秘的潮汐系统。",
        important: true,
      },
    ],
  };
}
