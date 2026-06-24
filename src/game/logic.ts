import {
  boatHpByLevel,
  cards,
  createBaseFishPrices,
  createFishCollection,
  createInitialState,
  createShopStock,
  disasterWeather,
  fishList,
  foodItems,
  furniturePool,
  itemMeta,
  itemNames,
  recipes,
  upgradeRequirements,
  weatherList,
} from "./data";
import { BoatLevel, Fish, FishRarity, GameState, ItemId, LogType, Rarity, Recipe, TalentId, TradePrices } from "./types";

const STORAGE_KEY = "drift-crate-save";

export interface SaveSummary {
  exists: boolean;
  day?: number;
  boatLevel?: BoatLevel;
  coins?: number;
  savedAt?: string;
}

interface SavePayload {
  version: 2;
  savedAt: string;
  state: GameState;
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
    .filter((fishItem) => allowedRarities.includes(fishItem.rarity))
    .sort((a, b) => a.basePrice - b.basePrice)
    .forEach((fishItem) => {
      const count = state.fishCollection[fishItem.id]?.count ?? 0;
      for (let i = 0; i < count; i += 1) candidates.push(fishItem);
    });

  return candidates;
}

function getRecipeById(recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId);
}

export function getRecipeStatus(state: GameState, recipe: Recipe) {
  const missing = formatMissingItems(state, recipe.fixedCost);
  const fishCandidates = getFishCandidates(state, recipe);
  const needFish = recipe.fishCount ?? 0;

  if (fishCandidates.length < needFish) {
    missing.push(recipe.rareFishOnly ? `Rare以上鱼 ×${needFish - fishCandidates.length}` : `Common/Uncommon鱼 ×${needFish - fishCandidates.length}`);
  }

  return {
    canCook: missing.length === 0,
    missing,
    selectedFish: fishCandidates.slice(0, needFish),
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
  if (state.equipment.includes("advancedRod")) {
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
    state: { ...state, fishCollection, newestFishId: isNew ? fish.id : state.newestFishId },
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
  const nextDisasterIn = state.day <= 7 ? 8 - state.day : 7 - ((state.day - 8) % 7);
  const hpRate = state.boatHp / state.boatMaxHp;
  const hungerState = state.hunger >= 60 ? "正常" : state.hunger >= 30 ? "饥饿" : state.hunger >= 10 ? "虚弱" : "濒危";
  const moodState = state.mood >= 60 ? "正常" : state.mood >= 30 ? "低落" : state.mood >= 10 ? "崩溃边缘" : "精神崩溃风险";
  const boatState = hpRate >= 0.6 ? "稳定" : hpRate >= 0.3 ? "受损" : state.boatHp > 0 ? "严重破损" : "沉没";
  const danger = state.day <= 3 ? "低" : state.day <= 7 ? "中" : nextDisasterIn <= 2 ? "高" : "中";
  return { phase, nextDisasterIn, danger, hungerState, moodState, boatState };
}

export function startGame(talent: TalentId): GameState {
  const state = createInitialState();
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

  const next = addItem({ ...state, hunger: clamp(state.hunger - 4), mood: clamp(state.mood + 1) }, loot[0], loot[1]);
  return addLog(next, "salvage", "打捞", `你从漂流木箱里找到了${itemNames[loot[0]]} x${loot[1]}。`, [`${itemNames[loot[0]]} x${loot[1]}`]);
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
  if (["sturdyRod", "advancedRodItem", "fishingNet", "solarPurifier"].includes(itemId) && !next.equipment.includes(itemId)) {
    next = { ...next, equipment: [...next.equipment, itemId] };
  }
  return addLog(next, "trade", "潮汐商店", `买下${itemNames[itemId]} x1，花费 ${price} 贝壳币。`, [`${itemNames[itemId]} x1`]);
}

export function cookRecipe(state: GameState, recipeId: string): GameState {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return addLog(state, "warning", "未知食谱", "潮湿的菜谱糊成一团，看不清要做什么。");

  const status = getRecipeStatus(state, recipe);
  if (!status.canCook) {
    return addLog(state, "warning", "材料不足", `还缺少${status.missing.join("、")}，无法制作${recipe.name}。`);
  }

  let next = spendItems(state, recipe.fixedCost);
  const fishCollection = { ...next.fishCollection };
  status.selectedFish.forEach((fishItem) => {
    const entry = fishCollection[fishItem.id];
    if (!entry) return;
    fishCollection[fishItem.id] = { ...entry, count: Math.max(0, entry.count - 1) };
  });

  next = addItem({ ...next, fishCollection }, recipe.output, 1);

  const usedFishNames = status.selectedFish.map((fishItem) => `「${fishItem.name}」`);
  const message =
    recipe.id === "grilled-fish" && usedFishNames.length
      ? `你用${usedFishNames[0]}做了一份烤鱼。`
      : recipe.id === "fish-soup" && usedFishNames.length
        ? `你用${usedFishNames[0]}煮好了一碗鱼汤，热气让小木筏都温暖起来。`
        : recipe.id === "seafood-skewer" && usedFishNames.length
          ? `你用${usedFishNames.join("和")}做了一份海鲜串，闻起来很香。`
          : recipe.id === "deluxe-seafood-pot" && usedFishNames.length
            ? `你用${usedFishNames[0]}做了一份豪华海鲜锅。`
            : "你做好了一份漂流火锅，香味飘过了整片海面。";

  return addLog(next, "cooking", "料理", message, [`${recipe.emoji} ${recipe.name} x1`], recipe.id === "drift-hotpot" || recipe.id === "deluxe-seafood-pot");
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

  return addLog(
    { ...next, hunger: clamp(next.hunger + food.hunger), mood: clamp(next.mood + food.mood) },
    "cooking",
    "进食",
    message,
    [`Hunger +${food.hunger}`, `Mood +${food.mood}`],
  );
}

export function noteNoFood(state: GameState): GameState {
  return addLog(state, "warning", "进食", "你翻了翻背包，但没有可以吃的东西。");
}

export function upgradeBoat(state: GameState): GameState {
  if (state.boatLevel >= 4) return addLog(state, "warning", "最高等级", "你的海上小商铺已经是 Demo 里的最高等级了。");

  const cost = getUpgradeCost(state);
  const missing = describeMissingItems(state, cost.items, cost.coins);
  if (missing.length) return addLog(state, "warning", "材料不足", `升级材料还缺：${missing.join("、")}。`);

  const nextLevel = (state.boatLevel + 1) as BoatLevel;
  const next = spendItems({ ...state, coins: state.coins - cost.coins }, cost.items);
  return addLog(
    { ...next, boatLevel: nextLevel, boatMaxHp: boatHpByLevel[nextLevel], boatHp: boatHpByLevel[nextLevel], mood: clamp(next.mood + 12) },
    "upgrade",
    "载具升级",
    `载具升级为「${nextLevel}级 ${nextLevel === 4 ? "海上小商铺" : nextLevel === 3 ? "小型漂流屋" : "加固木筏"}」！`,
    ["Boat HP 已回满", "Mood +12"],
    true,
  );
}

export function repairBoat(state: GameState): GameState {
  const cost: Partial<Record<ItemId, number>> = { wood: 3, scrap: 1 };
  const missing = describeMissingItems(state, cost);

  if (state.boatHp >= state.boatMaxHp) return addLog(state, "warning", "无需修理", "载具耐久已经是满的，先把材料留着吧。");
  if (missing.length) return addLog(state, "warning", "材料不足", `修理载具还缺：${missing.join("、")}。`);

  const next = spendItems(state, cost);
  return addLog({ ...next, boatHp: Math.min(next.boatMaxHp, next.boatHp + 20), mood: clamp(next.mood + 2) }, "upgrade", "修理载具", "你敲敲补补修好了载具。", ["Boat HP +20"]);
}

export function decorate(state: GameState): GameState {
  if (state.inventory.furnitureTicket <= 0) return addLog(state, "warning", "没有家具券", "需要 1 张家具券才能布置新家具。");

  const options = furniturePool.filter((item) => !state.furniture.includes(item));
  if (options.length === 0) return addLog(state, "furniture", "家具收集完成", "你的漂流小屋已经收集了所有 Demo 家具。", [], true);

  const furniture = pick(options);
  const next = addItem(state, "furnitureTicket", -1);
  return addLog({ ...next, furniture: [...next.furniture, furniture], mood: clamp(next.mood + 10) }, "furniture", "布置家具", `你布置了「${furniture}」，小屋更有生活感了。`, [furniture, "Mood +10"]);
}

export function endDay(state: GameState): GameState {
  if (state.gameOverReason) return state;
  const info = getSurvivalInfo(state);
  const disasterDay = state.day >= 8 && info.nextDisasterIn === 1;
  const nextWeather = disasterDay ? pick(disasterWeather) : pick(weatherList);
  const hungerDrop = state.day <= 3 ? 8 : state.day <= 7 ? 12 : 15;
  const moodExtra = state.hunger < 10 ? 12 : state.hunger < 30 ? 8 : state.hunger < 60 ? 3 : 0;
  let next: GameState = {
    ...state,
    day: state.day + 1,
    weather: nextWeather,
    hunger: clamp(state.hunger - hungerDrop),
    mood: clamp(state.mood - (state.hunger <= 15 ? 12 : 5) - moodExtra + (state.boatLevel >= 3 ? 1 : 0)),
    fishPrices: createFishPrices(),
    tradePrices: createLegacyPrices(),
    newestFishId: undefined,
    shopStock: state.day % 7 === 0 ? createShopStock(state.day + 1) : state.shopStock,
  };

  if (state.day % 7 === 0) next = addLog(next, "trade", "潮汐商店", "潮汐商店刷新了新的库存。");

  if (next.equipment.includes("waterPurifier") || next.equipment.includes("solarPurifier")) {
    next = addItem(next, "water", 1);
    next = addLog(next, "event", "自动净水器", "自动净水器安静工作了一夜。", ["淡水 x1"]);
  }
  if (next.equipment.includes("solarPurifier")) next = addLog(next, "event", "太阳能净水器", "白天积攒的阳光换成了一瓶淡水。", ["淡水 x1"]);

  if (nextWeather === "风暴") {
    const damage = Math.round(20 * (state.boatLevel === 1 ? 1.5 : state.boatLevel === 2 ? 1.1 : state.boatLevel === 3 ? 0.75 : 0.45));
    next = addLog({ ...next, boatHp: Math.max(0, next.boatHp - damage) }, "warning", "风暴", `风暴袭来，Boat HP -${damage}。`, [`Boat HP -${damage}`], true);
  } else if (nextWeather === "高温") {
    next = addLog({ ...next, hunger: clamp(next.hunger - (state.boatLevel >= 4 ? 6 : 15)) }, "warning", "高温", "太阳把海面晒得发白，Hunger 额外下降。", [], true);
  } else if (nextWeather === "寒潮") {
    next = addLog({ ...next, mood: clamp(next.mood - (state.boatLevel >= 3 ? 4 : 10)) }, "warning", "寒潮", "夜里突然变冷，Mood 下降。", [], true);
  } else if (nextWeather === "暴雨") {
    const damage = state.boatLevel >= 3 ? 5 : 10;
    next = addLog({ ...next, boatHp: Math.max(0, next.boatHp - damage) }, "warning", "暴雨", `暴雨拍打木筏，Boat HP -${damage}。`, [`Boat HP -${damage}`]);
  }

  const event = Math.random();
  if (event < 0.18) next = addLog(next, "event", "漂流瓶", "你发现漂流瓶，里面竟然有 20 贝壳币。", ["+20 贝壳币"]);
  else if (event < 0.54) next = addLog(addItem(next, "commonCrate", 1), "event", "友好商船", "遇到友好商船，获得普通补给包。", ["普通补给包 x1"]);
  else if (event < 0.72) next = addLog(addItem(next, "rope", 1), "salvage", "清晨漂流物", "清晨有一卷绳子漂到木筏旁。", ["绳子 x1"]);
  else next = addLog({ ...next, mood: clamp(next.mood + 10) }, "event", "平静海面", "海面很平静，你的心情变好了。", ["Mood +10"]);

  if (info.nextDisasterIn <= 2 && next.day >= 8) next = addLog(next, "warning", "潮汐预警", `⚠️ 潮汐系统预警：${info.nextDisasterIn} 天后可能出现大灾害。`, [], true);
  if (next.boatHp <= 0) next = { ...addLog(next, "warning", "结局", "木筏沉没了，你被路过商船救起。", [], true), gameOverReason: "木筏沉没" };
  else if (next.hunger <= 0 && Math.random() < 0.35) next = { ...addLog(next, "warning", "结局", "你饿得没有力气继续漂流，被救援船带离。", [], true), gameOverReason: "饥饿濒危" };
  else if (next.mood <= 0 && Math.random() < 0.3) next = { ...addLog(next, "warning", "结局", "你决定结束这次漂流生活，回到岸上休息。", [], true), gameOverReason: "精神崩溃" };
  return addLog(next, "event", "新的一天", `第 ${next.day} 天来了，天气是${next.weather}，鱼价已刷新。`, [], false);
}

function migrateState(raw: Partial<GameState>): GameState {
  const initial = createInitialState();
  const fishCollection = { ...createFishCollection(), ...(raw.fishCollection ?? {}) };
  const fishPrices = { ...createBaseFishPrices(), ...(raw.fishPrices ?? {}) };
  const inventory = { ...initial.inventory, ...(raw.inventory ?? {}) };
  const shopStock = raw.shopStock?.length ? raw.shopStock : createShopStock(raw.day ?? 1);
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

  return { ...initial, ...raw, inventory, fishCollection, fishPrices, shopStock, logs };
}

function readSavedPayload(): { state: GameState; savedAt?: string } | undefined {
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

export function saveGame(state: GameState) {
  const payload: SavePayload = {
    version: 2,
    savedAt: new Date().toISOString(),
    state,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function saveGameWithLog(state: GameState): GameState {
  const next = addSystemLog(state, "💾 游戏已保存。");
  saveGame(next);
  return next;
}

export function getSaveSummary(): SaveSummary {
  const payload = readSavedPayload();
  if (!payload?.state?.started) return { exists: false };

  return {
    exists: true,
    day: payload.state.day,
    boatLevel: payload.state.boatLevel,
    coins: payload.state.coins,
    savedAt: payload.savedAt,
  };
}

export function hasSavedGame() {
  return getSaveSummary().exists;
}

export function loadGame(): GameState {
  const payload = readSavedPayload();
  return payload?.state ?? createInitialState();
}

export function loadGameWithLog(): GameState {
  return addSystemLog(loadGame(), "📂 已读取存档，欢迎回到漂流生活。");
}

export function resetGame(): GameState {
  localStorage.removeItem(STORAGE_KEY);
  return createInitialState();
}
