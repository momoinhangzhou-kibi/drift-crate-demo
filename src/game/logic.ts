import {
  boatHpByLevel,
  cards,
  createBaseFishPrices,
  createCatState,
  createFishCollection,
  createInitialState,
  createShopStock,
  disasterWeather,
  fishList,
  foodItems,
  furniturePool,
  itemEmoji,
  itemMeta,
  itemNames,
  recipes,
  upgradeRequirements,
  weatherList,
} from "./data";
import { BoatLevel, CatFeedOption, CatState, CatType, Fish, FishRarity, GameState, ItemId, LogType, Rarity, Recipe, TalentId, TradePrices, Weather } from "./types";

const STORAGE_KEY = "drift-crate-save";
const SAVE_SLOTS_KEY = "drift-crate-save-slots";
const ACTIVE_SAVE_ID_KEY = "drift-crate-active-save-id";

export interface SaveSummary {
  exists: boolean;
  id?: string;
  name?: string;
  day?: number;
  boatLevel?: BoatLevel;
  coins?: number;
  hunger?: number;
  mood?: number;
  boatHp?: number;
  boatMaxHp?: number;
  catName?: string;
  fishDexCompletion?: number;
  savedAt?: string;
}

interface SavePayload {
  version: 2;
  savedAt: string;
  state: GameState;
}

export interface SaveSlot {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  gameState: GameState;
  summary: SaveSummary;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function updateCat(state: GameState, patch: Partial<CatState>): GameState {
  const cat = state.cat ?? createCatState("black");
  return {
    ...state,
    cat: {
      ...cat,
      ...patch,
      intimacy: clamp(patch.intimacy ?? cat.intimacy),
      satiety: clamp(patch.satiety ?? cat.satiety),
      mood: clamp(patch.mood ?? cat.mood),
    },
  };
}

function addLog(
  state: GameState,
  type: LogType,
  title: string,
  message: string,
  rewards: string[] = [],
  important = false,
  isNew = false,
): GameState {
  return {
    ...state,
    logs: [{ id: crypto.randomUUID(), day: state.day, type, title, message, rewards, important, isNew }, ...state.logs].slice(0, 30),
  };
}

function addSystemLog(state: GameState, message: string): GameState {
  return addLog(state, "event", "系统", message, [], true);
}

function addItem(state: GameState, itemId: ItemId, amount: number): GameState {
  return {
    ...state,
    inventory: { ...state.inventory, [itemId]: Math.max(0, state.inventory[itemId] + amount) },
  };
}

function spendItems(state: GameState, cost: Partial<Record<ItemId, number>>): GameState {
  const inventory = { ...state.inventory };
  Object.entries(cost).forEach(([itemId, amount]) => {
    inventory[itemId as ItemId] -= amount ?? 0;
  });
  return { ...state, inventory };
}

function createLegacyPrices(): TradePrices {
  return {
    commonFish: randomInt(2, 5),
    rareFish: randomInt(8, 15),
    mysteryFish: randomInt(30, 60),
  };
}

export function createFishPrices() {
  return Object.fromEntries(fishList.map((fish) => [fish.id, Math.max(1, Math.round(fish.basePrice * (randomInt(80, 150) / 100)))]));
}

function describeMissingItems(state: GameState, cost: Partial<Record<ItemId, number>>, coins = 0) {
  const missing = Object.entries(cost)
    .map(([itemId, amount]) => {
      const id = itemId as ItemId;
      const need = amount ?? 0;
      const owned = state.inventory[id];
      return owned >= need ? "" : `${itemNames[id]} x${need - owned}`;
    })
    .filter(Boolean);

  if (state.coins < coins) missing.push(`贝壳币 x${coins - state.coins}`);
  return missing;
}

function formatMissingItems(state: GameState, cost: Partial<Record<ItemId, number>>) {
  return Object.entries(cost)
    .map(([itemId, amount]) => {
      const id = itemId as ItemId;
      const need = amount ?? 0;
      const owned = state.inventory[id] ?? 0;
      return owned >= need ? "" : `${itemNames[id]} ×${need - owned}`;
    })
    .filter(Boolean);
}

function getFishCandidates(state: GameState, recipe: Recipe) {
  if (!recipe.fishCount) return [];

  const allowedRarities = recipe.rareFishOnly ? ["Rare", "Epic", "Legendary"] : ["Common", "Uncommon"];
  const candidates: Fish[] = [];

  fishList
    .filter((fishItem) => (recipe.fishIds?.length ? recipe.fishIds.includes(fishItem.id) : allowedRarities.includes(fishItem.rarity)))
    .sort((a, b) => a.basePrice - b.basePrice)
    .forEach((fishItem) => {
      const count = state.fishCollection[fishItem.id]?.count ?? 0;
      for (let i = 0; i < count; i += 1) candidates.push(fishItem);
    });

  return candidates;
}

function getEffectiveRecipeCost(state: GameState, recipe: Recipe) {
  const cost = { ...recipe.fixedCost };
  const grillHelps = state.equipment.includes("grill") && ["grilled-fish", "grilled-fish-skewer", "seafood-skewer"].includes(recipe.id);
  if (grillHelps && cost.wood) cost.wood = Math.max(0, cost.wood - 1);
  return cost;
}

function getRecipeById(recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId);
}

export function getRecipeStatus(state: GameState, recipe: Recipe) {
  const unlocked = !recipe.unlockDay || state.day >= recipe.unlockDay;
  const missing = formatMissingItems(state, getEffectiveRecipeCost(state, recipe));
  const fishCandidates = getFishCandidates(state, recipe);
  const needFish = recipe.fishCount ?? 0;

  if (fishCandidates.length < needFish) {
    const fishNeed = recipe.fishIds?.length
      ? recipe.fishIds.map((id) => fishList.find((fishItem) => fishItem.id === id)?.name ?? "指定鱼").join(" / ")
      : recipe.rareFishOnly
        ? "Rare以上鱼"
        : "Common/Uncommon鱼";
    missing.push(`${fishNeed} ×${needFish - fishCandidates.length}`);
  }

  return {
    canCook: unlocked && missing.length === 0,
    missing,
    selectedFish: fishCandidates.slice(0, needFish),
    unlocked,
    unlockHint: recipe.unlockHint,
    effectiveCost: getEffectiveRecipeCost(state, recipe),
  };
}

export function canCookRecipe(state: GameState, recipe: Recipe) {
  return getRecipeStatus(state, recipe).canCook;
}

export function canCookAnyRecipe(state: GameState) {
  return recipes.some((recipe) => canCookRecipe(state, recipe));
}

export function hasEdibleFood(state: GameState) {
  return foodItems.some((food) => (state.inventory[food.id] ?? 0) > 0);
}

function getLowestOwnedFish(state: GameState, predicate: (fish: Fish) => boolean) {
  return fishList
    .filter((fishItem) => predicate(fishItem) && (state.fishCollection[fishItem.id]?.count ?? 0) > 0)
    .sort((a, b) => a.basePrice - b.basePrice)[0];
}

export function getCatFeedOptions(state: GameState): CatFeedOption[] {
  const commonFish = getLowestOwnedFish(state, (fishItem) => fishItem.rarity === "Common" || fishItem.rarity === "Uncommon");
  const shrimp = fishList.find((fishItem) => fishItem.id === "clear-shrimp" && (state.fishCollection[fishItem.id]?.count ?? 0) > 0);
  const rareFish = getLowestOwnedFish(state, (fishItem) => fishItem.rarity === "Rare" || fishItem.rarity === "Epic" || fishItem.rarity === "Legendary");
  return [
    commonFish && { id: "common-fish", label: commonFish.name, emoji: commonFish.emoji, catSatiety: 15, catIntimacy: 2, catMood: 0, playerMood: 2, fishIds: [commonFish.id] },
    shrimp && { id: "shrimp", label: shrimp.name, emoji: shrimp.emoji, catSatiety: 10, catIntimacy: 2, catMood: 0, playerMood: 2, fishIds: [shrimp.id] },
    rareFish && { id: "rare-fish", label: rareFish.name, emoji: rareFish.emoji, catSatiety: 20, catIntimacy: 3, catMood: 4, playerMood: 3, fishIds: [rareFish.id] },
    (state.inventory.cannedFood ?? 0) > 0 && { id: "canned-food", label: itemNames.cannedFood, emoji: itemEmoji.cannedFood, catSatiety: 25, catIntimacy: 4, catMood: 2, playerMood: 2, itemId: "cannedFood" as ItemId },
    (state.inventory.fishSoup ?? 0) > 0 && { id: "fish-soup", label: itemNames.fishSoup, emoji: itemEmoji.fishSoup, catSatiety: 20, catIntimacy: 2, catMood: 5, playerMood: 2, itemId: "fishSoup" as ItemId },
    (state.inventory.grilledFish ?? 0) > 0 && { id: "grilled-fish", label: itemNames.grilledFish, emoji: itemEmoji.grilledFish, catSatiety: 20, catIntimacy: 2, catMood: 5, playerMood: 2, itemId: "grilledFish" as ItemId },
  ].filter(Boolean) as CatFeedOption[];
}

function weightedRarity(state: GameState): FishRarity {
  const weights: Record<FishRarity, number> = {
    Common: 55,
    Uncommon: 25,
    Rare: 14,
    Epic: 5,
    Legendary: 1,
  };

  if (state.talent === "fishing") {
    weights.Common -= 6;
    weights.Rare += 4;
    weights.Epic += 1.5;
    weights.Legendary += 0.5;
  }
  if (state.equipment.includes("sturdyRod")) {
    weights.Common -= 4;
    weights.Uncommon += 3;
    weights.Rare += 1;
  }
  if (state.equipment.includes("advancedRod") || state.equipment.includes("advancedRodItem")) {
    weights.Common -= 7;
    weights.Uncommon -= 2;
    weights.Rare += 5;
    weights.Epic += 3;
    weights.Legendary += 1;
  }
  if (state.equipment.includes("goldenRod")) {
    weights.Common -= 10;
    weights.Uncommon -= 3;
    weights.Rare += 4;
    weights.Epic += 6;
    weights.Legendary += 3;
  }

  if (state.weather === "晴天") weights.Common += 6;
  if (state.weather === "阴天") weights.Uncommon += 5;
  if (state.weather === "暴雨") {
    weights.Rare += 4;
    weights.Epic += 2;
    weights.Common -= 5;
  }
  if (state.weather === "大雾") {
    weights.Legendary += 1.5;
    weights.Epic += 1;
    weights.Common -= 3;
  }

  const entries = Object.entries(weights).map(([rarity, weight]) => [rarity as FishRarity, Math.max(0.5, weight)] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return "Common";
}

function pickFish(state: GameState, rarity = weightedRarity(state)) {
  const candidates = fishList.filter((fish) => fish.rarity === rarity);
  const weatherMatched = candidates.filter((fish) => fish.weatherHint?.includes(state.weather));
  return pick(weatherMatched.length && Math.random() < 0.65 ? weatherMatched : candidates);
}

function grantFishDexRewards(state: GameState): GameState {
  const discovered = fishList.filter((fishItem) => state.fishCollection[fishItem.id]?.discovered).length;
  const completion = Math.floor((discovered / fishList.length) * 100);
  const claimed = new Set(state.fishDexRewardsClaimed ?? []);
  let next = state;

  [25, 50, 75, 100].forEach((milestone) => {
    if (completion < milestone || claimed.has(milestone)) return;
    claimed.add(milestone);
    next = { ...next, fishDexRewardsClaimed: Array.from(claimed).sort((a, b) => a - b) };
    if (milestone === 25) {
      next = addLog({ ...next, coins: next.coins + 20 }, "discovery", "图鉴奖励", "鱼类图鉴完成度达到 25%，获得 20 贝壳币。", ["+20 贝壳币"], true);
    } else if (milestone === 50) {
      next = addLog(addItem(next, "commonCrate", 1), "discovery", "图鉴奖励", "鱼类图鉴完成度达到 50%，获得普通补给包 x1。", ["普通补给包 x1"], true);
    } else if (milestone === 75) {
      next = addLog(addItem(next, "premiumCrate", 1), "discovery", "图鉴奖励", "鱼类图鉴完成度达到 75%，获得高级补给包 x1。", ["高级补给包 x1"], true);
    } else {
      next = addLog(addItem({ ...next, coins: next.coins + 100 }, "luckyShell", 1), "discovery", "图鉴大师", "鱼类图鉴 100% 完成！获得 Legendary 称号「星潮收藏家」、幸运贝壳 x1 和 100 贝壳币。", ["星潮收藏家", "幸运贝壳 x1", "+100 贝壳币"], true, true);
    }
  });

  return next;
}

function addFish(state: GameState, fish: Fish, amount: number) {
  const current = state.fishCollection[fish.id] ?? { discovered: false, count: 0 };
  const isNew = !current.discovered;
  const fishCollection = {
    ...state.fishCollection,
    [fish.id]: {
      discovered: true,
      count: current.count + amount,
      firstCaughtDay: current.firstCaughtDay ?? state.day,
    },
  };

  return {
    state: isNew ? grantFishDexRewards({ ...state, fishCollection, newestFishId: fish.id }) : { ...state, fishCollection },
    isNew,
  };
}

export function getUpgradeCost(state: GameState) {
  const rawCost = upgradeRequirements[state.boatLevel] ?? {};
  const itemCost: Partial<Record<ItemId, number>> = {};

  Object.entries(rawCost).forEach(([key, value]) => {
    if (key !== "coins") itemCost[key as ItemId] = state.talent === "crafting" ? Math.ceil((value ?? 0) * 0.8) : value;
  });

  return {
    items: itemCost,
    coins: state.talent === "crafting" ? Math.ceil((rawCost.coins ?? 0) * 0.8) : rawCost.coins ?? 0,
  };
}

export function getMissingRequirements(state: GameState, cost: Partial<Record<ItemId, number>>, coins = 0) {
  return describeMissingItems(state, cost, coins);
}

export function canUpgradeBoat(state: GameState) {
  if (state.boatLevel >= 4) return false;
  const cost = getUpgradeCost(state);
  return describeMissingItems(state, cost.items, cost.coins).length === 0;
}

export function canCookHotpot(state: GameState) {
  const hotpot = getRecipeById("drift-hotpot");
  return hotpot ? canCookRecipe(state, hotpot) : false;
}

export function hasFishToSell(state: GameState) {
  return Object.values(state.fishCollection).some((entry) => entry.count > 0);
}

export function getSurvivalInfo(state: GameState) {
  const phase = state.day <= 3 ? "新手安全期" : state.day <= 7 ? "适应期" : "正式求生期";
  const nextDisasterIn = state.day < 7 ? 7 - state.day : (7 - ((state.day - 7) % 7)) % 7;
  const hpRate = state.boatHp / state.boatMaxHp;
  const hungerState = state.hunger >= 60 ? "正常" : state.hunger >= 30 ? "饥饿" : state.hunger >= 10 ? "虚弱" : "濒危";
  const moodState = state.mood >= 60 ? "正常" : state.mood >= 30 ? "低落" : state.mood >= 10 ? "崩溃边缘" : "精神崩溃风险";
  const boatState = hpRate >= 0.7 ? "稳定" : hpRate >= 0.4 ? "受损" : state.boatHp > 0 ? "严重受损" : "沉没";
  const danger = state.day <= 3 ? "低" : nextDisasterIn <= 2 && state.day >= 5 ? "高" : state.day <= 7 ? "中" : "中";
  return { phase, nextDisasterIn, danger, hungerState, moodState, boatState };
}

export function startGame(talent: TalentId, catType: CatType = "black"): GameState {
  const cat = createCatState(catType);
  const baseState = createInitialState();
  const state = { ...baseState, cat, mood: clamp(baseState.mood + (cat.type === "black" ? 3 : 0)) };
  return addLog({ ...state, started: true, talent, tradePrices: createLegacyPrices(), fishPrices: createFishPrices(), shopStock: createShopStock(1) }, "event", "潮汐系统", "潮汐系统启动，今天的漂流生活开始了。", [], true);
}

export function fish(state: GameState): GameState {
  if (state.hunger <= 0) return addLog(state, "warning", "体力不足", "你饿得头晕，先找点吃的再钓鱼吧。");

  const netBonus = state.equipment.includes("fishingNet") && Math.random() < 0.35 ? 2 : 1;
  const amount = state.hunger < 30 ? 1 : netBonus;
  const caught = pickFish(state);
  const result = addFish({ ...state, hunger: clamp(state.hunger - 5) }, caught, amount);
  let next = addLog(result.state, "fishing", "钓鱼", `你钓到了「${caught.name}」x${amount}。`, [`${caught.emoji} ${caught.name} x${amount}`], caught.rarity === "Epic" || caught.rarity === "Legendary");

  if (result.isNew) {
    next = addLog(next, "discovery", "新发现", `首次钓到「${caught.name}」！已加入钓鱼图鉴。`, [caught.rarity], true, true);
  }

  if (state.cat?.type === "cow" && Math.random() < 0.2) {
    next = updateCat({ ...next, mood: clamp(next.mood + 1) }, { todayEvent: `${state.cat.name} 看见鱼篓晃了晃尾巴。` });
    next = addLog(next, "event", "猫猫伙伴", `${state.cat.emoji} ${state.cat.name} 对今天的鱼获很满意，你的 Mood +1。`, ["Mood +1"]);
  }

  return next;
}

export function salvage(state: GameState): GameState {
  if (state.hunger <= 0) return addLog(state, "warning", "体力不足", "你没有力气打捞了，肚子正在抗议。");

  const loot = pick([
    ["wood", randomInt(2, 5)],
    ["plastic", randomInt(1, 4)],
    ["rope", randomInt(1, 2)],
    ["scrap", 1],
    ["water", 1],
    ["veggiePack", 1],
    ["meatSlices", 1],
  ] as [ItemId, number][]);

  let next = addItem({ ...state, hunger: clamp(state.hunger - 4), mood: clamp(state.mood + 1) }, loot[0], loot[1]);
  const rewards = [`${itemNames[loot[0]]} x${loot[1]}`];
  if (state.equipment.includes("waterproofBackpack") && Math.random() < 0.28) {
    const extra = pick(["wood", "plastic", "rope", "tape"] as ItemId[]);
    next = addItem(next, extra, 1);
    rewards.push(`${itemNames[extra]} x1`);
    next = addLog(next, "salvage", "防水背包", "防水背包多护住了一件漂流物。", [`${itemNames[extra]} x1`]);
  }
  return addLog(next, "salvage", "打捞", `你从漂流木箱里找到了${itemNames[loot[0]]} x${loot[1]}。`, rewards);
}

function rollCardRarity(state: GameState, premium: boolean): Rarity {
  const roll = Math.random();
  const lucky = state.talent === "lucky" ? 0.08 : 0;

  if (premium) {
    if (roll < 0.1 + lucky) return "Legendary";
    if (roll < 0.35 + lucky) return "Epic";
    if (roll < 0.8 + lucky) return "Rare";
    return "Common";
  }

  if (roll < 0.03 + lucky / 2) return "Legendary";
  if (roll < 0.13 + lucky) return "Epic";
  if (roll < 0.38 + lucky) return "Rare";
  return "Common";
}

export function openCrate(state: GameState, crate: "commonCrate" | "premiumCrate" = "commonCrate"): GameState {
  if (state.inventory[crate] <= 0) {
    return addLog(state, "crate", "补给包", "你翻了翻背包，但没有可以打开的补给包。");
  }

  const drops = randomInt(crate === "premiumCrate" ? 4 : 2, crate === "premiumCrate" ? 7 : 4);
  const luckRoll = Math.random();
  const luck = luckRoll > 0.96 ? "欧皇" : luckRoll > 0.82 ? "大好运" : luckRoll > 0.62 ? "好运" : luckRoll > 0.38 ? "小幸运" : "普通";
  let next = addItem(state, crate, -1);
  const rewards: string[] = [];
  let bestRarity: Rarity = "Common";

  for (let i = 0; i < drops; i += 1) {
    const rarity = rollCardRarity(state, crate === "premiumCrate");
    const card = pick(cards.filter((item) => item.rarity === rarity));
    bestRarity = ["Common", "Rare", "Epic", "Legendary"].indexOf(rarity) > ["Common", "Rare", "Epic", "Legendary"].indexOf(bestRarity) ? rarity : bestRarity;
    if (card.itemId && card.amount) {
      next = addItem(next, card.itemId, card.amount);
      rewards.push(`${card.emoji} ${card.name} x${card.amount}`);
    }
    if (card.fishRarity && card.amount) {
      for (let j = 0; j < card.amount; j += 1) {
        const fishReward = pick(fishList.filter((fishItem) => fishItem.rarity === card.fishRarity));
        const result = addFish(next, fishReward, 1);
        next = result.state;
        rewards.push(`${fishReward.emoji} ${fishReward.name}`);
        if (result.isNew) next = addLog(next, "discovery", "新发现", `补给包里发现了「${fishReward.name}」！已加入钓鱼图鉴。`, [fishReward.rarity], true, true);
      }
    }
    if (card.equipment && !next.equipment.includes(card.equipment)) {
      next = { ...next, equipment: [...next.equipment, card.equipment] };
      rewards.push(card.name);
    }
    if (card.furniture && !next.furniture.includes(card.furniture)) {
      next = { ...next, furniture: [...next.furniture, card.furniture] };
      rewards.push(card.furniture);
    }
  }

  return addLog(
    { ...next, lastCrateType: crate, lastCrateDrops: rewards, lastCrateLuck: luck, mood: clamp(next.mood + (bestRarity === "Legendary" ? 12 : bestRarity === "Epic" ? 8 : 3)) },
    "crate",
    crate === "premiumCrate" ? "高级补给包" : "普通补给包",
    `打开${itemNames[crate]}，本次运气：${luck}，获得 ${rewards.length} 件补给。`,
    rewards,
    bestRarity === "Epic" || bestRarity === "Legendary",
  );
}

export function sellFish(state: GameState, fishId: string): GameState {
  const fishItem = fishList.find((item) => item.id === fishId);
  const entry = state.fishCollection[fishId];
  if (!fishItem || !entry || entry.count <= 0) return addLog(state, "warning", "没有库存", "背包里没有这种鱼可以出售。");

  const bonus = state.talent === "trading" ? 1.2 : 1;
  const price = state.fishPrices[fishId] ?? fishItem.basePrice;
  const earned = Math.floor(entry.count * price * bonus);
  const fishCollection = { ...state.fishCollection, [fishId]: { ...entry, count: 0 } };

  return addLog({ ...state, fishCollection, coins: state.coins + earned }, "trade", "出售鱼获", `卖出「${fishItem.name}」x${entry.count}，获得 ${earned} 贝壳币。`, [`+${earned} 贝壳币`]);
}

export function sellAllFish(state: GameState): GameState {
  let earned = 0;
  let count = 0;
  const fishCollection = { ...state.fishCollection };
  const bonus = state.talent === "trading" ? 1.2 : 1;

  fishList.forEach((fishItem) => {
    const entry = fishCollection[fishItem.id];
    if (!entry || entry.count <= 0) return;
    earned += Math.floor(entry.count * (state.fishPrices[fishItem.id] ?? fishItem.basePrice) * bonus);
    count += entry.count;
    fishCollection[fishItem.id] = { ...entry, count: 0 };
  });

  if (count === 0) return addLog(state, "warning", "没有鱼获", "今天还没有可以出售的鱼。");
  return addLog({ ...state, fishCollection, coins: state.coins + earned }, "trade", "出售全部鱼获", `卖出全部鱼获 x${count}，获得 ${earned} 贝壳币。`, [`+${earned} 贝壳币`], true);
}

export function sellSelectedFish(state: GameState, selections: Record<string, number>): GameState {
  const bonus = state.talent === "trading" ? 1.2 : 1;
  const fishCollection = { ...state.fishCollection };
  const sold: string[] = [];
  let earned = 0;
  let soldCount = 0;
  let soldRareFish = false;

  fishList.forEach((fishItem) => {
    const requested = Math.floor(selections[fishItem.id] ?? 0);
    const entry = fishCollection[fishItem.id];
    if (!entry || entry.count <= 0 || requested <= 0) return;

    const amount = Math.min(requested, entry.count);
    const price = state.fishPrices[fishItem.id] ?? fishItem.basePrice;
    earned += Math.floor(amount * price * bonus);
    soldCount += amount;
    soldRareFish = soldRareFish || fishItem.rarity === "Rare" || fishItem.rarity === "Epic" || fishItem.rarity === "Legendary";
    sold.push(`${fishItem.name} ×${amount}`);
    fishCollection[fishItem.id] = { ...entry, count: entry.count - amount };
  });

  if (soldCount === 0) return addLog(state, "warning", "海上交易", "请选择至少一种鱼获。");

  const message = `卖出${sold.join("、")}，获得 ${earned} 贝壳币。${soldRareFish ? "希望你不是手滑。" : ""}`;
  return addLog({ ...state, fishCollection, coins: state.coins + earned }, "trade", "出售鱼获", message, [`+${earned} 贝壳币`], soldRareFish);
}

export function buyItem(state: GameState, itemId: "commonCrate" | "premiumCrate" | "water" | "wood"): GameState {
  const prices = { commonCrate: 30, premiumCrate: 100, water: 10, wood: 5 };
  const price = prices[itemId];

  if (state.coins < price) return addLog(state, "warning", "贝壳币不足", `还差 ${price - state.coins} 贝壳币，买不起${itemNames[itemId]}。`);

  const next = addItem({ ...state, coins: state.coins - price }, itemId, 1);
  return addLog(next, "trade", "购买物资", `你买下了 ${itemNames[itemId]} x1。`, [itemNames[itemId]]);
}

export function buyShopItem(state: GameState, itemId: ItemId): GameState {
  const shopItem = state.shopStock.find((item) => item.id === itemId);
  if (!shopItem || shopItem.quantity <= 0) return addLog(state, "warning", "潮汐商店", "这件商品已经卖完了。");
  const discount = state.equipment.includes("shopPermit") || state.inventory.merchantCoupon > 0 ? 0.9 : 1;
  const price = Math.ceil(shopItem.price * discount);
  if (state.coins < price) return addLog(state, "warning", "贝壳币不足", `还差 ${price - state.coins} 贝壳币，买不起${itemNames[itemId]}。`);
  const shopStock = state.shopStock.map((item) => item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item);
  let next = addItem({ ...state, coins: state.coins - price, shopStock }, itemId, 1);
  if (["sturdyRod", "advancedRodItem", "fishingNet", "solarPurifier", "waterproofBackpack", "autoFisher"].includes(itemId) && !next.equipment.includes(itemId)) {
    next = { ...next, equipment: [...next.equipment, itemId] };
  }
  return addLog(next, "trade", "潮汐商店", `买下${itemNames[itemId]} x1，花费 ${price} 贝壳币。`, [`${itemNames[itemId]} x1`]);
}

export function cookRecipe(state: GameState, recipeId: string): GameState {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return addLog(state, "warning", "未知食谱", "潮湿的菜谱糊成一团，看不清要做什么。");

  const status = getRecipeStatus(state, recipe);
  if (!status.unlocked) return addLog(state, "warning", "菜谱未解锁", `${recipe.unlockHint ?? "这道料理还没解锁"}，暂时不能制作${recipe.name}。`);
  if (!status.canCook) {
    return addLog(state, "warning", "材料不足", `还缺少${status.missing.join("、")}，无法制作${recipe.name}。`);
  }

  let next = spendItems(state, getEffectiveRecipeCost(state, recipe));
  const fishCollection = { ...next.fishCollection };
  status.selectedFish.forEach((fishItem) => {
    const entry = fishCollection[fishItem.id];
    if (!entry) return;
    fishCollection[fishItem.id] = { ...entry, count: Math.max(0, entry.count - 1) };
  });

  next = addItem({ ...next, fishCollection }, recipe.output, 1);

  const usedFishNames = status.selectedFish.map((fishItem) => `「${fishItem.name}」`);
  const message = usedFishNames.length
    ? `你用${usedFishNames.join("和")}做了一份${recipe.name}。`
    : `你做好了一份${recipe.name}，海上小屋飘起了香味。`;

  return addLog(next, "cooking", "料理", message, [`${recipe.emoji} ${recipe.name} x1`], recipe.rarity === "Epic" || recipe.rarity === "Legendary");
}

export function cookHotpot(state: GameState): GameState {
  return cookRecipe(state, "drift-hotpot");
}

export function eatFood(state: GameState, foodId: ItemId): GameState {
  const food = foodItems.find((item) => item.id === foodId);
  if (!food) return addLog(state, "warning", "进食", "这个东西怎么看都不像能吃的。");
  if ((state.inventory[food.id] ?? 0) <= 0) return addLog(state, "warning", "进食", "背包里没有可以吃的食物。");
  if (state.hunger >= 95) return addLog(state, "warning", "进食", "你现在还不饿，决定先把食物存起来。");

  const next = addItem(state, food.id, -1);
  const message =
    food.id === "fishSoup"
      ? `你喝下鱼汤，胃里暖暖的。Hunger +${food.hunger}，Mood +${food.mood}。`
      : `你吃掉了${food.name}。Hunger +${food.hunger}，Mood +${food.mood}。`;

  const hotpotTableBonus = state.furniture.includes("海上火锅桌") && food.mood > 0 ? 1 : 0;

  return addLog(
    { ...next, hunger: clamp(next.hunger + food.hunger), mood: clamp(next.mood + food.mood + hotpotTableBonus) },
    "cooking",
    "进食",
    hotpotTableBonus ? `${message} 海上火锅桌让这顿饭更有仪式感，Mood 额外 +1。` : message,
    [`Hunger +${food.hunger}`, `Mood +${food.mood + hotpotTableBonus}`],
  );
}

export function noteNoFood(state: GameState): GameState {
  return addLog(state, "warning", "进食", "你翻了翻背包，但没有可以吃的东西。");
}

export function feedCat(state: GameState, optionId: string): GameState {
  const option = getCatFeedOptions(state).find((item) => item.id === optionId);
  const cat = state.cat ?? createCatState("black");
  if (!option) return addLog(state, "warning", "猫猫", `${cat.name} 眨了眨眼，但背包里没有适合喂它的食物。`);

  let next = state;
  if (option.itemId) {
    if ((next.inventory[option.itemId] ?? 0) <= 0) return addLog(next, "warning", "猫猫", `${cat.name} 想吃 ${option.label}，但背包里已经没有了。`);
    next = addItem(next, option.itemId, -1);
  } else if (option.fishIds?.length) {
    const fishId = option.fishIds[0];
    const entry = next.fishCollection[fishId];
    if (!entry || entry.count <= 0) return addLog(next, "warning", "猫猫", `${cat.name} 嗅了嗅鱼篓，但没有找到 ${option.label}。`);
    next = {
      ...next,
      fishCollection: {
        ...next.fishCollection,
        [fishId]: { ...entry, count: entry.count - 1 },
      },
    };
  }

  const orangeBonus = cat.type === "orange" ? 1 : 0;
  next = updateCat({ ...next, mood: clamp(next.mood + option.playerMood) }, {
    satiety: cat.satiety + option.catSatiety + (cat.type === "orange" ? 5 : 0),
    intimacy: cat.intimacy + option.catIntimacy + orangeBonus,
    mood: cat.mood + option.catMood + orangeBonus,
    todayEvent: `${cat.name} 刚刚吃了 ${option.label}，看起来很满足。`,
  });

  return addLog(
    next,
    "event",
    "猫猫伙伴",
    `${cat.emoji} ${cat.name} 吃掉了 ${option.label} x1。猫猫饱腹 +${option.catSatiety}${cat.type === "orange" ? "，橘猫加成 +5" : ""}，亲密度 +${option.catIntimacy + orangeBonus}。你的心情 +${option.playerMood}。`,
    [`${option.label} x1`, `猫饱腹 +${option.catSatiety}`, `亲密 +${option.catIntimacy + orangeBonus}`, `Mood +${option.playerMood}`],
    true,
  );
}

export function petCat(state: GameState): GameState {
  const cat = state.cat ?? createCatState("black");
  if (cat.lastPetDay === state.day) return addLog(state, "warning", "猫猫互动", `${cat.name} 今天已经被摸得很舒服了，先让它自己晒会儿太阳吧。`);

  const next = updateCat({ ...state, mood: clamp(state.mood + 1) }, {
    mood: cat.mood + 5,
    intimacy: cat.intimacy + 1,
    lastPetDay: state.day,
    todayEvent: `${cat.name} 被轻轻摸了摸，开心地眯起眼。`,
  });

  return addLog(next, "event", "猫猫互动", `${cat.emoji} 你轻轻抚摸了 ${cat.name}。猫心情 +5，亲密 +1，你的 Mood +1。`, ["猫心情 +5", "猫亲密 +1", "Mood +1"], true);
}

export function playWithCat(state: GameState): GameState {
  const cat = state.cat ?? createCatState("black");
  if (cat.lastPlayDay === state.day) return addLog(state, "warning", "猫猫互动", `${cat.name} 今天已经玩累了，正趴在木筏边休息。`);

  const next = updateCat({ ...state, mood: clamp(state.mood + 2) }, {
    mood: cat.mood + 8,
    intimacy: cat.intimacy + 2,
    lastPlayDay: state.day,
    todayEvent: `${cat.name} 玩得很开心，尾巴晃来晃去。`,
  });

  return addLog(next, "event", "猫猫互动", `${cat.emoji} 你陪 ${cat.name} 玩了一会儿。猫心情 +8，亲密 +2，你的 Mood +2。`, ["猫心情 +8", "猫亲密 +2", "Mood +2"], true);
}

function addCatFoundFish(state: GameState, fishId: string) {
  const fishItem = fishList.find((item) => item.id === fishId) ?? fishList[0];
  const result = addFish(state, fishItem, 1);
  return {
    state: result.state,
    reward: `${fishItem.emoji} ${fishItem.name} x1`,
    eventText: `叼来了「${fishItem.name}」x1。`,
    important: result.isNew,
  };
}

function triggerCatEvent(state: GameState, source: "explore" | "daily", stormy = false): GameState {
  const cat = state.cat ?? createCatState("black");
  const choices = [
    { id: "material", weight: 24 + (cat.type === "calico" ? 18 : 0) },
    { id: "coins", weight: 18 + (cat.type === "calico" ? 8 : 0) },
    { id: "ticket", weight: 4 + (cat.type === "calico" ? 5 : 0) },
    { id: "fish", weight: 18 + (cat.type === "cow" ? 4 : 0) },
    { id: "mood", weight: 16 + (cat.type === "cow" ? 12 : 0) },
    { id: "mystery", weight: 6 + (cat.type === "black" ? 16 : 0) },
    { id: "hungry", weight: cat.type === "orange" && cat.satiety < 55 ? 12 : 3 },
    { id: "nothing", weight: 18 },
  ];

  if (stormy && Math.random() < (cat.type === "black" && cat.intimacy > 35 ? 0.22 : 0.45)) {
    const next = updateCat(state, { mood: cat.mood - 5, todayEvent: `${cat.name} 被坏天气吓了一跳，躲到补给箱旁边。` });
    return addLog(next, "event", "猫猫伙伴", `${cat.emoji} ${cat.name} 有点害怕，猫心情 -5。`, ["猫心情 -5"], true);
  }

  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let roll = Math.random() * total;
  const selected = choices.find((choice) => {
    roll -= choice.weight;
    return roll <= 0;
  }) ?? choices[choices.length - 1];

  let next = state;
  let message = "";
  let rewards: string[] = [];
  let important = false;

  if (selected.id === "material") {
    const found = pick(["wood", "rope", "plastic", "scrap"] as ItemId[]);
    const amount = found === "scrap" ? 1 : randomInt(1, 2);
    next = addItem(next, found, amount);
    message = `${cat.name} 翻找木筏角落，找到了${itemNames[found]} x${amount}。`;
    rewards = [`${itemNames[found]} x${amount}`];
  } else if (selected.id === "coins") {
    const amount = cat.type === "calico" ? randomInt(4, 8) : randomInt(2, 6);
    next = { ...next, coins: next.coins + amount };
    message = `${cat.name} 扒拉出 ${amount} 贝壳币。`;
    rewards = [`+${amount} 贝壳币`];
  } else if (selected.id === "ticket") {
    next = addItem(next, "furnitureTicket", 1);
    message = `${cat.name} 从补给箱底下拖出一张家具券。`;
    rewards = ["家具券 x1"];
    important = true;
  } else if (selected.id === "fish") {
    const fishResult = addCatFoundFish(next, Math.random() < 0.45 ? "clear-shrimp" : "tiny-minnow");
    next = fishResult.state;
    message = `${cat.name} ${fishResult.eventText}`;
    rewards = [fishResult.reward];
    important = fishResult.important;
  } else if (selected.id === "mood") {
    const moodGain = cat.type === "cow" ? 3 : 2;
    next = { ...next, mood: clamp(next.mood + moodGain) };
    message = cat.type === "black" ? `${cat.name} 夜间巡逻后安静地坐在你身边，像提前确认过海面很安全。` : `${cat.name} 趴在你旁边陪你看海。`;
    rewards = [`Mood +${moodGain}`];
  } else if (selected.id === "mystery") {
    const moodGain = cat.type === "black" ? 3 : 1;
    next = { ...next, mood: clamp(next.mood + moodGain) };
    message = `${cat.name} 盯着海面看了很久，像发现了什么潮汐秘密。`;
    rewards = [`Mood +${moodGain}`];
    important = cat.type === "black";
  } else if (selected.id === "hungry") {
    next = updateCat(next, { mood: cat.mood - 2 });
    message = `${cat.name} 蹭了蹭你的手，像是在提醒你它想吃鱼。`;
    rewards = ["猫心情 -2"];
  } else {
    message = `${cat.name} 认真翻找了很久，什么都没找到，但它真的很努力。`;
  }

  next = updateCat(next, {
    todayEvent: message,
    ...(source === "explore" ? { lastExploreDay: state.day } : {}),
  });

  return addLog(next, "event", source === "explore" ? "猫猫探索" : "猫猫伙伴", `${cat.emoji} ${message}`, rewards, important);
}

export function exploreWithCat(state: GameState): GameState {
  const cat = state.cat ?? createCatState("black");
  if (cat.lastExploreDay === state.day) return addLog(state, "warning", "猫猫探索", `${cat.name} 今天已经认真翻找过了，暂时没有新的发现。`);
  return triggerCatEvent(state, "explore");
}

export function upgradeBoat(state: GameState): GameState {
  if (state.boatLevel >= 4) return addLog(state, "warning", "最高等级", "你的海上小商铺已经是 Demo 里的最高等级了。");

  const cost = getUpgradeCost(state);
  const missing = describeMissingItems(state, cost.items, cost.coins);
  if (missing.length) return addLog(state, "warning", "材料不足", `升级材料还缺：${missing.join("、")}。`);

  const nextLevel = (state.boatLevel + 1) as BoatLevel;
  const next = spendItems({ ...state, coins: state.coins - cost.coins }, cost.items);
  return addLog(
    { ...next, boatLevel: nextLevel, boatMaxHp: boatHpByLevel[nextLevel], boatHp: Math.min(boatHpByLevel[nextLevel], next.boatHp + Math.round(boatHpByLevel[nextLevel] * 0.35)), mood: clamp(next.mood + 12) },
    "upgrade",
    "载具升级",
    `载具升级为「${nextLevel}级 ${nextLevel === 4 ? "海上小商铺" : nextLevel === 3 ? "小型漂流屋" : "加固木筏"}」！`,
    ["Boat Max HP 提升", "Boat HP 部分恢复", "Mood +12"],
    true,
  );
}

export function repairBoat(state: GameState): GameState {
  const hasToolbox = state.inventory.toolbox > 0;
  const cost: Partial<Record<ItemId, number>> = hasToolbox ? { wood: 2 } : { wood: 3, scrap: 1 };
  const missing = describeMissingItems(state, cost);

  if (state.boatHp >= state.boatMaxHp) return addLog(state, "warning", "无需修理", "载具耐久已经是满的，先把材料留着吧。");
  if (missing.length) return addLog(state, "warning", "材料不足", `修理载具还缺：${missing.join("、")}。`);

  const next = spendItems(state, cost);
  const repairValue = hasToolbox ? 32 : 20;
  return addLog({ ...next, boatHp: Math.min(next.boatMaxHp, next.boatHp + repairValue), mood: clamp(next.mood + 2) }, "upgrade", "修理载具", `你敲敲补补修好了载具。${hasToolbox ? "工具箱让修理更顺手。" : ""}`, [`Boat HP +${repairValue}`]);
}

export function placeInventoryFurniture(state: GameState, itemId: ItemId): GameState {
  const furnitureNames: Partial<Record<ItemId, string>> = {
    foldingChair: "折叠椅",
    shellLamp: "贝壳灯",
    waterproofMattress: "防水床垫",
    simpleToilet: "简易马桶",
    storageBox: "收纳箱",
  };
  const furniture = furnitureNames[itemId];
  if (!furniture) return addLog(state, "warning", "家具", "这个物品暂时不能布置。");
  if ((state.inventory[itemId] ?? 0) <= 0) return addLog(state, "warning", "家具", "背包里没有这件家具。");
  if (state.furniture.includes(furniture)) return addLog(state, "warning", "家具", `你已经布置过「${furniture}」了。`);
  const next = addItem(state, itemId, -1);
  return addLog({ ...next, furniture: [...next.furniture, furniture], mood: clamp(next.mood + 6) }, "furniture", "布置家具", `你布置了「${furniture}」，海上小家更舒服了。`, [furniture, "Mood +6"]);
}

export function removeFurniture(state: GameState, furniture: string): GameState {
  if (!state.furniture.includes(furniture)) return addLog(state, "warning", "家具", "这件家具还没有布置。");
  return addLog({ ...state, furniture: state.furniture.filter((item) => item !== furniture) }, "furniture", "收起家具", `你收起了「${furniture}」。`, [furniture]);
}

export function decorate(state: GameState): GameState {
  if (state.inventory.furnitureTicket <= 0) return addLog(state, "warning", "没有家具券", "需要 1 张家具券才能布置新家具。");

  const options = furniturePool.filter((item) => !state.furniture.includes(item));
  if (options.length === 0) return addLog(state, "furniture", "家具收集完成", "你的漂流小屋已经收集了所有 Demo 家具。", [], true);

  const furniture = pick(options);
  const next = addItem(state, "furnitureTicket", -1);
  return addLog({ ...next, furniture: [...next.furniture, furniture], mood: clamp(next.mood + 10) }, "furniture", "布置家具", `你布置了「${furniture}」，小屋更有生活感了。`, [furniture, "Mood +10"]);
}

function applyCatDay(state: GameState, stormy: boolean): GameState {
  const cat = state.cat ?? createCatState("black");
  let next = updateCat(state, {
    satiety: cat.satiety - 8,
    mood: cat.mood + (cat.satiety < 20 ? -8 : cat.mood > 70 ? 1 : 0),
    todayEvent: `${cat.name} 跟着木筏轻轻晃了一整天。`,
  });
  const currentCat = next.cat;

  if (stormy) {
    const loss = currentCat.intimacy >= 50 ? 2 : 5;
    next = updateCat(next, { mood: currentCat.mood - loss, todayEvent: `${currentCat.name} 被坏天气吓了一小跳。` });
    next = addLog(next, "event", "猫猫伙伴", `${currentCat.emoji} ${currentCat.name} 在坏天气里有点害怕，猫猫心情 -${loss}。`, [`猫心情 -${loss}`]);
  } else if (currentCat.mood > 70 && currentCat.satiety >= 20) {
    next = updateCat({ ...next, mood: clamp(next.mood + 1) }, { todayEvent: `${currentCat.name} 趴在你旁边睡着了。` });
    next = addLog(next, "event", "猫猫伙伴", `${currentCat.emoji} ${currentCat.name} 趴在你旁边睡觉，你的 Mood +1。`, ["Mood +1"]);
  }

  const catAfterMood = next.cat;
  if (catAfterMood.intimacy > 50 && Math.random() < 0.22) {
    const found = pick([
      ["wood", 1, "猫帮忙发现木板 x1"],
      ["rope", 1, "猫从补给箱旁边扒拉出绳子 x1"],
      ["coins", 3, "猫叼来 3 贝壳币"],
    ] as const);
    if (found[0] === "coins") next = { ...next, coins: next.coins + found[1] };
    else next = addItem(next, found[0], found[1]);
    next = updateCat(next, { todayEvent: found[2] });
    next = addLog(next, "event", "猫猫伙伴", `${catAfterMood.emoji} ${catAfterMood.name} ${found[2]}。`, [found[0] === "coins" ? "+3 贝壳币" : `${itemNames[found[0]]} x${found[1]}`], true);
  } else if (catAfterMood.type === "calico" && Math.random() < 0.18) {
    next = addItem(next, "plastic", 1);
    next = updateCat(next, { todayEvent: `${catAfterMood.name} 翻背包时找到了塑料 x1。` });
    next = addLog(next, "event", "猫猫伙伴", `${catAfterMood.emoji} ${catAfterMood.name} 好奇地翻背包，找到了 ${itemNames.plastic} x1。`, [`${itemNames.plastic} x1`]);
  } else if (catAfterMood.type === "black" && Math.random() < 0.12) {
    next = updateCat(next, { todayEvent: `${catAfterMood.name} 半夜巡逻，认真盯着海面。` });
    next = addLog(next, "event", "猫猫伙伴", `${catAfterMood.emoji} ${catAfterMood.name} 半夜巡逻，帮你提前发现了漂流瓶的方向。`, []);
  } else if (Math.random() < 0.18) {
    next = updateCat(next, { todayEvent: `${catAfterMood.name} 盯着海面看了很久，什么都没发生，但它很认真。` });
    next = addLog(next, "event", "猫猫伙伴", `${catAfterMood.emoji} ${catAfterMood.name} 盯着海面看了很久，什么都没发生，但它很认真。`, []);
  }

  if (next.cat.satiety < 20) {
    next = updateCat(next, { mood: next.cat.mood - 5, todayEvent: `${next.cat.name} 肚子有点空，今天不太想玩。` });
    next = addLog(next, "warning", "猫猫伙伴", `${next.cat.emoji} ${next.cat.name} 有点饿了，猫猫心情 -5。`, ["猫心情 -5"]);
  }

  if (Math.random() < (next.cat.type === "calico" ? 0.42 : next.cat.type === "black" ? 0.34 : 0.28)) {
    next = triggerCatEvent(next, "daily", stormy);
  }

  return next;
}

function consumeProtection(next: GameState, itemId: ItemId, label: string, rewards: string[]) {
  if ((next.inventory[itemId] ?? 0) <= 0) return { next, active: false };
  rewards.push(`${label}生效`);
  return { next: addItem(next, itemId, -1), active: true };
}

function applyDisaster(state: GameState, weather: Weather): GameState {
  let next = state;
  const rewards: string[] = [];
  let boatLoss = 0;
  let hungerLoss = 0;
  let moodLoss = 0;
  let catMoodLoss = 0;

  const boatShieldRate = next.boatLevel === 1 ? 1.15 : next.boatLevel === 2 ? 1 : next.boatLevel === 3 ? 0.78 : 0.58;
  if (weather === "暴雨") {
    boatLoss = 10;
    moodLoss = 5;
    catMoodLoss = 3;
    const tarp = consumeProtection(next, "tarp", "防水布", rewards);
    next = tarp.next;
    if (tarp.active || next.furniture.includes("防水床垫")) {
      boatLoss -= 5;
      moodLoss -= 3;
    }
    if ((tarp.active || next.equipment.includes("solarPurifier") || next.equipment.includes("waterPurifier")) && Math.random() < 0.65) {
      next = addItem(next, "water", 1);
      rewards.push("淡水 x1");
    }
  } else if (weather === "风暴") {
    boatLoss = 25 + (next.boatLevel <= 1 ? 10 : 0);
    catMoodLoss = 5;
    const tarp = consumeProtection(next, "tarp", "防水布", rewards);
    next = tarp.next;
    if (tarp.active) boatLoss -= 8;
    if ((next.inventory.wood ?? 0) > 0 && Math.random() < 0.45) {
      next = addItem(next, "wood", -1);
      rewards.push("损失木板 x1");
    }
    if ((next.inventory.rope ?? 0) > 0 && Math.random() < 0.3) {
      next = addItem(next, "rope", -1);
      rewards.push("损失绳子 x1");
    }
  } else if (weather === "寒潮") {
    hungerLoss = 10;
    moodLoss = 10;
    catMoodLoss = 5;
    const protectedByHome = next.inventory.lighter > 0 || next.furniture.includes("海上火锅桌") || next.furniture.includes("防水床垫") || next.furniture.includes("迷你温泉");
    if (protectedByHome) {
      hungerLoss -= 4;
      moodLoss -= 5;
      rewards.push("保暖物资生效");
    }
  } else if (weather === "高温") {
    hungerLoss = 15;
    moodLoss = 5;
    const usedWater = (next.inventory.water ?? 0) > 0;
    if (usedWater) {
      next = addItem(next, "water", -1);
      hungerLoss -= 7;
      rewards.push("消耗淡水 x1");
    }
    const shade = consumeProtection(next, "tarp", "防水布遮阳", rewards);
    next = shade.next;
    if (shade.active || (next.inventory.wetWipes ?? 0) > 0) moodLoss -= 3;
  } else if (weather === "巨浪") {
    boatLoss = 30;
    catMoodLoss = 4;
    if (next.boatLevel >= 3) boatLoss -= 10;
    else if (next.boatLevel === 2) boatLoss -= 5;
  }

  boatLoss = Math.max(0, Math.round(boatLoss * boatShieldRate));
  hungerLoss = Math.max(0, hungerLoss);
  moodLoss = Math.max(0, moodLoss);
  next = updateCat(next, { mood: next.cat.mood - catMoodLoss, todayEvent: `${next.cat.name} 被${weather}吓得躲进了小屋角落。` });
  next = {
    ...next,
    boatHp: Math.max(0, next.boatHp - boatLoss),
    hunger: clamp(next.hunger - hungerLoss),
    mood: clamp(next.mood - moodLoss),
  };

  const serious = weather === "巨浪" && next.boatHp / next.boatMaxHp < 0.4;
  return addLog(
    next,
    "warning",
    weather,
    `${weather}来袭！Boat HP -${boatLoss}${hungerLoss ? `，Hunger -${hungerLoss}` : ""}${moodLoss ? `，Mood -${moodLoss}` : ""}${catMoodLoss ? `，猫心情 -${catMoodLoss}` : ""}。${serious ? "船体已经严重受损，必须尽快修理！" : ""}`,
    [`Boat HP -${boatLoss}`, ...(hungerLoss ? [`Hunger -${hungerLoss}`] : []), ...(moodLoss ? [`Mood -${moodLoss}`] : []), ...(catMoodLoss ? [`猫心情 -${catMoodLoss}`] : []), ...rewards],
    true,
  );
}

export function endDay(state: GameState): GameState {
  if (state.gameOverReason) return state;
  const info = getSurvivalInfo(state);
  const disasterDay = state.day >= 7 && info.nextDisasterIn === 0;
  const nextWeather = disasterDay ? pick(disasterWeather) : pick(weatherList);
  const hungerDrop = state.day <= 3 ? 8 : state.day <= 7 ? 12 : 15;
  const moodExtra = state.hunger < 10 ? 12 : state.hunger < 30 ? 8 : state.hunger < 60 ? 3 : 0;
  const dailyFurnitureMood =
    (state.furniture.includes("迷你温泉") ? 2 : 0) +
    (state.furniture.includes("豪华沙发") ? 2 : 0) +
    (state.furniture.includes("防水床垫") ? 1 : 0);
  let next: GameState = {
    ...state,
    day: state.day + 1,
    weather: nextWeather,
    hunger: clamp(state.hunger - hungerDrop),
    mood: clamp(state.mood - (state.hunger <= 15 ? 12 : 5) - moodExtra + (state.boatLevel >= 3 ? 1 : 0) + dailyFurnitureMood),
    fishPrices: createFishPrices(),
    tradePrices: createLegacyPrices(),
    newestFishId: undefined,
    shopStock: state.day % 7 === 0 ? createShopStock(state.day + 1) : state.shopStock,
  };

  if (state.day % 7 === 0) next = addLog(next, "trade", "潮汐商店", "潮汐商店刷新了新的库存。");
  if (dailyFurnitureMood > 0) next = addLog(next, "furniture", "家具效果", `舒适家具让海上小家更安心，Mood +${dailyFurnitureMood}。`, [`Mood +${dailyFurnitureMood}`]);

  if (next.equipment.includes("waterPurifier") || next.equipment.includes("solarPurifier")) {
    next = addItem(next, "water", 1);
    next = addLog(next, "event", "自动净水器", "自动净水器安静工作了一夜。", ["淡水 x1"]);
  }
  if (next.equipment.includes("solarPurifier")) next = addLog(next, "event", "太阳能净水器", "白天积攒的阳光换成了一瓶淡水。", ["淡水 x1"]);
  if (next.equipment.includes("autoFisher") && Math.random() < 0.35) {
    const autoFish = pick(fishList.filter((fishItem) => fishItem.rarity === "Common"));
    const result = addFish(next, autoFish, 1);
    next = addLog(result.state, "fishing", "自动钓鱼器", `自动钓鱼器安静工作，钓到了「${autoFish.name}」x1。`, [`${autoFish.emoji} ${autoFish.name} x1`], result.isNew);
  }

  if (disasterDay) next = applyDisaster(next, nextWeather);
  else {
    const wear = randomInt(0, next.weather === "小雨" ? 3 : 2);
    if (wear > 0) next = addLog({ ...next, boatHp: Math.max(0, next.boatHp - wear) }, "event", "海上磨损", `海浪轻轻拍打木筏，Boat HP -${wear}。`, [`Boat HP -${wear}`]);
  }

  next = applyCatDay(next, disasterWeather.includes(nextWeather));

  const event = Math.random();
  if (event < 0.18) next = addLog(next, "event", "漂流瓶", "你发现漂流瓶，里面竟然有 20 贝壳币。", ["+20 贝壳币"]);
  else if (event < 0.54) next = addLog(addItem(next, "commonCrate", 1), "event", "友好商船", "遇到友好商船，获得普通补给包。", ["普通补给包 x1"]);
  else if (event < 0.72) next = addLog(addItem(next, "rope", 1), "salvage", "清晨漂流物", "清晨有一卷绳子漂到木筏旁。", ["绳子 x1"]);
  else next = addLog({ ...next, mood: clamp(next.mood + 10) }, "event", "平静海面", "海面很平静，你的心情变好了。", ["Mood +10"]);

  const nextInfo = getSurvivalInfo(next);
  if (nextInfo.nextDisasterIn <= 2 && nextInfo.nextDisasterIn > 0 && next.day >= 5) {
    next = addLog(next, "warning", "潮汐预警", `⚠️ 潮汐系统预警：${nextInfo.nextDisasterIn} 天后可能出现大灾害。`, [], true);
    const catWarnChance = next.cat.type === "black" ? 0.7 : 0.35;
    if (Math.random() < catWarnChance) next = addLog(next, "event", "猫咪预警", `${next.cat.emoji} ${next.cat.name} 一直盯着海平线，像是在提醒你准备修船和防水布。`, [], true);
  }
  if (next.boatHp <= 0) next = { ...addLog(next, "warning", "结局", "木筏沉没了，你被路过商船救起。", [], true), gameOverReason: "木筏沉没" };
  else if (next.hunger <= 0 && Math.random() < 0.35) next = { ...addLog(next, "warning", "结局", "你饿得没有力气继续漂流，被救援船带离。", [], true), gameOverReason: "饥饿濒危" };
  else if (next.mood <= 0 && Math.random() < 0.3) next = { ...addLog(next, "warning", "结局", "你决定结束这次漂流生活，回到岸上休息。", [], true), gameOverReason: "精神崩溃" };
  return addLog(next, "event", "新的一天", `第 ${next.day} 天来了，天气是${next.weather}，鱼价已刷新。`, [], false);
}

function migrateCat(rawCat: Partial<CatState> | undefined): CatState {
  const fallback = createCatState(rawCat?.type ?? "black");
  return {
    ...fallback,
    ...rawCat,
    type: rawCat?.type ?? fallback.type,
    name: rawCat?.name || fallback.name,
    breed: rawCat?.breed || fallback.breed,
    emoji: rawCat?.emoji || fallback.emoji,
    iconClass: rawCat?.iconClass || fallback.iconClass,
    intimacy: clamp(rawCat?.intimacy ?? fallback.intimacy),
    satiety: clamp(rawCat?.satiety ?? fallback.satiety),
    mood: clamp(rawCat?.mood ?? fallback.mood),
    todayEvent: rawCat?.todayEvent ?? fallback.todayEvent,
    lastPetDay: rawCat?.lastPetDay ?? fallback.lastPetDay,
    lastPlayDay: rawCat?.lastPlayDay ?? fallback.lastPlayDay,
    lastExploreDay: rawCat?.lastExploreDay ?? fallback.lastExploreDay,
  };
}

function migrateState(raw: Partial<GameState>): GameState {
  const initial = createInitialState();
  const fishCollection = { ...createFishCollection(), ...(raw.fishCollection ?? {}) };
  const fishPrices = { ...createBaseFishPrices(), ...(raw.fishPrices ?? {}) };
  const inventory = { ...initial.inventory, ...(raw.inventory ?? {}) };
  const shopStock = raw.shopStock?.length ? raw.shopStock : createShopStock(raw.day ?? 1);
  const cat = migrateCat(raw.cat);
  const logs = Array.isArray(raw.logs)
    ? raw.logs
        .filter((log) => typeof log === "object" && log)
        .map((log: any) =>
          typeof log.message === "string"
            ? log
            : {
                id: log.id ?? crypto.randomUUID(),
                day: log.day ?? raw.day ?? 1,
                type: "event" as LogType,
                title: "旧日记",
                message: String(log.text ?? "一条旧日志被潮水打湿了。"),
              },
        )
    : initial.logs;

  const fishDexRewardsClaimed = Array.isArray(raw.fishDexRewardsClaimed) ? raw.fishDexRewardsClaimed : [];

  return { ...initial, ...raw, inventory, fishCollection, fishPrices, shopStock, cat, logs, fishDexRewardsClaimed };
}

function readLegacySavedPayload(): { state: GameState; savedAt?: string } | undefined {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return undefined;

  try {
    const parsed = JSON.parse(saved);
    if (parsed?.state) return { state: migrateState(parsed.state), savedAt: parsed.savedAt };
    return { state: migrateState(parsed) };
  } catch {
    return undefined;
  }
}

function createSlotId() {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultSaveName(state: GameState) {
  return `漂流记录 Day ${state.day || 1}`;
}

function createSaveSummary(state: GameState, savedAt: string, id?: string, name?: string): SaveSummary {
  const discovered = fishList.filter((fishItem) => state.fishCollection[fishItem.id]?.discovered).length;
  return {
    exists: true,
    id,
    name,
    day: state.day,
    boatLevel: state.boatLevel,
    coins: state.coins,
    hunger: state.hunger,
    mood: state.mood,
    boatHp: state.boatHp,
    boatMaxHp: state.boatMaxHp,
    catName: state.cat?.name,
    fishDexCompletion: Math.round((discovered / fishList.length) * 100),
    savedAt,
  };
}

function normalizeSaveSlot(rawSlot: any): SaveSlot | undefined {
  if (!rawSlot?.gameState) return undefined;
  const gameState = migrateState(rawSlot.gameState);
  const updatedAt = rawSlot.updatedAt || rawSlot.savedAt || new Date().toISOString();
  const id = String(rawSlot.id || createSlotId());
  const name = String(rawSlot.name || getDefaultSaveName(gameState));
  return {
    id,
    name,
    createdAt: rawSlot.createdAt || updatedAt,
    updatedAt,
    gameState,
    summary: createSaveSummary(gameState, updatedAt, id, name),
  };
}

function readRawSaveSlots(): SaveSlot[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSaveSlot).filter(Boolean) as SaveSlot[];
  } catch {
    return [];
  }
}

function writeSaveSlots(slots: SaveSlot[]) {
  localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
}

function ensureSaveSlots(): SaveSlot[] {
  const slots = readRawSaveSlots();
  if (slots.length) return slots;

  const legacy = readLegacySavedPayload();
  if (!legacy?.state?.started) return [];

  const updatedAt = legacy.savedAt || new Date().toISOString();
  const id = createSlotId();
  const migrated: SaveSlot = {
    id,
    name: "旧漂流记录",
    createdAt: updatedAt,
    updatedAt,
    gameState: legacy.state,
    summary: createSaveSummary(legacy.state, updatedAt, id, "旧漂流记录"),
  };
  writeSaveSlots([migrated]);
  localStorage.setItem(ACTIVE_SAVE_ID_KEY, id);
  return [migrated];
}

export function getSaveSlots() {
  return ensureSaveSlots();
}

export function getActiveSaveId() {
  return localStorage.getItem(ACTIVE_SAVE_ID_KEY) || undefined;
}

function getActiveSaveSlot() {
  const slots = ensureSaveSlots();
  const activeId = getActiveSaveId();
  return slots.find((slot) => slot.id === activeId) ?? slots[0];
}

export function saveGame(state: GameState, options: { slotId?: string; name?: string; asNew?: boolean } = {}) {
  const slots = ensureSaveSlots();
  const now = new Date().toISOString();
  const activeId = getActiveSaveId();
  const targetId = options.asNew ? createSlotId() : options.slotId || activeId || slots[0]?.id || createSlotId();
  const existingIndex = options.asNew ? -1 : slots.findIndex((slot) => slot.id === targetId);
  const existing = existingIndex >= 0 ? slots[existingIndex] : undefined;
  const name = (options.name?.trim() || existing?.name || getDefaultSaveName(state)).slice(0, 40);
  const slot: SaveSlot = {
    id: targetId,
    name,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    gameState: state,
    summary: createSaveSummary(state, now, targetId, name),
  };

  const nextSlots = existingIndex >= 0 ? slots.map((item, index) => index === existingIndex ? slot : item) : [slot, ...slots];
  writeSaveSlots(nextSlots);
  localStorage.setItem(ACTIVE_SAVE_ID_KEY, slot.id);

  const legacyPayload: SavePayload = { version: 2, savedAt: now, state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPayload));
  return slot;
}

export function autosaveGame(state: GameState) {
  if (!state.started) return undefined;
  return saveGame(state);
}

export function saveGameWithLog(state: GameState): GameState {
  const next = addSystemLog(state, "💾 游戏已保存。");
  saveGame(next);
  return next;
}

export function saveGameAs(state: GameState, name?: string) {
  return saveGame(state, { asNew: true, name });
}

export function renameSaveSlot(slotId: string, name: string) {
  const slots = ensureSaveSlots();
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return slots.find((slot) => slot.id === slotId);
  const nextSlots = slots.map((slot) => {
    if (slot.id !== slotId) return slot;
    return { ...slot, name: trimmed, summary: { ...slot.summary, name: trimmed } };
  });
  writeSaveSlots(nextSlots);
  return nextSlots.find((slot) => slot.id === slotId);
}

export function deleteSaveSlot(slotId: string) {
  const slots = ensureSaveSlots();
  const nextSlots = slots.filter((slot) => slot.id !== slotId);
  writeSaveSlots(nextSlots);
  const activeId = getActiveSaveId();
  if (activeId === slotId) {
    if (nextSlots[0]) localStorage.setItem(ACTIVE_SAVE_ID_KEY, nextSlots[0].id);
    else localStorage.removeItem(ACTIVE_SAVE_ID_KEY);
  }
  return nextSlots;
}

export function getSaveSummary(): SaveSummary {
  const slot = getActiveSaveSlot();
  return slot?.gameState.started ? slot.summary : { exists: false };
}

export function hasSavedGame() {
  return getSaveSummary().exists;
}

export function loadGame(): GameState {
  const slot = getActiveSaveSlot();
  return slot?.gameState ?? createInitialState();
}

export function loadGameWithLog(slotId?: string): GameState {
  const slots = ensureSaveSlots();
  const slot = slots.find((item) => item.id === slotId) ?? getActiveSaveSlot();
  if (!slot) return createInitialState();
  localStorage.setItem(ACTIVE_SAVE_ID_KEY, slot.id);
  return addSystemLog(slot.gameState, "📂 已读取存档，欢迎回到漂流生活。");
}

export function resetGame(): GameState {
  const activeId = getActiveSaveId();
  if (activeId) deleteSaveSlot(activeId);
  return createInitialState();
}
