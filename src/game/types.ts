export type ItemId =
  | "wood"
  | "plastic"
  | "rope"
  | "scrap"
  | "water"
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
  | "commonFish"
  | "rareFish"
  | "mysteryFish";

export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
export type FishRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type Weather = "晴天" | "阴天" | "暴雨" | "大雾";
export type BoatLevel = 1 | 2 | 3 | 4;
export type TalentId = "fishing" | "trading" | "lucky" | "crafting";

export interface Fish {
  id: string;
  name: string;
  emoji: string;
  rarity: FishRarity;
  description: string;
  basePrice: number;
  weatherHint?: Weather[];
  timeHint?: string;
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
  equipment?: "advancedRod" | "goldenRod" | "waterPurifier" | "grill" | "kitchen" | "shopPermit";
  furniture?: string;
}

export interface Talent {
  id: TalentId;
  name: string;
  description: string;
  emoji: string;
}

export interface Food {
  id: ItemId;
  name: string;
  emoji: string;
  hunger: number;
  mood: number;
  description: string;
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
  lastCard?: Card;
  lastCrateType?: "commonCrate" | "premiumCrate";
  newestFishId?: string;
}
