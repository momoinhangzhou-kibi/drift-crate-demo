export type ItemId =
  | "wood"
  | "plastic"
  | "rope"
  | "scrap"
  | "screw"
  | "tarp"
  | "tape"
  | "water"
  | "biscuit"
  | "cannedFood"
  | "ramen"
  | "chocolate"
  | "compressedBiscuit"
  | "wrench"
  | "lighter"
  | "flashlight"
  | "toolbox"
  | "repairTape"
  | "toiletPaper"
  | "wetWipes"
  | "sanitaryPad"
  | "towel"
  | "soap"
  | "medkit"
  | "sturdyRod"
  | "advancedRodItem"
  | "fishingNet"
  | "waterproofBackpack"
  | "solarPurifier"
  | "autoFisher"
  | "foldingChair"
  | "shellLamp"
  | "waterproofMattress"
  | "simpleToilet"
  | "storageBox"
  | "mysteryBottle"
  | "luckyShell"
  | "merchantCoupon"
  | "hotpotBase"
  | "veggiePack"
  | "meatSlices"
  | "furnitureTicket"
  | "commonCrate"
  | "premiumCrate"
  | "grilledFish"
  | "fishSoup"
  | "seafoodSkewer"
  | "driftHotpot"
  | "deluxeSeafoodPot"
  | "grilledFishSkewer"
  | "seafoodSoup"
  | "shrimpRiceBall"
  | "cannedRamen"
  | "warmFishSoup"
  | "searedTuna"
  | "rainbowSashimi"
  | "survivorFeast"
  | "commonFish"
  | "rareFish"
  | "mysteryFish";

export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
export type FishRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type Weather = "晴天" | "阴天" | "小雨" | "暴雨" | "大雾" | "风暴" | "高温" | "寒潮" | "巨浪";
export type BoatLevel = 1 | 2 | 3 | 4;
export type TalentId = "fishing" | "trading" | "lucky" | "crafting";
export type ItemCategory = "materials" | "food" | "tools" | "hygiene" | "furniture" | "equipment" | "special";
export type CatType = "black" | "cow" | "orange" | "calico";

export interface Fish {
  id: string;
  name: string;
  emoji: string;
  rarity: FishRarity;
  description: string;
  basePrice: number;
  weatherHint?: Weather[];
  timeHint?: string;
  cookingTag?: string;
}

export interface FishCollectionEntry {
  discovered: boolean;
  count: number;
  firstCaughtDay?: number;
}

export interface Card {
  id: string;
  name: string;
  rarity: Rarity;
  emoji: string;
  description: string;
  itemId?: ItemId;
  amount?: number;
  fishRarity?: FishRarity;
  equipment?: "advancedRod" | "goldenRod" | "waterPurifier" | "grill" | "kitchen" | "shopPermit" | "autoFisher";
  furniture?: string;
}

export interface Talent {
  id: TalentId;
  name: string;
  description: string;
  emoji: string;
}

export interface CatOption {
  type: CatType;
  defaultName: string;
  breed: string;
  emoji: string;
  iconClass: string;
  personality: string;
  bonus: string;
  recommended?: boolean;
}

export interface CatState {
  type: CatType;
  name: string;
  breed: string;
  emoji: string;
  iconClass: string;
  intimacy: number;
  satiety: number;
  mood: number;
  todayEvent?: string;
}

export interface CatFeedOption {
  id: string;
  label: string;
  emoji: string;
  catSatiety: number;
  catIntimacy: number;
  catMood: number;
  playerMood: number;
  itemId?: ItemId;
  fishIds?: string[];
}

export interface Food {
  id: ItemId;
  name: string;
  emoji: string;
  hunger: number;
  mood: number;
  description: string;
}

export interface ItemMeta {
  id: ItemId;
  category: ItemCategory;
  rarity: Rarity;
}

export interface ShopItem {
  id: ItemId;
  category: ItemCategory;
  rarity: Rarity;
  price: number;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  output: ItemId;
  fixedCost: Partial<Record<ItemId, number>>;
  fishCount?: number;
  rareFishOnly?: boolean;
  allowRareFish?: boolean;
  fishIds?: string[];
  rarity?: FishRarity;
  unlockDay?: number;
  unlockHint?: string;
  catFavorite?: boolean;
}

export type LogType =
  | "fishing"
  | "salvage"
  | "crate"
  | "trade"
  | "cooking"
  | "upgrade"
  | "furniture"
  | "event"
  | "warning"
  | "discovery";

export interface LogEntry {
  id: string;
  day: number;
  type: LogType;
  title: string;
  message: string;
  rewards?: string[];
  important?: boolean;
  isNew?: boolean;
}

export type FishPrices = Record<string, number>;

export interface TradePrices {
  commonFish: number;
  rareFish: number;
  mysteryFish: number;
}

export interface GameState {
  started: boolean;
  day: number;
  weather: Weather;
  hunger: number;
  mood: number;
  coins: number;
  boatHp: number;
  boatMaxHp: number;
  boatLevel: BoatLevel;
  talent?: TalentId;
  inventory: Record<ItemId, number>;
  equipment: string[];
  furniture: string[];
  fishCollection: Record<string, FishCollectionEntry>;
  fishPrices: FishPrices;
  tradePrices: TradePrices;
  logs: LogEntry[];
  shopStock: ShopItem[];
  cat: CatState;
  fishDexRewardsClaimed: number[];
  gameOverReason?: string;
  tutorialSeen?: boolean;
  lastCard?: Card;
  lastCrateDrops?: string[];
  lastCrateLuck?: string;
  lastCrateType?: "commonCrate" | "premiumCrate";
  newestFishId?: string;
}
