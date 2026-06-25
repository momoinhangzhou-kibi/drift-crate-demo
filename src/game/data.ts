import { BoatLevel, Card, CatOption, CatState, CatType, Fish, FishCollectionEntry, FishPrices, Food, GameState, ItemId, ItemMeta, Recipe, ShopItem, Talent, Weather } from "./types";

export const itemNames: Record<ItemId, string> = {
  wood: "木板",
  plastic: "塑料",
  rope: "绳子",
  scrap: "铁片",
  screw: "螺丝",
  tarp: "防水布",
  tape: "胶带",
  water: "淡水",
  biscuit: "饼干",
  cannedFood: "罐头",
  ramen: "泡面",
  chocolate: "巧克力",
  compressedBiscuit: "压缩饼干",
  wrench: "扳手",
  lighter: "打火机",
  flashlight: "手电筒",
  toolbox: "工具箱",
  repairTape: "修理胶带",
  toiletPaper: "卫生纸",
  wetWipes: "湿巾",
  sanitaryPad: "卫生巾",
  towel: "毛巾",
  soap: "肥皂",
  medkit: "简易药包",
  sturdyRod: "结实钓鱼竿",
  advancedRodItem: "高级钓鱼竿",
  fishingNet: "渔网",
  waterproofBackpack: "防水背包",
  solarPurifier: "太阳能净水器",
  autoFisher: "自动钓鱼器",
  foldingChair: "折叠椅",
  shellLamp: "贝壳灯",
  waterproofMattress: "防水床垫",
  simpleToilet: "简易马桶",
  storageBox: "收纳箱",
  mysteryBottle: "神秘漂流瓶",
  luckyShell: "幸运贝壳",
  merchantCoupon: "商船优惠券",
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
  grilledFishSkewer: "烤鱼串",
  seafoodSoup: "海鲜汤",
  shrimpRiceBall: "小虾饭团",
  cannedRamen: "罐头泡面",
  warmFishSoup: "暖暖鱼汤",
  searedTuna: "香煎金枪鱼",
  rainbowSashimi: "彩虹鱼刺身",
  survivorFeast: "漂流者豪华套餐",
  commonFish: "普通鱼",
  rareFish: "稀有鱼",
  mysteryFish: "神秘鱼",
};

export const itemEmoji: Record<ItemId, string> = {
  wood: "🪵",
  plastic: "🧴",
  rope: "🧶",
  scrap: "🔩",
  screw: "⚙️",
  tarp: "⛺",
  tape: "🩹",
  water: "💧",
  biscuit: "🍪",
  cannedFood: "🥫",
  ramen: "🍜",
  chocolate: "🍫",
  compressedBiscuit: "🥨",
  wrench: "🔧",
  lighter: "🔥",
  flashlight: "🔦",
  toolbox: "🧰",
  repairTape: "🩹",
  toiletPaper: "🧻",
  wetWipes: "🧼",
  sanitaryPad: "🌸",
  towel: "🧺",
  soap: "🫧",
  medkit: "💊",
  sturdyRod: "🎣",
  advancedRodItem: "🎣",
  fishingNet: "🕸️",
  waterproofBackpack: "🎒",
  solarPurifier: "☀️",
  autoFisher: "🤖",
  foldingChair: "🪑",
  shellLamp: "🏮",
  waterproofMattress: "🛏️",
  simpleToilet: "🚽",
  storageBox: "📦",
  mysteryBottle: "🍾",
  luckyShell: "🐚",
  merchantCoupon: "🎫",
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
  grilledFishSkewer: "🍡",
  seafoodSoup: "🥣",
  shrimpRiceBall: "🍙",
  cannedRamen: "🍜",
  warmFishSoup: "♨️",
  searedTuna: "🥩",
  rainbowSashimi: "🍣",
  survivorFeast: "🍱",
  commonFish: "🐟",
  rareFish: "🐠",
  mysteryFish: "✨",
};

export const weatherList: Weather[] = ["晴天", "阴天", "小雨", "大雾"];
export const disasterWeather: Weather[] = ["风暴", "高温", "寒潮", "暴雨", "巨浪"];

export const itemMeta: Record<ItemId, ItemMeta> = Object.fromEntries(
  (Object.keys(itemNames) as ItemId[]).map((id) => {
    const food = ["water", "biscuit", "cannedFood", "ramen", "chocolate", "compressedBiscuit", "grilledFish", "fishSoup", "seafoodSkewer", "driftHotpot", "deluxeSeafoodPot", "grilledFishSkewer", "seafoodSoup", "shrimpRiceBall", "cannedRamen", "warmFishSoup", "searedTuna", "rainbowSashimi", "survivorFeast"].includes(id);
    const tools = ["wrench", "lighter", "flashlight", "toolbox", "repairTape"].includes(id);
    const hygiene = ["toiletPaper", "wetWipes", "sanitaryPad", "towel", "soap", "medkit"].includes(id);
    const furniture = ["foldingChair", "shellLamp", "waterproofMattress", "simpleToilet", "storageBox", "furnitureTicket"].includes(id);
    const equipment = ["sturdyRod", "advancedRodItem", "fishingNet", "waterproofBackpack", "solarPurifier", "autoFisher"].includes(id);
    const special = ["commonCrate", "premiumCrate", "mysteryBottle", "luckyShell", "merchantCoupon"].includes(id);
    const rarity = ["premiumCrate", "toolbox", "advancedRodItem", "solarPurifier", "shellLamp", "simpleToilet", "luckyShell", "autoFisher"].includes(id)
      ? "Epic"
      : ["scrap", "screw", "tarp", "cannedFood", "ramen", "medkit", "sturdyRod", "fishingNet", "mysteryBottle"].includes(id)
        ? "Rare"
        : "Common";
    return [id, { id, category: food ? "food" : tools ? "tools" : hygiene ? "hygiene" : furniture ? "furniture" : equipment ? "equipment" : special ? "special" : "materials", rarity }];
  }),
) as Record<ItemId, ItemMeta>;

export const shopCatalog: ShopItem[] = [
  ["wood", 5, 5], ["plastic", 6, 5], ["rope", 8, 4], ["scrap", 18, 3], ["screw", 14, 3], ["tarp", 22, 2], ["tape", 10, 3],
  ["water", 10, 4], ["biscuit", 12, 3], ["cannedFood", 22, 2], ["ramen", 18, 2], ["chocolate", 16, 2], ["compressedBiscuit", 20, 2],
  ["wrench", 35, 1], ["lighter", 26, 1], ["flashlight", 32, 1], ["toolbox", 80, 1], ["repairTape", 24, 2],
  ["toiletPaper", 8, 2], ["wetWipes", 12, 2], ["sanitaryPad", 12, 2], ["towel", 16, 1], ["soap", 10, 2], ["medkit", 40, 1],
  ["sturdyRod", 70, 1], ["advancedRodItem", 160, 1], ["fishingNet", 90, 1], ["waterproofBackpack", 100, 1], ["solarPurifier", 180, 1], ["autoFisher", 220, 1],
  ["foldingChair", 45, 1], ["shellLamp", 85, 1], ["waterproofMattress", 80, 1], ["simpleToilet", 100, 1], ["storageBox", 70, 1],
  ["commonCrate", 30, 3], ["premiumCrate", 100, 1], ["mysteryBottle", 45, 1], ["luckyShell", 120, 1], ["merchantCoupon", 60, 1],
].map(([id, price, quantity]) => ({ id: id as ItemId, price: price as number, quantity: quantity as number, category: itemMeta[id as ItemId].category, rarity: itemMeta[id as ItemId].rarity }));

export const talents: Talent[] = [
  { id: "fishing", name: "钓鱼高手", emoji: "🎣", description: "稀有鱼和神秘鱼概率上升。" },
  { id: "trading", name: "交易达人", emoji: "🛒", description: "卖鱼价格 +20%。" },
  { id: "lucky", name: "幸运漂流者", emoji: "🍀", description: "开补给包时 Rare 以上概率上升。" },
  { id: "crafting", name: "手作达人", emoji: "🔨", description: "载具升级需要的材料减少 20%。" },
];

export const catOptions: CatOption[] = [
  {
    type: "black",
    defaultName: "kibi",
    breed: "黑猫",
    emoji: "🐈‍⬛",
    personality: "安静、神秘、会盯着海面发呆。",
    bonus: "初始 Mood +3。",
    recommended: true,
  },
  {
    type: "cow",
    defaultName: "小漂",
    breed: "奶牛猫",
    emoji: "🐈",
    personality: "活泼、爱撒娇、喜欢鱼。",
    bonus: "钓鱼后小概率额外 Mood +1。",
  },
  {
    type: "orange",
    defaultName: "橘子",
    breed: "橘猫",
    emoji: "🐱",
    personality: "贪吃、乐天、喜欢睡在补给箱旁边。",
    bonus: "喂食收益略高。",
  },
  {
    type: "calico",
    defaultName: "花花",
    breed: "三花猫",
    emoji: "🐈",
    personality: "聪明、好奇、喜欢翻背包。",
    bonus: "每日小概率发现材料。",
  },
];

export function createCatState(type: CatType = "black"): CatState {
  const option = catOptions.find((cat) => cat.type === type) ?? catOptions[0];
  return {
    type: option.type,
    name: option.defaultName,
    breed: option.breed,
    emoji: option.emoji,
    intimacy: 10,
    satiety: 60,
    mood: 70,
    todayEvent: "它正安静适应这片海。",
  };
}

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
  { id: "tiny-minnow", name: "普通小鱼", emoji: "🐟", rarity: "Common", description: "最常陪着木筏游的小鱼，虽然普通，但很有安全感。", basePrice: 2, weatherHint: ["晴天", "阴天"], timeHint: "全天常见", cookingTag: "basic" },
  { id: "clear-shrimp", name: "透明小虾", emoji: "🦐", rarity: "Common", description: "几乎看不见的小虾，装在碗里像一勺海风。", basePrice: 3, weatherHint: ["晴天"], timeHint: "清晨容易出现", cookingTag: "shrimp" },
  { id: "blue-sardine", name: "蓝纹沙丁鱼", emoji: "🐟", rarity: "Common", description: "成群游过木筏边的小鱼，鳞片像蓝色手账贴纸。", basePrice: 4, weatherHint: ["晴天"], timeHint: "白天常见", cookingTag: "basic" },
  { id: "shell-crab", name: "贝壳蟹", emoji: "🐚", rarity: "Common", description: "背着小贝壳慢慢爬，偶尔夹住钓线不肯放。", basePrice: 4, weatherHint: ["阴天"], timeHint: "午后常见", cookingTag: "shellfish" },
  { id: "drift-clown", name: "漂流小丑鱼", emoji: "🐠", rarity: "Common", description: "喜欢躲在塑料瓶旁边，好奇心很重。", basePrice: 5, weatherHint: ["晴天", "阴天"], timeHint: "天气温和时更多", cookingTag: "basic" },
  { id: "silver-flyfish", name: "银鳞飞鱼", emoji: "🐬", rarity: "Uncommon", description: "跃出海面时像一枚银色纸飞机。", basePrice: 12, weatherHint: ["晴天", "暴雨"], timeHint: "有浪时更多", cookingTag: "basic" },
  { id: "puff-puffer", name: "鼓气河豚", emoji: "🐡", rarity: "Uncommon", description: "受到惊吓会鼓成圆球，看起来像漂在海上的气球。", basePrice: 9, weatherHint: ["阴天"], timeHint: "风平浪静时出现", cookingTag: "basic" },
  { id: "glow-squid", name: "夜光小鱿", emoji: "🦑", rarity: "Uncommon", description: "触须会发出淡淡蓝光，是夜晚海面的小灯。", basePrice: 10, weatherHint: ["大雾", "阴天"], timeHint: "傍晚以后", cookingTag: "squid" },
  { id: "baby-octo", name: "章鱼宝宝", emoji: "🐙", rarity: "Uncommon", description: "会用触手偷摸木板，好像想帮你装修。", basePrice: 11, weatherHint: ["阴天"], timeHint: "午后", cookingTag: "octopus" },
  { id: "tuna-bluefin", name: "海风金枪鱼", emoji: "🐟", rarity: "Rare", description: "肉质扎实的大鱼，煎起来会让整个小屋都香起来。", basePrice: 26, weatherHint: ["晴天", "暴雨"], timeHint: "浪起时", cookingTag: "tuna" },
  { id: "rainbow-coral", name: "彩虹鱼", emoji: "🐠", rarity: "Rare", description: "尾巴像彩虹糖纸，游过时连海水都亮了一点。", basePrice: 22, weatherHint: ["晴天"], timeHint: "阳光强时", cookingTag: "rainbow" },
  { id: "red-lobster", name: "红钳龙虾", emoji: "🦞", rarity: "Rare", description: "挥舞着红色大钳子，像在给自己打广告。", basePrice: 24, weatherHint: ["暴雨", "阴天"], timeHint: "浪大时", cookingTag: "shellfish" },
  { id: "moon-jelly", name: "月光水母", emoji: "🪼", rarity: "Rare", description: "透明伞盖里像藏了一小块月亮。", basePrice: 28, weatherHint: ["大雾"], timeHint: "夜色变深后", cookingTag: "rare" },
  { id: "angler-lamp", name: "深海灯笼鱼", emoji: "🏮", rarity: "Epic", description: "头顶一点暖光，像从深海提着灯来拜访。", basePrice: 60, weatherHint: ["大雾", "暴雨"], timeHint: "深夜传说", cookingTag: "rare" },
  { id: "golden-snapper", name: "黄金鲷鱼", emoji: "🐡", rarity: "Epic", description: "金色鱼鳞闪得像贝壳币，卖掉或收藏都会犹豫。", basePrice: 72, weatherHint: ["晴天"], timeHint: "好运时", cookingTag: "rare" },
  { id: "mist-eel", name: "海雾鳗", emoji: "🐉", rarity: "Epic", description: "从雾里滑出来又钻回去，只留下银色水痕。", basePrice: 55, weatherHint: ["大雾"], timeHint: "雾最浓的时候", cookingTag: "rare" },
  { id: "gem-shark", name: "小型宝石鲨", emoji: "🦈", rarity: "Epic", description: "背鳍像一颗小宝石，游得很快但脾气不坏。", basePrice: 68, weatherHint: ["暴雨"], timeHint: "暴雨过后", cookingTag: "rare" },
  { id: "starfish-dream", name: "星星鱼", emoji: "⭐", rarity: "Legendary", description: "它不像鱼，更像一小块被海浪带来的愿望。", basePrice: 135, weatherHint: ["大雾"], timeHint: "星光很亮时", cookingTag: "legend" },
  { id: "star-koi", name: "传说锦鲤", emoji: "✨", rarity: "Legendary", description: "传说会跟着星潮出现，鳞片像漂流夜空。", basePrice: 150, weatherHint: ["大雾"], timeHint: "极少出现", cookingTag: "legend" },
  { id: "gold-boxfish", name: "黄金箱鲷", emoji: "👑", rarity: "Legendary", description: "方方正正、金光闪闪，看起来像补给箱成精。", basePrice: 180, weatherHint: ["晴天", "大雾"], timeHint: "好运爆棚时", cookingTag: "legend" },
];

export const initialInventory: Record<ItemId, number> = {
  wood: 5,
  plastic: 0,
  rope: 1,
  scrap: 0,
  screw: 0,
  tarp: 0,
  tape: 0,
  water: 2,
  biscuit: 0,
  cannedFood: 0,
  ramen: 0,
  chocolate: 0,
  compressedBiscuit: 0,
  wrench: 0,
  lighter: 0,
  flashlight: 0,
  toolbox: 0,
  repairTape: 0,
  toiletPaper: 0,
  wetWipes: 0,
  sanitaryPad: 0,
  towel: 0,
  soap: 0,
  medkit: 0,
  sturdyRod: 0,
  advancedRodItem: 0,
  fishingNet: 0,
  waterproofBackpack: 0,
  solarPurifier: 0,
  autoFisher: 0,
  foldingChair: 0,
  shellLamp: 0,
  waterproofMattress: 0,
  simpleToilet: 0,
  storageBox: 0,
  mysteryBottle: 0,
  luckyShell: 0,
  merchantCoupon: 0,
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
  grilledFishSkewer: 0,
  seafoodSoup: 0,
  shrimpRiceBall: 0,
  cannedRamen: 0,
  warmFishSoup: 0,
  searedTuna: 0,
  rainbowSashimi: 0,
  survivorFeast: 0,
  commonFish: 0,
  rareFish: 0,
  mysteryFish: 0,
};

export const foodItems: Food[] = [
  { id: "biscuit", name: "饼干", emoji: "🍪", hunger: 15, mood: 2, description: "脆脆的小饼干，适合应急。" },
  { id: "cannedFood", name: "罐头", emoji: "🥫", hunger: 28, mood: 4, description: "扎实可靠的海上口粮。" },
  { id: "ramen", name: "泡面", emoji: "🍜", hunger: 32, mood: 8, description: "热乎乎的泡面能拯救一天。" },
  { id: "chocolate", name: "巧克力", emoji: "🍫", hunger: 12, mood: 12, description: "一点甜味让漂流没那么孤单。" },
  { id: "compressedBiscuit", name: "压缩饼干", emoji: "🥨", hunger: 35, mood: 1, description: "非常顶饱，但谈不上快乐。" },
  { id: "grilledFish", name: "烤鱼", emoji: "🍖", hunger: 25, mood: 3, description: "最基础的漂流食物，简单但可靠。" },
  { id: "fishSoup", name: "鱼汤", emoji: "🍵", hunger: 30, mood: 8, description: "热乎乎的鱼汤让人恢复了一点精神。" },
  { id: "seafoodSkewer", name: "海鲜串", emoji: "🍢", hunger: 40, mood: 10, description: "把今天的收获串起来烤，意外地很香。" },
  { id: "driftHotpot", name: "漂流火锅", emoji: "🍲", hunger: 50, mood: 30, description: "在海上煮火锅，这就是漂流生活的最高奢侈。" },
  { id: "deluxeSeafoodPot", name: "豪华海鲜锅", emoji: "🥘", hunger: 45, mood: 25, description: "高级鱼做出来的海鲜锅，心情大幅提升。" },
  { id: "grilledFishSkewer", name: "烤鱼串", emoji: "🍡", hunger: 32, mood: 7, description: "切成小块串起来烤，适合边看海边吃。" },
  { id: "seafoodSoup", name: "海鲜汤", emoji: "🥣", hunger: 38, mood: 12, description: "虾蟹和小鱼一起熬成的热汤，很有海上小家的味道。" },
  { id: "shrimpRiceBall", name: "小虾饭团", emoji: "🍙", hunger: 28, mood: 10, description: "把透明小虾包进饭团里，猫猫也会盯着看。" },
  { id: "cannedRamen", name: "罐头泡面", emoji: "🍜", hunger: 46, mood: 14, description: "把罐头倒进泡面里，是漂流者的深夜快乐。" },
  { id: "warmFishSoup", name: "暖暖鱼汤", emoji: "♨️", hunger: 42, mood: 18, description: "多加一份淡水慢慢熬，喝完整个人都暖起来。" },
  { id: "searedTuna", name: "香煎金枪鱼", emoji: "🥩", hunger: 48, mood: 18, description: "Rare 金枪鱼煎到两面金黄，像海上餐厅的招牌菜。" },
  { id: "rainbowSashimi", name: "彩虹鱼刺身", emoji: "🍣", hunger: 36, mood: 28, description: "颜色漂亮到舍不得吃，心情会被瞬间点亮。" },
  { id: "survivorFeast", name: "漂流者豪华套餐", emoji: "🍱", hunger: 65, mood: 35, description: "鱼、热汤和甜味补给都摆上桌，今天像节日。" },
];

export const recipes: Recipe[] = [
  { id: "grilled-fish", name: "烤鱼", emoji: "🍖", description: "最基础的漂流食物，虽然简单但很可靠。", output: "grilledFish", fixedCost: { wood: 1 }, fishCount: 1, rarity: "Common", catFavorite: true },
  { id: "fish-soup", name: "鱼汤", emoji: "🍵", description: "热乎乎的鱼汤让人恢复了一点精神。", output: "fishSoup", fixedCost: { water: 1 }, fishCount: 1, rarity: "Common", catFavorite: true },
  { id: "grilled-fish-skewer", name: "烤鱼串", emoji: "🍡", description: "把鱼肉切成小块串起来，烤到边缘微焦。", output: "grilledFishSkewer", fixedCost: { wood: 1 }, fishCount: 1, rarity: "Common", catFavorite: true },
  { id: "seafood-skewer", name: "海鲜串", emoji: "🍢", description: "把今天的收获串起来烤，意外地很香。", output: "seafoodSkewer", fixedCost: { wood: 1 }, fishCount: 2, rarity: "Uncommon" },
  { id: "shrimp-rice-ball", name: "小虾饭团", emoji: "🍙", description: "透明小虾做成的小饭团，轻巧又治愈。", output: "shrimpRiceBall", fixedCost: { biscuit: 1 }, fishCount: 1, fishIds: ["clear-shrimp"], rarity: "Uncommon", catFavorite: true },
  { id: "seafood-soup", name: "海鲜汤", emoji: "🥣", description: "虾蟹小鱼一起煮，像把海风熬进锅里。", output: "seafoodSoup", fixedCost: { water: 1, veggiePack: 1 }, fishCount: 2, rarity: "Rare", unlockDay: 3, unlockHint: "Day 3 解锁" },
  { id: "canned-ramen", name: "罐头泡面", emoji: "🍜", description: "补给包料理的灵魂：罐头、泡面、热水。", output: "cannedRamen", fixedCost: { cannedFood: 1, ramen: 1, water: 1 }, rarity: "Rare", unlockDay: 4, unlockHint: "Day 4 解锁" },
  { id: "warm-fish-soup", name: "暖暖鱼汤", emoji: "♨️", description: "多花一点淡水慢慢煮，寒潮前最安心。", output: "warmFishSoup", fixedCost: { water: 2 }, fishCount: 1, rarity: "Rare", unlockDay: 5, unlockHint: "Day 5 解锁", catFavorite: true },
  { id: "seared-tuna", name: "香煎金枪鱼", emoji: "🥩", description: "只用海风金枪鱼做的招牌硬菜。", output: "searedTuna", fixedCost: { wood: 1, tape: 1 }, fishCount: 1, fishIds: ["tuna-bluefin"], rarity: "Epic", unlockDay: 6, unlockHint: "需要钓到海风金枪鱼" },
  { id: "rainbow-sashimi", name: "彩虹鱼刺身", emoji: "🍣", description: "用彩虹鱼做出的漂亮刺身，像在吃一片晴天。", output: "rainbowSashimi", fixedCost: { water: 1 }, fishCount: 1, fishIds: ["rainbow-coral"], rarity: "Epic", unlockDay: 6, unlockHint: "需要钓到彩虹鱼" },
  { id: "drift-hotpot", name: "海上火锅", emoji: "🍲", description: "在海上煮火锅，这就是漂流生活的最高奢侈。", output: "driftHotpot", fixedCost: { hotpotBase: 1, veggiePack: 1, meatSlices: 1, water: 1 }, rarity: "Epic", unlockDay: 7, unlockHint: "Day 7 解锁" },
  { id: "deluxe-seafood-pot", name: "豪华海鲜锅", emoji: "🥘", description: "高级鱼做出来的海鲜锅，心情大幅提升。", output: "deluxeSeafoodPot", fixedCost: { veggiePack: 1, water: 1 }, fishCount: 1, rareFishOnly: true, allowRareFish: true, rarity: "Epic", unlockDay: 8, unlockHint: "Day 8 后用 Rare 以上鱼制作" },
  { id: "survivor-feast", name: "漂流者豪华套餐", emoji: "🍱", description: "高级鱼、蔬菜和肉片摆满桌，像给自己办了一场庆功宴。", output: "survivorFeast", fixedCost: { veggiePack: 1, meatSlices: 1, chocolate: 1, water: 1 }, fishCount: 1, rareFishOnly: true, allowRareFish: true, rarity: "Legendary", unlockDay: 10, unlockHint: "Day 10 后解锁" },
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
  { id: "auto-fisher", name: "自动钓鱼器", rarity: "Legendary", emoji: "🤖", description: "每天结束时小概率获得普通鱼。", equipment: "autoFisher" },
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
    shopStock: createShopStock(1),
    cat: createCatState("black"),
    fishDexRewardsClaimed: [],
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

export function createShopStock(day: number): ShopItem[] {
  const week = Math.floor((day - 1) / 7);
  const early = day <= 7;
  let seed = week * 9301 + 49297;
  const rand = () => {
    seed = (seed * 233 + 71) % 9973;
    return seed / 9973;
  };
  const pool = shopCatalog.filter((item) => early ? ["materials", "food", "hygiene", "tools", "special"].includes(item.category) && item.rarity !== "Epic" : true);
  const picked = pool.filter((item) => rand() < (item.rarity === "Epic" ? 0.18 : item.rarity === "Rare" ? 0.35 : 0.55)).slice(0, early ? 10 : 14);
  const guaranteed = shopCatalog.filter((item) => item.id === "commonCrate" || (!early && item.id === "premiumCrate"));
  const merged = [...guaranteed, ...(picked.length ? picked : pool.slice(0, early ? 10 : 14))].filter(
    (item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index,
  );
  return merged.map((item) => ({ ...item, price: Math.max(1, Math.round(item.price * (0.9 + rand() * 0.25))) }));
}
