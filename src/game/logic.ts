import {
  boatHpByLevel,
  cards,
  createBaseFishPrices,
  createFishCollection,
  createInitialState,
  fishList,
  furniturePool,
  itemNames,
  upgradeRequirements,
  weatherList,
} from "./data";
import { BoatLevel, Fish, FishRarity, GameState, ItemId, LogType, Rarity, TalentId, TradePrices } from "./types";

const STORAGE_KEY = "drift-crate-save";

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
  return describeMissingItems(state, { hotpotBase: 1, veggiePack: 1, meatSlices: 1, water: 1 }).length === 0;
}

export function hasFishToSell(state: GameState) {
  return Object.values(state.fishCollection).some((entry) => entry.count > 0);
}

export function startGame(talent: TalentId): GameState {
  const state = createInitialState();
  return addLog({ ...state, started: true, talent, tradePrices: createLegacyPrices(), fishPrices: createFishPrices() }, "event", "潮汐系统", "潮汐系统启动，今天的漂流生活开始了。", [], true);
}

export function fish(state: GameState): GameState {
  if (state.hunger <= 0) return addLog(state, "warning", "体力不足", "你饿得头晕，先找点吃的再钓鱼吧。");

  const caught = pickFish(state);
  const result = addFish({ ...state, hunger: clamp(state.hunger - 5) }, caught, 1);
  let next = addLog(result.state, "fishing", "钓鱼", `你钓到了「${caught.name}」x1。`, [`${caught.emoji} ${caught.name} x1`], caught.rarity === "Epic" || caught.rarity === "Legendary");

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

  const rarity = rollCardRarity(state, crate === "premiumCrate");
  const card = pick(cards.filter((item) => item.rarity === rarity));
  let next = addItem(state, crate, -1);
  const rewards: string[] = [];

  if (card.itemId && card.amount) {
    next = addItem(next, card.itemId, card.amount);
    rewards.push(`${itemNames[card.itemId]} x${card.amount}`);
  }
  if (card.fishRarity && card.amount) {
    const fishes: string[] = [];
    for (let i = 0; i < card.amount; i += 1) {
      const fishReward = pick(fishList.filter((fishItem) => fishItem.rarity === card.fishRarity));
      const result = addFish(next, fishReward, 1);
      next = result.state;
      fishes.push(`${fishReward.emoji} ${fishReward.name}`);
      if (result.isNew) {
        next = addLog(next, "discovery", "新发现", `补给包里发现了「${fishReward.name}」！已加入钓鱼图鉴。`, [fishReward.rarity], true, true);
      }
    }
    rewards.push(...fishes);
  }
  if (card.equipment && !next.equipment.includes(card.equipment)) {
    next = { ...next, equipment: [...next.equipment, card.equipment] };
    rewards.push(card.name);
  }
  if (card.furniture && !next.furniture.includes(card.furniture)) {
    next = { ...next, furniture: [...next.furniture, card.furniture] };
    rewards.push(card.furniture);
  }

  return addLog(
    { ...next, lastCard: card, lastCrateType: crate, mood: clamp(next.mood + (rarity === "Legendary" ? 12 : rarity === "Epic" ? 8 : 3)) },
    "crate",
    crate === "premiumCrate" ? "高级补给包" : "普通补给包",
    `打开${itemNames[crate]}，获得 ${card.rarity} 卡：「${card.name}」。`,
    rewards,
    rarity === "Epic" || rarity === "Legendary",
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

export function buyItem(state: GameState, itemId: "commonCrate" | "premiumCrate" | "water" | "wood"): GameState {
  const prices = { commonCrate: 30, premiumCrate: 100, water: 10, wood: 5 };
  const price = prices[itemId];

  if (state.coins < price) return addLog(state, "warning", "贝壳币不足", `还差 ${price - state.coins} 贝壳币，买不起${itemNames[itemId]}。`);

  const next = addItem({ ...state, coins: state.coins - price }, itemId, 1);
  return addLog(next, "trade", "购买物资", `你买下了 ${itemNames[itemId]} x1。`, [itemNames[itemId]]);
}

export function cookHotpot(state: GameState): GameState {
  const cost: Partial<Record<ItemId, number>> = { hotpotBase: 1, veggiePack: 1, meatSlices: 1, water: 1 };
  const missing = describeMissingItems(state, cost);

  if (missing.length) return addLog(state, "warning", "材料不足", `漂流火锅还缺：${missing.join("、")}。`);

  const next = spendItems(state, cost);
  return addLog({ ...next, hunger: clamp(next.hunger + 40), mood: clamp(next.mood + 30) }, "cooking", "漂流火锅", "你煮了一锅热腾腾的漂流火锅。", ["Hunger +40", "Mood +30"], true);
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
  let next: GameState = {
    ...state,
    day: state.day + 1,
    weather: pick(weatherList),
    hunger: clamp(state.hunger - 15),
    mood: clamp(state.mood - (state.hunger <= 15 ? 12 : 5)),
    fishPrices: createFishPrices(),
    tradePrices: createLegacyPrices(),
    newestFishId: undefined,
  };

  if (next.equipment.includes("waterPurifier")) {
    next = addItem(next, "water", 1);
    next = addLog(next, "event", "自动净水器", "自动净水器安静工作了一夜。", ["淡水 x1"]);
  }

  const event = Math.random();
  if (event < 0.18) next = addLog(next, "event", "漂流瓶", "你发现漂流瓶，里面竟然有 20 贝壳币。", ["+20 贝壳币"]);
  else if (event < 0.36) next = addLog({ ...next, boatHp: Math.max(0, next.boatHp - 10) }, "event", "暴雨拍岸", "暴雨拍打木筏，Boat HP -10。", ["Boat HP -10"]);
  else if (event < 0.54) next = addLog(addItem(next, "commonCrate", 1), "event", "友好商船", "遇到友好商船，获得普通补给包。", ["普通补给包 x1"]);
  else if (event < 0.72) next = addLog(addItem(next, "rope", 1), "salvage", "清晨漂流物", "清晨有一卷绳子漂到木筏旁。", ["绳子 x1"]);
  else next = addLog({ ...next, mood: clamp(next.mood + 10) }, "event", "平静海面", "海面很平静，你的心情变好了。", ["Mood +10"]);

  if (next.boatHp <= 0) next = addLog(next, "warning", "载具严重损坏", "载具严重损坏，需要尽快修理或升级。", [], true);
  return addLog(next, "event", "新的一天", `第 ${next.day} 天来了，天气是${next.weather}，鱼价已刷新。`, [], false);
}

function migrateState(raw: Partial<GameState>): GameState {
  const initial = createInitialState();
  const fishCollection = { ...createFishCollection(), ...(raw.fishCollection ?? {}) };
  const fishPrices = { ...createBaseFishPrices(), ...(raw.fishPrices ?? {}) };
  const inventory = { ...initial.inventory, ...(raw.inventory ?? {}) };
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

  return { ...initial, ...raw, inventory, fishCollection, fishPrices, logs };
}

export function saveGame(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGame(): GameState {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return createInitialState();

  try {
    return migrateState(JSON.parse(saved));
  } catch {
    return createInitialState();
  }
}

export function resetGame(): GameState {
  localStorage.removeItem(STORAGE_KEY);
  return createInitialState();
}
