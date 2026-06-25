import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { boatNames, catOptions, fishList, foodItems, itemEmoji, itemMeta, itemNames, recipes, talents } from "./game/data";
import {
  buyShopItem,
  canCookAnyRecipe,
  canUpgradeBoat,
  cookRecipe,
  decorate,
  endDay,
  eatFood,
  feedCat,
  fish,
  getCatFeedOptions,
  getRecipeStatus,
  getMissingRequirements,
  getUpgradeCost,
  getSaveSummary,
  getSurvivalInfo,
  hasEdibleFood,
  hasFishToSell,
  hasSavedGame,
  loadGame,
  loadGameWithLog,
  noteNoFood,
  openCrate,
  repairBoat,
  resetGame,
  salvage,
  saveGameWithLog,
  sellSelectedFish,
  startGame,
  upgradeBoat,
} from "./game/logic";
import type { SaveSummary } from "./game/logic";
import { CatFeedOption, CatType, Fish, FishRarity, Food, GameState, ItemCategory, ItemId, LogEntry, LogType, Rarity, Recipe, ShopItem, TalentId } from "./game/types";

const materialOrder: ItemId[] = [
  "wood",
  "plastic",
  "rope",
  "scrap",
  "water",
  "hotpotBase",
  "veggiePack",
  "meatSlices",
  "furnitureTicket",
  "commonCrate",
  "premiumCrate",
];

const foodOrder: ItemId[] = ["grilledFish", "fishSoup", "seafoodSkewer", "driftHotpot", "deluxeSeafoodPot"];
const categoryLabels: Record<ItemCategory | "all", string> = { all: "全部", materials: "材料", food: "食物", tools: "工具", hygiene: "卫生", furniture: "家具", equipment: "装备", special: "特殊" };

type ViewState = "title" | "talentSelect" | "catSelect" | "playing" | "loadMenu";
type FeedbackRarity = Rarity | FishRarity | "Uncommon";
type FeedbackLine = {
  label: string;
  amount?: number;
  rarity?: FeedbackRarity;
};
type FeedbackData = {
  title: string;
  icon: string;
  message?: string;
  gains: FeedbackLine[];
  costs: FeedbackLine[];
  stats: FeedbackLine[];
  warnings: string[];
  notes: string[];
  rarity?: FeedbackRarity;
  important?: boolean;
};

const logIcon: Record<LogType, string> = {
  fishing: "🎣",
  salvage: "🪝",
  crate: "🎁",
  trade: "🛒",
  cooking: "🍲",
  upgrade: "🔨",
  furniture: "🪑",
  event: "🌊",
  warning: "⚠️",
  discovery: "🐟",
};

function App() {
  const [state, setState] = useState<GameState>(() => loadGame());
  const [view, setView] = useState<ViewState>("title");
  const [saveSummary, setSaveSummary] = useState(() => getSaveSummary());
  const [showCrate, setShowCrate] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [showEating, setShowEating] = useState(false);
  const [showSelling, setShowSelling] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [pendingTalent, setPendingTalent] = useState<TalentId | undefined>();
  const [inventoryFilter, setInventoryFilter] = useState<ItemCategory | "all">("all");
  const [sellFocusFishId, setSellFocusFishId] = useState<string | undefined>();
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | undefined>();
  const logPanelRef = useRef<HTMLElement | null>(null);
  const selectedTalent = talents.find((talent) => talent.id === state.talent);
  const upgradeCost = useMemo(() => getUpgradeCost(state), [state]);
  const hotpotMissing = useMemo(() => getMissingRequirements(state, { hotpotBase: 1, veggiePack: 1, meatSlices: 1, water: 1 }), [state]);
  const readyToCook = canCookAnyRecipe(state);
  const readyToEat = hasEdibleFood(state);
  const readyToUpgrade = canUpgradeBoat(state);
  const readyToDecorate = state.inventory.furnitureTicket > 0;
  const readyToSell = hasFishToSell(state);
  const discoveredCount = fishList.filter((fishItem) => state.fishCollection[fishItem.id]?.discovered).length;
  const completion = Math.round((discoveredCount / fishList.length) * 100);
  const survival = getSurvivalInfo(state);

  useEffect(() => {
    if (!musicOn) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const gain = audio.createGain();
    gain.gain.value = 0.045;
    gain.connect(audio.destination);
    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 880];
    let index = 0;
    const play = () => {
      const osc = audio.createOscillator();
      osc.type = "sine";
      osc.frequency.value = notes[index % notes.length];
      osc.connect(gain);
      osc.start();
      osc.stop(audio.currentTime + 0.18);
      index += 1;
    };
    play();
    const timer = window.setInterval(play, 420);
    return () => {
      window.clearInterval(timer);
      audio.close();
    };
  }, [musicOn]);

  const update = (next: GameState) => setState(next);
  const applyAction = (title: string, next: GameState) => {
    setFeedback(buildFeedback(title, state, next));
    setState(next);
  };

  const refreshSaveSummary = () => setSaveSummary(getSaveSummary());

  const startNewGameFlow = () => {
    if (hasSavedGame() && !window.confirm("已经存在存档。开始新游戏不会立刻删除旧存档，但下次保存会覆盖当前进度。是否继续？")) return;
    setPendingTalent(undefined);
    setView("talentSelect");
  };

  const chooseTalent = (talent: TalentId) => {
    setPendingTalent(talent);
    setView("catSelect");
  };

  const chooseCat = (catType: CatType) => {
    setState(startGame(pendingTalent ?? "fishing", catType));
    setPendingTalent(undefined);
    setShowTutorial(true);
    setView("playing");
  };

  const continueGame = () => {
    if (state.started) {
      setView("playing");
      return;
    }
    loadSavedGame();
  };

  const loadSavedGame = () => {
    if (!hasSavedGame()) return;
    setState(loadGameWithLog());
    refreshSaveSummary();
    setView("playing");
  };

  const saveCurrentGame = () => {
    const next = saveGameWithLog(state);
    setState(next);
    setSaveSummary(getSaveSummary());
  };

  const resetCurrentGame = () => {
    setShowCrate(false);
    setShowCooking(false);
    setShowEating(false);
    setShowCat(false);
    setFeedback(undefined);
    update(resetGame());
    refreshSaveSummary();
    setView("title");
  };

  const openCrateAndShow = (crate: "commonCrate" | "premiumCrate") => {
    applyAction(crate === "premiumCrate" ? "打开高级补给包" : "打开普通补给包", openCrate(state, crate));
  };

  const openEatingPanel = () => {
    if (!hasEdibleFood(state)) {
      applyAction("进食", noteNoFood(state));
      return;
    }
    setShowEating(true);
  };

  const openSellPanel = (fishId?: string) => {
    if (!hasFishToSell(state)) {
      const emptyTradeLog: LogEntry = {
        id: crypto.randomUUID(),
        day: state.day,
        type: "trade",
        title: "海上交易",
        message: "你翻了翻鱼篓，暂时没有可以出售的鱼。",
      };
      applyAction("出售鱼获", {
        ...state,
        logs: [emptyTradeLog, ...state.logs].slice(0, 30),
      });
      return;
    }
    setSellFocusFishId(fishId);
    setShowSelling(true);
  };

  if (view === "title") {
    return (
      <TitleScreen
        saveSummary={saveSummary}
        hasActiveRun={state.started}
        onNewGame={startNewGameFlow}
        onContinue={continueGame}
        onLoadMenu={() => setView("loadMenu")}
        musicOn={musicOn}
        onToggleMusic={() => setMusicOn((value) => !value)}
      />
    );
  }

  if (view === "loadMenu") {
    return (
      <LoadScreen
        saveSummary={saveSummary}
        onBack={() => setView("title")}
        onLoad={loadSavedGame}
      />
    );
  }

  if (view === "catSelect") {
    return <CatSelectScreen onBack={() => setView("talentSelect")} onChoose={chooseCat} />;
  }

  if (view === "talentSelect" || !state.started) {
    return (
      <main className="start-screen">
        <section className="start-card">
          <p className="eyebrow">Drift Crate</p>
          <h1>漂流补给箱</h1>
          <p className="intro">选择一个初始天赋，带着小木筏、旧鱼竿和潮汐系统，开始你的海上小家计划。</p>
          <div className="talent-grid">
            {talents.map((talent) => (
              <button className="talent-card" key={talent.id} onClick={() => chooseTalent(talent.id as TalentId)}>
                <span>{talent.emoji}</span>
                <strong>{talent.name}</strong>
                <small>{talent.description}</small>
              </button>
            ))}
          </div>
          <button className="compact-button menu-back" onClick={() => setView("title")}>返回主菜单</button>
        </section>
      </main>
    );
  }

  if (state.gameOverReason) {
    return <GameOverScreen state={state} completion={completion} onRestart={() => { setState(resetGame()); setView("talentSelect"); }} onTitle={() => setView("title")} />;
  }

  return (
    <main className={`app-shell game-home weather-${state.weather}`}>
      <header className="topbar game-topbar">
        <div>
          <p className="eyebrow">Drift Crate</p>
          <h1>漂流补给箱</h1>
          <button className="compact-button" onClick={() => setView("title")}>返回主菜单</button>
        </div>
        <div className="status-grid hud-grid">
          <Status label="Day" value={state.day} />
          <Status label="阶段" value={survival.phase} />
          <Status label="灾害倒计时" value={`${survival.nextDisasterIn}天`} danger={survival.nextDisasterIn <= 2 && state.day >= 8} />
          <Status label="危险等级" value={survival.danger} danger={survival.danger === "高"} />
          <Status label="Weather" value={state.weather} />
          <Status label="Hunger" value={state.hunger} danger={state.hunger <= 15} />
          <Status label="Mood" value={state.mood} />
          <Status label="Coins" value={`${state.coins} 🐚`} />
          <Status label="Boat HP" value={`${state.boatHp}/${state.boatMaxHp}`} danger={state.boatHp <= 15} />
          <Status label="Boat Level" value={`Lv.${state.boatLevel}`} />
          <Status label="音乐" value={musicOn ? "开" : "关"} />
        </div>
      </header>

      <section className="game-layout">
        <div className="main-column">
          <section className="boat-panel stage-panel">
            <div className={`boat-scene level-${state.boatLevel} scene-weather-${state.weather}`}>
              <div className="stage-skybits">
                <span className="sun">{state.weather === "寒潮" ? "🌙" : "☀️"}</span>
                <span className="stage-cloud cloud-one">☁️</span>
                <span className="stage-cloud cloud-two">☁️</span>
                <span className="stage-gull">⌁</span>
                <span className="stage-island">🏝️</span>
                <span className="stage-ship">⛵</span>
                <span className="stage-bottle">🍾</span>
                {(state.weather === "暴雨" || state.weather === "风暴") && <span className="stage-rain">///// ⚡ /////</span>}
                {state.weather === "大雾" && <span className="fog-layer"></span>}
              </div>
              <div className={`boat home-level-${state.boatLevel}`}>
                <div className="boat-roof">{state.boatLevel >= 4 ? "🏪✨" : state.boatLevel >= 3 ? "🏠🪟" : state.boatLevel === 2 ? "⛵🚩" : "🪵📦"}</div>
                <div className="boat-body">{boatNames[state.boatLevel]}</div>
                <div className="furniture-strip">{state.furniture.slice(0, 6).map((item) => <span key={item}>{furnitureIcon(item)}</span>)}</div>
                <div className="stage-cat" title={`${state.cat.name} / ${state.cat.breed}`}>
                  <span>{state.cat.emoji}</span>
                  <small>{state.cat.name}</small>
                </div>
                <div className="waves">≈≈≈≈≈≈≈≈≈≈≈</div>
              </div>
            </div>
            <div className="boat-info">
              <h2>{boatNames[state.boatLevel]}</h2>
              <p>天赋：{selectedTalent ? `${selectedTalent.emoji} ${selectedTalent.name}` : "未选择"}</p>
              <p>状态：Hunger {survival.hungerState} / Mood {survival.moodState} / 船体{survival.boatState}</p>
              <p>当前钓具：{state.equipment.includes("goldenRod") ? "黄金鱼竿" : state.equipment.includes("advancedRodItem") || state.equipment.includes("advancedRod") ? "高级钓鱼竿" : state.equipment.includes("sturdyRod") ? "结实钓鱼竿" : "旧钓鱼竿"}</p>
              <h3>下次升级</h3>
              {state.boatLevel >= 4 ? <p>已达到 Demo 最高等级。</p> : <RequirementList state={state} items={upgradeCost.items} coins={upgradeCost.coins} />}
              {state.boatHp <= 0 && <strong className="warning">载具严重损坏，需要尽快修理。</strong>}
            </div>
          </section>

          <section className="actions panel action-dock">
            <ActionButton onClick={() => applyAction("钓鱼", fish(state))}>🎣 钓鱼</ActionButton>
            <ActionButton onClick={() => applyAction("打捞", salvage(state))}>🪝 打捞</ActionButton>
            <ActionButton badge={state.inventory.commonCrate > 0 ? "可开" : undefined} onClick={() => openCrateAndShow("commonCrate")}>
              🎁 开普通包 x{state.inventory.commonCrate}
            </ActionButton>
            <ActionButton badge={state.inventory.premiumCrate > 0 ? "可开" : undefined} onClick={() => openCrateAndShow("premiumCrate")}>
              💝 开高级包 x{state.inventory.premiumCrate}
            </ActionButton>
            <ActionButton badge={readyToUpgrade ? "可升级" : undefined} onClick={() => applyAction("升级载具", upgradeBoat(state))}>
              🔨 升级载具
            </ActionButton>
            <ActionButton onClick={() => applyAction("修理载具", repairBoat(state))}>🧰 修理载具</ActionButton>
            <ActionButton badge={readyToCook ? "可做" : undefined} onClick={() => setShowCooking(true)}>
              🍲 制作料理
            </ActionButton>
            <ActionButton badge={readyToEat ? "可吃" : undefined} onClick={openEatingPanel}>
              🍽 进食
            </ActionButton>
            <ActionButton onClick={() => setShowCat(true)}>🐈 猫猫</ActionButton>
            <ActionButton badge={readyToDecorate ? "可布置" : undefined} onClick={() => applyAction("布置家具", decorate(state))}>
              🪑 布置家具
            </ActionButton>
            <ActionButton className="night" onClick={() => applyAction("结束一天", endDay(state))}>🌙 结束一天</ActionButton>
          </section>

          <section className="panel trade-panel">
            <div className="section-heading">
              <h2>🛒 海上交易</h2>
              {readyToSell && <span className="notice-pill">可出售</span>}
            </div>
            <button className="sell-all" onClick={() => openSellPanel()}>出售鱼获</button>
            <div className="fish-trade-grid">
              {fishList.map((fishItem) => (
                <FishTradeCard key={fishItem.id} fish={fishItem} state={state} onSell={() => openSellPanel(fishItem.id)} />
              ))}
            </div>
            <TideShop state={state} onBuy={(item) => window.confirm(`购买 ${itemNames[item.id]}，花费 ${item.price} 贝壳币？`) && applyAction("购买", buyShopItem(state, item.id))} />
          </section>

          <section className="panel fishdex-panel">
            <div className="section-heading">
              <h2>📘 钓鱼图鉴</h2>
              {state.newestFishId && <span className="new-pill">NEW</span>}
            </div>
            <p className="dex-summary">已发现 {discoveredCount}/{fishList.length} 种鱼，完成度 {completion}%</p>
            <div className="fishdex-grid">
              {fishList.map((fishItem) => (
                <FishDexCard key={fishItem.id} fish={fishItem} state={state} />
              ))}
            </div>
          </section>
        </div>

        <aside className="side-column game-side">
          <RecentActivity
            logs={state.logs}
            expanded={recentExpanded}
            onToggle={() => setRecentExpanded((value) => !value)}
            onViewFull={() => logPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />

          <section className="panel inventory">
            <h2>🎒 背包</h2>
            <InventoryPanel state={state} filter={inventoryFilter} onFilter={setInventoryFilter} />
          </section>

          <section className="panel crate-panel">
            <h2>🎁 最近开出的卡</h2>
            {state.lastCard ? (
              <div className={`card rarity-${state.lastCard.rarity.toLowerCase()}`}>
                <span>{state.lastCard.emoji}</span>
                <strong>{state.lastCard.name}</strong>
                <small>{state.lastCard.rarity}</small>
                <p>{state.lastCard.description}</p>
              </div>
            ) : (
              <p>还没有开箱，第一发说不定就是金光。</p>
            )}
          </section>

          <section className="panel recipe-panel">
            <div className="section-heading">
              <h2>🍳 料理台</h2>
              {readyToCook && <span className="notice-pill">可做</span>}
            </div>
            <p className="hint">基础料理优先使用 Common / Uncommon 鱼；豪华海鲜锅才会使用 Rare 以上鱼。</p>
            <p className={hotpotMissing.length ? "hint" : "ready"}>{hotpotMissing.length ? `漂流火锅还缺：${hotpotMissing.join("、")}` : "漂流火锅材料齐了，可以开锅！"}</p>
          </section>

          <section className="panel home-panel">
            <h2>🏡 我的漂流小屋</h2>
            <div className="tag-list">
              {state.furniture.length ? state.furniture.map((item) => <span key={item}>{item}</span>) : <p>还没有家具，等一张家具券来改变生活。</p>}
            </div>
            <h3>装备</h3>
            <div className="tag-list">
              {state.equipment.length ? state.equipment.map((item) => <span key={item}>{item}</span>) : <p>暂无装备。</p>}
            </div>
          </section>
        </aside>
      </section>

      <section className="bottom-row">
        <section className="panel log-panel" ref={logPanelRef}>
          <h2>📖 漂流日记</h2>
          <div className="logs">
            {state.logs.slice(0, 10).map((log) => (
              <article className={`log-entry log-${log.type} ${log.important ? "important" : ""}`} key={log.id}>
                <span className="log-icon">{logIcon[log.type]}</span>
                <div>
                  <strong>【{log.title}】</strong>
                  {log.isNew && <span className="new-pill">NEW</span>}
                  <p>{log.message}</p>
                  {!!log.rewards?.length && (
                    <div className="reward-row">
                      {log.rewards.map((reward) => <span key={reward}>{reward}</span>)}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="panel save-panel">
          <h2>系统</h2>
          <button onClick={saveCurrentGame}>保存游戏</button>
          <button
            className="danger-button"
            onClick={resetCurrentGame}
          >
            重置游戏
          </button>
        </section>
      </section>

      {showCrate && <CrateModal state={state} onClose={() => setShowCrate(false)} />}
      {showCooking && (
        <CookingModal
          state={state}
          onClose={() => setShowCooking(false)}
          onCook={(recipeId) => {
            applyAction("制作料理", cookRecipe(state, recipeId));
          }}
        />
      )}
      {showEating && (
        <EatingModal
          state={state}
          onClose={() => setShowEating(false)}
          onEat={(foodId) => {
            applyAction("进食", eatFood(state, foodId));
          }}
        />
      )}
      {showSelling && (
        <SellFishModal
          state={state}
          focusFishId={sellFocusFishId}
          onClose={() => {
            setShowSelling(false);
            setSellFocusFishId(undefined);
          }}
          onSell={(selections) => {
            applyAction("出售鱼获", sellSelectedFish(state, selections));
            setShowSelling(false);
            setSellFocusFishId(undefined);
          }}
        />
      )}
      {showCat && (
        <CatModal
          state={state}
          onClose={() => setShowCat(false)}
          onFeed={(optionId) => applyAction("喂猫", feedCat(state, optionId))}
        />
      )}
      {showTutorial && <TutorialModal onClose={(never) => { setShowTutorial(false); if (never) update({ ...state, tutorialSeen: true }); }} />}
      {feedback && <FeedbackModal feedback={feedback} onClose={() => setFeedback(undefined)} />}
    </main>
  );
}

function buildFeedback(title: string, before: GameState, after: GameState): FeedbackData {
  const previousLogIds = new Set(before.logs.map((log) => log.id));
  const newLogs = after.logs.filter((log) => !previousLogIds.has(log.id));
  const primaryLog = newLogs[0];
  const gains: FeedbackLine[] = [];
  const costs: FeedbackLine[] = [];
  const stats: FeedbackLine[] = [];
  const warnings = newLogs.filter((log) => log.type === "warning").map((log) => log.message);
  const notes = newLogs
    .filter((log) => log.type !== "warning" && (log.isNew || log.important))
    .map((log) => log.message);

  (Object.keys(itemNames) as ItemId[]).forEach((id) => {
    const diff = (after.inventory[id] ?? 0) - (before.inventory[id] ?? 0);
    if (diff > 0) gains.push({ label: `${itemEmoji[id]} ${itemNames[id]}`, amount: diff, rarity: itemMeta[id]?.rarity });
    if (diff < 0) costs.push({ label: `${itemEmoji[id]} ${itemNames[id]}`, amount: Math.abs(diff), rarity: itemMeta[id]?.rarity });
  });

  fishList.forEach((fishItem) => {
    const beforeCount = before.fishCollection[fishItem.id]?.count ?? 0;
    const afterCount = after.fishCollection[fishItem.id]?.count ?? 0;
    const diff = afterCount - beforeCount;
    if (diff > 0) gains.push({ label: `${fishItem.emoji} ${fishItem.name}`, amount: diff, rarity: fishItem.rarity });
    if (diff < 0) costs.push({ label: `${fishItem.emoji} ${fishItem.name}`, amount: Math.abs(diff), rarity: fishItem.rarity });
  });

  addArrayDiff(before.equipment, after.equipment, "装备", gains, costs);
  addArrayDiff(before.furniture, after.furniture, "家具", gains, costs);
  addNumberDiff("🐚 贝壳币", before.coins, after.coins, stats);
  addNumberDiff("🍗 Hunger", before.hunger, after.hunger, stats);
  addNumberDiff("😊 Mood", before.mood, after.mood, stats);
  addNumberDiff("🛶 Boat HP", before.boatHp, after.boatHp, stats);
  addNumberDiff("📅 Day", before.day, after.day, stats);
  addNumberDiff("🐈 猫饱腹", before.cat?.satiety ?? 0, after.cat?.satiety ?? 0, stats);
  addNumberDiff("🐾 猫亲密", before.cat?.intimacy ?? 0, after.cat?.intimacy ?? 0, stats);
  addNumberDiff("😺 猫心情", before.cat?.mood ?? 0, after.cat?.mood ?? 0, stats);
  if (before.boatLevel !== after.boatLevel) {
    stats.push({ label: `🚤 Boat Lv ${before.boatLevel} → ${after.boatLevel}` });
  }

  if (!gains.length && !costs.length && !stats.length && primaryLog?.type !== "warning" && primaryLog?.message) {
    notes.push(primaryLog.message);
  }

  const rarity = strongestFeedbackRarity(gains.concat(costs), newLogs);

  return {
    title,
    icon: primaryLog ? feedbackIcon(primaryLog.type) : "✨",
    message: primaryLog?.message,
    gains,
    costs,
    stats,
    warnings,
    notes: Array.from(new Set(notes)),
    rarity,
    important: newLogs.some((log) => log.important || log.isNew) || rarity === "Epic" || rarity === "Legendary",
  };
}

function addNumberDiff(label: string, beforeValue: number, afterValue: number, stats: FeedbackLine[]) {
  const diff = afterValue - beforeValue;
  if (diff === 0) return;
  stats.push({ label: `${label} ${diff > 0 ? "+" : ""}${diff}` });
}

function addArrayDiff(beforeItems: string[], afterItems: string[], group: string, gains: FeedbackLine[], costs: FeedbackLine[]) {
  const beforeCounts = countStrings(beforeItems);
  const afterCounts = countStrings(afterItems);
  const names = new Set([...Object.keys(beforeCounts), ...Object.keys(afterCounts)]);
  names.forEach((name) => {
    const diff = (afterCounts[name] ?? 0) - (beforeCounts[name] ?? 0);
    if (diff > 0) gains.push({ label: `${group}：${name}`, amount: diff });
    if (diff < 0) costs.push({ label: `${group}：${name}`, amount: Math.abs(diff) });
  });
}

function countStrings(items: string[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {});
}

function strongestFeedbackRarity(lines: FeedbackLine[], logs: LogEntry[]): FeedbackRarity | undefined {
  const rank: Record<string, number> = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5 };
  const candidates: FeedbackRarity[] = [];
  lines.forEach((line) => {
    if (line.rarity) candidates.push(line.rarity);
  });
  logs.forEach((log) => {
    const source = `${log.title} ${log.message} ${(log.rewards ?? []).join(" ")}`;
    if (source.includes("Legendary")) candidates.push("Legendary");
    else if (source.includes("Epic")) candidates.push("Epic");
    else if (source.includes("Rare")) candidates.push("Rare");
  });
  return candidates.sort((a, b) => (rank[b] ?? 0) - (rank[a] ?? 0))[0];
}

function feedbackIcon(type: LogType) {
  const icons: Record<LogType, string> = {
    fishing: "🎣",
    salvage: "🪝",
    crate: "🎁",
    trade: "🛒",
    cooking: "🍳",
    upgrade: "🔨",
    furniture: "🪑",
    event: "🌊",
    warning: "⚠️",
    discovery: "✨",
  };
  return icons[type];
}

function FeedbackModal({ feedback, onClose }: { feedback: FeedbackData; onClose: () => void }) {
  const rarityClass = feedback.rarity ? `feedback-rarity-${feedback.rarity.toLowerCase()}` : "";
  const hasBody = feedback.gains.length || feedback.costs.length || feedback.stats.length || feedback.warnings.length || feedback.notes.length;

  return (
    <div className="modal-backdrop feedback-backdrop" onClick={onClose}>
      <section className={`feedback-modal ${rarityClass} ${feedback.important ? "important" : ""}`} onClick={(event) => event.stopPropagation()}>
        <div className="feedback-header">
          <span className="feedback-emoji">{feedback.icon}</span>
          <div>
            <p className="eyebrow">Action Result</p>
            <h2>{feedback.title}</h2>
          </div>
        </div>
        {feedback.message && <p className="feedback-message">{feedback.message}</p>}
        {hasBody ? (
          <div className="feedback-sections">
            <FeedbackSection title="获得物品" tone="gain" lines={feedback.gains} />
            <FeedbackSection title="消耗物品" tone="cost" lines={feedback.costs} />
            <FeedbackSection title="数值变化" tone="stat" lines={feedback.stats} />
            {!!feedback.warnings.length && (
              <div className="feedback-section feedback-warning">
                <strong>特殊提示 / 失败原因</strong>
                {feedback.warnings.map((warning) => <span key={warning}>⚠️ {warning}</span>)}
              </div>
            )}
            {!!feedback.notes.length && (
              <div className="feedback-section feedback-note">
                <strong>特殊提示</strong>
                {feedback.notes.map((note) => <span key={note}>✨ {note}</span>)}
              </div>
            )}
          </div>
        ) : (
          <p className="feedback-empty">这次没有明显变化，但漂流日记已经记录下来。</p>
        )}
        <button className="primary-action feedback-confirm" onClick={onClose}>确定</button>
      </section>
    </div>
  );
}

function FeedbackSection({ title, tone, lines }: { title: string; tone: "gain" | "cost" | "stat"; lines: FeedbackLine[] }) {
  if (!lines.length) return null;
  return (
    <div className={`feedback-section feedback-${tone}`}>
      <strong>{title}</strong>
      {lines.map((line) => (
        <span className={line.rarity ? `feedback-line-rarity-${line.rarity.toLowerCase()}` : ""} key={`${title}-${line.label}-${line.amount ?? ""}`}>
          {line.label}{line.amount ? ` ×${line.amount}` : ""}
        </span>
      ))}
    </div>
  );
}

function TitleScreen({ saveSummary, hasActiveRun, onNewGame, onContinue, onLoadMenu, musicOn, onToggleMusic }: { saveSummary: SaveSummary; hasActiveRun: boolean; onNewGame: () => void; onContinue: () => void; onLoadMenu: () => void; musicOn: boolean; onToggleMusic: () => void }) {
  const snapshot = loadGame();
  const info = getSurvivalInfo(snapshot);
  return (
    <main className="title-screen">
      <img className="title-cover-image" src="/assets/title-bg.png" alt="漂流补给箱标题封面" />
      <div className="title-cover-vignette" aria-hidden="true"></div>
      <section className="title-menu-card">
        <div className="version-pill">当前版本 v0.4.1</div>
        <div className="title-logo">
          <p className="eyebrow">DRIFT CRATE</p>
          <h1>漂流补给箱</h1>
          <p>海上漂流、钓鱼囤货、开箱求生。</p>
        </div>
        <div className="title-actions">
          <button className="title-main-button" onClick={onNewGame}>▶ 开始新游戏</button>
          <button disabled={!saveSummary.exists && !hasActiveRun} onClick={onContinue}>📂 {hasActiveRun ? "返回游戏" : "继续游戏"}</button>
          <button onClick={onLoadMenu}>💾 读取存档</button>
          <button onClick={onContinue}>📘 图鉴</button>
          <button onClick={onToggleMusic}>🎵 音乐 {musicOn ? "开" : "关"}</button>
          <button onClick={onToggleMusic}>⚙ 设置</button>
        </div>
        <SaveSummaryCard saveSummary={saveSummary} />
      </section>
      <section className="title-status-bar">
        <Status label="Day" value={snapshot.day} /><Status label="Boat Lv" value={`Lv.${snapshot.boatLevel}`} />
        <Status label="金币" value={`${snapshot.coins} 🐚`} /><Status label="Hunger" value={snapshot.hunger} />
        <Status label="Mood" value={snapshot.mood} /><Status label="天气" value={snapshot.weather} />
        <Status label="阶段" value={info.phase} /><Status label="下次风暴" value={`${info.nextDisasterIn}天`} danger={info.nextDisasterIn <= 2 && snapshot.day >= 8} />
      </section>
    </main>
  );
}

function LoadScreen({ saveSummary, onBack, onLoad }: { saveSummary: SaveSummary; onBack: () => void; onLoad: () => void }) {
  return (
    <main className="start-screen">
      <section className="start-card load-card">
        <p className="eyebrow">Save Data</p>
        <h1>读取存档</h1>
        <div className={`save-slot ${saveSummary.exists ? "filled" : "empty"}`}>
          <div>
            <strong>存档 1</strong>
            {saveSummary.exists ? (
              <p>Day {saveSummary.day} · Boat Lv.{saveSummary.boatLevel} · {saveSummary.coins} 🐚</p>
            ) : (
              <p>空存档，还没有保存过漂流生活。</p>
            )}
            {saveSummary.savedAt && <small>最后保存：{formatSaveTime(saveSummary.savedAt)}</small>}
          </div>
          <button disabled={!saveSummary.exists} onClick={onLoad}>读取</button>
        </div>
        <button className="compact-button menu-back" onClick={onBack}>返回主菜单</button>
      </section>
    </main>
  );
}

function CatSelectScreen({ onBack, onChoose }: { onBack: () => void; onChoose: (catType: CatType) => void }) {
  return (
    <main className="start-screen">
      <section className="start-card">
        <p className="eyebrow">Cat Companion</p>
        <h1>选择猫猫伙伴</h1>
        <p className="intro">猫猫不会战斗，只会陪你在海上生活。黑猫 kibi 是推荐默认伙伴。</p>
        <div className="cat-select-grid">
          {catOptions.map((cat) => (
            <button className={`cat-choice-card ${cat.recommended ? "recommended" : ""}`} key={cat.type} onClick={() => onChoose(cat.type)}>
              {cat.recommended && <span className="item-badge">推荐</span>}
              <span className="cat-choice-emoji">{cat.emoji}</span>
              <strong>{cat.defaultName}</strong>
              <small>{cat.breed}</small>
              <p>{cat.personality}</p>
              <em>{cat.bonus}</em>
            </button>
          ))}
        </div>
        <button className="compact-button menu-back" onClick={onBack}>返回天赋选择</button>
      </section>
    </main>
  );
}

function CatModal({ state, onClose, onFeed }: { state: GameState; onClose: () => void; onFeed: (optionId: string) => void }) {
  const options = getCatFeedOptions(state);
  const cat = state.cat;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="wide-modal cat-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Cat Companion</p>
            <h2>{cat.emoji} {cat.name}</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <div className="cat-status-card">
          <span className="cat-big-emoji">{cat.emoji}</span>
          <div>
            <strong>{cat.name} / {cat.breed}</strong>
            <p>{cat.todayEvent ?? "猫猫正安静地待在木筏旁边。"}</p>
          </div>
        </div>
        <div className="cat-stat-grid">
          <Status label="亲密度" value={cat.intimacy} />
          <Status label="饱腹度" value={cat.satiety} danger={cat.satiety < 20} />
          <Status label="猫心情" value={cat.mood} />
        </div>
        <h3>喂猫</h3>
        {options.length ? (
          <div className="cat-feed-list">
            {options.map((option: CatFeedOption) => (
              <button key={option.id} onClick={() => onFeed(option.id)}>
                <span>{option.emoji}</span>
                <strong>{option.label}</strong>
                <small>饱腹 +{option.catSatiety} / 亲密 +{option.catIntimacy} / Mood +{option.playerMood}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="hint">背包里暂时没有适合喂猫的食物。</p>
        )}
      </section>
    </div>
  );
}

function SaveSummaryCard({ saveSummary }: { saveSummary: SaveSummary }) {
  return (
    <div className={`save-summary ${saveSummary.exists ? "filled" : "empty"}`}>
      <strong>{saveSummary.exists ? "已发现存档" : "暂无存档"}</strong>
      {saveSummary.exists ? (
        <p>Day {saveSummary.day} · Boat Lv.{saveSummary.boatLevel} · {saveSummary.coins} 🐚{saveSummary.savedAt ? ` · ${formatSaveTime(saveSummary.savedAt)}` : ""}</p>
      ) : (
        <p>开始新游戏后，点击游戏内“保存游戏”即可写入本地存档。</p>
      )}
    </div>
  );
}

function formatSaveTime(savedAt: string) {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function furnitureIcon(name: string) {
  if (name.includes("灯")) return "🏮";
  if (name.includes("桌") || name.includes("火锅")) return "🪵";
  if (name.includes("椅")) return "🪑";
  if (name.includes("床") || name.includes("床垫")) return "🛏️";
  if (name.includes("沙发")) return "🛋️";
  if (name.includes("温泉")) return "♨️";
  if (name.includes("马桶")) return "🚽";
  if (name.includes("箱")) return "📦";
  return "🪴";
}

function ActionButton({ badge, className = "", children, onClick }: { badge?: string; className?: string; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`action-button ${className} ${badge ? "has-badge" : ""}`} onClick={onClick}>
      {badge && <span className="button-badge">{badge}</span>}
      {children}
    </button>
  );
}

function TideShop({ state, onBuy }: { state: GameState; onBuy: (item: ShopItem) => void }) {
  const daysLeft = 7 - ((state.day - 1) % 7);
  return (
    <div className="tide-shop">
      <div className="section-heading">
        <h3>🌊 潮汐商店</h3>
        <span className="notice-pill">{daysLeft}天后刷新</span>
      </div>
      <div className="shop-stock-grid">
        {state.shopStock.map((item) => (
          <button className={`shop-card rarity-${item.rarity.toLowerCase()}`} key={item.id} disabled={item.quantity <= 0} onClick={() => onBuy(item)}>
            <span>{itemEmoji[item.id]}</span>
            <strong>{itemNames[item.id]}</strong>
            <small>{categoryLabels[item.category]} · {item.rarity}</small>
            <em>{item.price} 🐚 · x{item.quantity}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function InventoryPanel({ state, filter, onFilter }: { state: GameState; filter: ItemCategory | "all"; onFilter: (value: ItemCategory | "all") => void }) {
  const items = (Object.keys(state.inventory) as ItemId[]).filter((id) => state.inventory[id] > 0 && (filter === "all" || itemMeta[id].category === filter));
  return (
    <>
      <div className="filter-row">
        {(Object.keys(categoryLabels) as (ItemCategory | "all")[]).map((category) => (
          <button className={filter === category ? "active-filter" : ""} key={category} onClick={() => onFilter(category)}>{categoryLabels[category]}</button>
        ))}
      </div>
      <div className="inventory-grid">
        {items.length ? items.map((itemId) => (
          <div className={`item has-item rarity-border-${itemMeta[itemId].rarity.toLowerCase()}`} key={itemId}>
            {(itemId === "commonCrate" || itemId === "premiumCrate") && <span className="item-badge">可开</span>}
            {itemMeta[itemId].category === "food" && <span className="item-badge">可吃</span>}
            {itemMeta[itemId].category === "furniture" && <span className="item-badge">可布置</span>}
            {itemMeta[itemId].category === "equipment" && <span className="item-badge">可装备</span>}
            <span>{itemEmoji[itemId]}</span>
            <strong>{itemNames[itemId]}</strong>
            <em>x{state.inventory[itemId]}</em>
          </div>
        )) : <p className="hint">这个分类暂时没有物品。</p>}
      </div>
    </>
  );
}

function TutorialModal({ onClose }: { onClose: (never: boolean) => void }) {
  return (
    <div className="modal-backdrop">
      <section className="wide-modal tutorial-modal">
        <h2>📘 新手漂流须知</h2>
        <ol>
          <li>钓鱼可以获得食物和卖钱。</li>
          <li>打捞可以获得材料。</li>
          <li>补给包会开出生活物资、工具、家具和装备。</li>
          <li>饥饿过低会进入虚弱状态。</li>
          <li>船体耐久过低会在风暴中很危险。</li>
          <li>每 7 天潮汐商店会刷新。</li>
          <li>新手安全期结束后，海上会变得更危险。</li>
          <li>升级载具可以抵御更强天气，并解锁更多小屋空间。</li>
        </ol>
        <div className="modal-actions">
          <button className="primary-action" onClick={() => onClose(false)}>我知道了</button>
          <button onClick={() => onClose(true)}>不再显示</button>
        </div>
      </section>
    </div>
  );
}

function GameOverScreen({ state, completion, onRestart, onTitle }: { state: GameState; completion: number; onRestart: () => void; onTitle: () => void }) {
  const legendary = state.logs.flatMap((log) => log.rewards ?? []).filter((reward) => reward.includes("Legendary"));
  return (
    <main className="start-screen">
      <section className="start-card">
        <p className="eyebrow">Ending</p>
        <h1>漂流暂告一段落</h1>
        <p className="intro">{state.gameOverReason}。你被路过的商船温柔救起。</p>
        <div className="ending-grid">
          <Status label="存活天数" value={state.day} />
          <Status label="最高载具" value={`Lv.${state.boatLevel}`} />
          <Status label="图鉴完成" value={`${completion}%`} />
          <Status label="Legendary" value={legendary.length || "暂无"} />
        </div>
        <div className="modal-actions">
          <button className="primary-action" onClick={onRestart}>重新开始</button>
          <button onClick={onTitle}>返回标题页</button>
        </div>
      </section>
    </main>
  );
}

function RecentActivity({ logs, expanded, onToggle, onViewFull }: { logs: LogEntry[]; expanded: boolean; onToggle: () => void; onViewFull: () => void }) {
  const visibleLogs = logs.slice(0, expanded ? 5 : 3);

  return (
    <section className="panel recent-panel">
      <div className="section-heading">
        <h2>📢 最近动态</h2>
        {!!logs.length && <span className="notice-pill">{logs.length}</span>}
      </div>
      <div className="recent-list">
        {visibleLogs.map((log, index) => (
          <article className={`recent-entry recent-${log.type} ${index === 0 ? "latest" : ""} ${log.important ? "important" : ""}`} key={log.id}>
            <span className="recent-icon">{logIcon[log.type]}</span>
            <div>
              <strong>
                {log.title}
                {log.isNew && <span className="new-pill">NEW</span>}
              </strong>
              <p>{shortLogMessage(log.message)}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="recent-actions">
        <button className="compact-button" onClick={onToggle}>{expanded ? "收起" : "展开"}</button>
        <button className="compact-button" onClick={onViewFull}>查看完整日记</button>
      </div>
    </section>
  );
}

function shortLogMessage(message: string) {
  const cleaned = message.replace(/[「」]/g, "").replace(/^你/, "");
  return cleaned.length > 34 ? `${cleaned.slice(0, 34)}...` : cleaned;
}

function RequirementList({ state, items, coins = 0 }: { state: GameState; items: Partial<Record<ItemId, number>>; coins?: number }) {
  return (
    <div className="requirements">
      {Object.entries(items).map(([itemId, amount]) => {
        const id = itemId as ItemId;
        const owned = state.inventory[id];
        const need = amount ?? 0;
        const ready = owned >= need;
        return (
          <span className={ready ? "met" : "missing"} key={id}>
            {itemEmoji[id]} {itemNames[id]} {owned}/{need}
          </span>
        );
      })}
      {coins > 0 && <span className={state.coins >= coins ? "met" : "missing"}>🐚 贝壳币 {state.coins}/{coins}</span>}
    </div>
  );
}

function SellFishModal({ state, focusFishId, onClose, onSell }: { state: GameState; focusFishId?: string; onClose: () => void; onSell: (selections: Record<string, number>) => void }) {
  const ownedFish = fishList.filter((fishItem) => (state.fishCollection[fishItem.id]?.count ?? 0) > 0);
  const defaultSelections = useMemo(() => {
    const selections: Record<string, number> = {};
    ownedFish.forEach((fishItem) => {
      const count = state.fishCollection[fishItem.id]?.count ?? 0;
      const safeDefault = fishItem.rarity === "Common" || fishItem.rarity === "Uncommon";
      selections[fishItem.id] = focusFishId ? (fishItem.id === focusFishId ? count : 0) : safeDefault ? count : 0;
    });
    return selections;
  }, [focusFishId, ownedFish, state.fishCollection]);
  const [selections, setSelections] = useState<Record<string, number>>(defaultSelections);
  const bonus = state.talent === "trading" ? 1.2 : 1;
  const selectedRows = ownedFish.filter((fishItem) => (selections[fishItem.id] ?? 0) > 0);
  const selectedCount = selectedRows.reduce((sum, fishItem) => sum + (selections[fishItem.id] ?? 0), 0);
  const estimatedCoins = selectedRows.reduce((sum, fishItem) => {
    const price = state.fishPrices[fishItem.id] ?? fishItem.basePrice;
    return sum + Math.floor((selections[fishItem.id] ?? 0) * price * bonus);
  }, 0);
  const includesRareFish = selectedRows.some((fishItem) => fishItem.rarity === "Rare" || fishItem.rarity === "Epic" || fishItem.rarity === "Legendary");

  const setFishAmount = (fishId: string, amount: number) => {
    const max = state.fishCollection[fishId]?.count ?? 0;
    setSelections((current) => ({ ...current, [fishId]: Math.max(0, Math.min(max, amount)) }));
  };
  const selectAll = () => setSelections(Object.fromEntries(ownedFish.map((fishItem) => [fishItem.id, state.fishCollection[fishItem.id]?.count ?? 0])));
  const clearAll = () => setSelections(Object.fromEntries(ownedFish.map((fishItem) => [fishItem.id, 0])));
  const selectCommonFish = () =>
    setSelections(
      Object.fromEntries(
        ownedFish.map((fishItem) => [
          fishItem.id,
          fishItem.rarity === "Common" || fishItem.rarity === "Uncommon" ? state.fishCollection[fishItem.id]?.count ?? 0 : 0,
        ]),
      ),
    );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="wide-modal sell-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Trade</p>
            <h2>🛒 出售鱼获</h2>
          </div>
          <button className="compact-button" onClick={onClose}>取消</button>
        </div>

        {ownedFish.length ? (
          <>
            <div className="sell-tools">
              <button onClick={selectAll}>全选</button>
              <button onClick={clearAll}>取消全选</button>
              <button onClick={selectCommonFish}>选择 Common / Uncommon 鱼</button>
            </div>
            <div className="sell-fish-list">
              {ownedFish.map((fishItem) => (
                <SellFishRow
                  key={fishItem.id}
                  fish={fishItem}
                  state={state}
                  amount={selections[fishItem.id] ?? 0}
                  bonus={bonus}
                  onAmountChange={(amount) => setFishAmount(fishItem.id, amount)}
                />
              ))}
            </div>
            <div className={`sell-summary ${includesRareFish ? "has-rare" : ""}`}>
              <strong>已选择 {selectedRows.length} 种鱼，共 {selectedCount} 条</strong>
              <p>预计获得：{estimatedCoins} 贝壳币{bonus > 1 ? "（含交易天赋加成）" : ""}</p>
              <p>包含稀有鱼：{includesRareFish ? "是" : "否"}</p>
              {includesRareFish && <p className="rare-warning">⚠️ 你选择了稀有鱼出售，请确认是否继续。</p>}
            </div>
            <div className="modal-actions">
              <button onClick={onClose}>取消</button>
              <button className="primary-action" disabled={selectedCount <= 0} onClick={() => onSell(selections)}>确认出售</button>
            </div>
          </>
        ) : (
          <div className="empty-sell-state">
            <strong>暂无鱼获</strong>
            <p>先去钓鱼吧，鱼篓空空的时候海上商人也只能摊手。</p>
          </div>
        )}
      </section>
    </div>
  );
}

function SellFishRow({ fish, state, amount, bonus, onAmountChange }: { fish: Fish; state: GameState; amount: number; bonus: number; onAmountChange: (amount: number) => void }) {
  const owned = state.fishCollection[fish.id]?.count ?? 0;
  const price = state.fishPrices[fish.id] ?? fish.basePrice;
  const ratio = price / fish.basePrice;
  const tone = ratio >= 1.2 ? "高价" : ratio < 0.9 ? "低价" : "普通";
  const subtotal = Math.floor(amount * price * bonus);
  const isRare = fish.rarity === "Rare" || fish.rarity === "Epic" || fish.rarity === "Legendary";

  return (
    <article className={`sell-fish-row ${amount > 0 ? "selected" : ""} ${isRare ? "rare-keep" : ""}`}>
      <label className="sell-check">
        <input type="checkbox" checked={amount > 0} onChange={(event) => onAmountChange(event.target.checked ? owned : 0)} />
        <span>{fish.emoji}</span>
      </label>
      <div className="sell-fish-main">
        <strong>{fish.name}</strong>
        <p>{fish.rarity}{isRare ? " · ⚠️ 稀有鱼，默认保留" : ""}</p>
        <p>拥有：{owned} 条</p>
      </div>
      <div className="sell-price">
        <strong className={tone === "高价" ? "price-good" : tone === "低价" ? "price-bad" : ""}>{price} 贝壳币 / 条 · {tone}</strong>
        <span>小计：{subtotal} 贝壳币</span>
      </div>
      <div className="amount-stepper">
        <button disabled={amount <= 0} onClick={() => onAmountChange(amount - 1)}>-</button>
        <input
          min={0}
          max={owned}
          type="number"
          value={amount}
          onChange={(event) => onAmountChange(Number(event.target.value))}
        />
        <button disabled={amount >= owned} onClick={() => onAmountChange(amount + 1)}>+</button>
      </div>
    </article>
  );
}

function FishTradeCard({ fish, state, onSell }: { fish: Fish; state: GameState; onSell: () => void }) {
  const entry = state.fishCollection[fish.id];
  const count = entry?.count ?? 0;
  const price = state.fishPrices[fish.id] ?? fish.basePrice;
  const ratio = price / fish.basePrice;
  const tone = ratio >= 1.2 ? "高价" : ratio < 0.9 ? "低价" : "普通";
  const discovered = entry?.discovered;

  return (
    <button className={`fish-trade-card ${count > 0 ? "sellable" : ""}`} disabled={count <= 0} onClick={onSell}>
      <span className="fish-icon">{discovered ? fish.emoji : "❔"}</span>
      <strong>{discovered ? fish.name : "未知鱼获"}</strong>
      <small>x{count}</small>
      <em className={tone === "高价" ? "price-good" : tone === "低价" ? "price-bad" : ""}>{price} 🐚 · {tone}</em>
    </button>
  );
}

function FishDexCard({ fish, state }: { fish: Fish; state: GameState }) {
  const entry = state.fishCollection[fish.id];
  const discovered = !!entry?.discovered;
  const isNew = state.newestFishId === fish.id;

  return (
    <article className={`fish-card rarity-fish-${fish.rarity.toLowerCase()} ${discovered ? "discovered" : "unknown"} ${isNew ? "new-discovery" : ""}`}>
      {isNew && <span className="new-pill">NEW</span>}
      <span className="fish-icon">{discovered ? fish.emoji : "❔"}</span>
      <h3>{discovered ? fish.name : "？？？"}</h3>
      <strong>{discovered ? fish.rarity : "Unknown"}</strong>
      <p>{discovered ? fish.description : "还没有发现这种鱼。"}</p>
      {discovered && (
        <div className="fish-meta">
          <span>基础价 {fish.basePrice} 🐚</span>
          <span>已钓到 {entry?.count ?? 0}</span>
          <span>{fish.weatherHint?.join(" / ")}</span>
          <span>{fish.timeHint}</span>
        </div>
      )}
    </article>
  );
}

function CrateModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const crateType = state.lastCrateType ?? "commonCrate";
  const drops = state.lastCrateDrops ?? [];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="crate-modal crate-drops-modal" onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">{crateType === "premiumCrate" ? "高级补给包" : "普通补给包"}</p>
        <span className="modal-emoji">{crateType === "premiumCrate" ? "💝" : "🎁"}</span>
        <h2>本次运气：{state.lastCrateLuck ?? "普通"}</h2>
        <div className="drop-list">
          {drops.length ? drops.map((drop) => <span key={drop}>{drop}</span>) : <p>补给箱空空如也，可能被潮水打湿了。</p>}
        </div>
        <button onClick={onClose}>收下</button>
      </section>
    </div>
  );
}

function CookingModal({ state, onClose, onCook }: { state: GameState; onClose: () => void; onCook: (recipeId: string) => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="wide-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Cooking</p>
            <h2>🍳 制作料理</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} state={state} onCook={() => onCook(recipe.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RecipeCard({ recipe, state, onCook }: { recipe: Recipe; state: GameState; onCook: () => void }) {
  const status = getRecipeStatus(state, recipe);
  const food = foodItems.find((item) => item.id === recipe.output);

  return (
    <article className={`recipe-card ${status.canCook ? "craftable" : ""}`}>
      {status.canCook && <span className="item-badge">可制作</span>}
      <div className="recipe-title">
        <span>{recipe.emoji}</span>
        <div>
          <h3>{recipe.name}</h3>
          <p>{recipe.description}</p>
        </div>
      </div>
      <div className="recipe-block">
        <strong>所需材料</strong>
        <RequirementList state={state} items={recipe.fixedCost} />
        {recipe.fishCount && (
          <span className={status.selectedFish.length >= recipe.fishCount ? "fish-requirement met" : "fish-requirement missing"}>
            🐟 {recipe.rareFishOnly ? "Rare以上鱼" : "Common/Uncommon鱼"} {status.selectedFish.length}/{recipe.fishCount}
          </span>
        )}
      </div>
      <div className="recipe-result">
        <span>获得：{itemEmoji[recipe.output]} {itemNames[recipe.output]} x1</span>
        {food && <span>进食效果：Hunger +{food.hunger} / Mood +{food.mood}</span>}
      </div>
      <p className={status.canCook ? "ready" : "hint"}>{status.canCook ? "材料齐了，可以制作。" : `还缺：${status.missing.join("、")}`}</p>
      <button className={status.canCook ? "primary-action" : ""} aria-disabled={!status.canCook} onClick={onCook}>制作</button>
    </article>
  );
}

function EatingModal({ state, onClose, onEat }: { state: GameState; onClose: () => void; onEat: (foodId: ItemId) => void }) {
  const ownedFoods = foodItems.filter((food) => (state.inventory[food.id] ?? 0) > 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="wide-modal food-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Meal Time</p>
            <h2>🍽 进食</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <div className="food-list">
          {ownedFoods.map((food) => (
            <FoodRow key={food.id} food={food} state={state} onEat={() => onEat(food.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FoodRow({ food, state, onEat }: { food: Food; state: GameState; onEat: () => void }) {
  const tooFull = state.hunger >= 95;

  return (
    <article className="food-row">
      <span className="food-emoji">{food.emoji}</span>
      <div>
        <h3>{food.name} <small>x{state.inventory[food.id]}</small></h3>
        <p>{food.description}</p>
        <strong>Hunger +{food.hunger} / Mood +{food.mood}</strong>
      </div>
      <button className="primary-action" onClick={onEat}>{tooFull ? "先存着" : "吃掉"}</button>
    </article>
  );
}

function Status({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={danger ? "status danger" : "status"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
