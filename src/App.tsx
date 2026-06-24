import { useMemo, useRef, useState, type ReactNode } from "react";
import { boatNames, fishList, foodItems, itemEmoji, itemNames, recipes, talents } from "./game/data";
import {
  buyItem,
  canCookAnyRecipe,
  canUpgradeBoat,
  cookRecipe,
  decorate,
  endDay,
  eatFood,
  fish,
  getRecipeStatus,
  getMissingRequirements,
  getUpgradeCost,
  getSaveSummary,
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
import { Fish, Food, GameState, ItemId, LogEntry, LogType, Rarity, Recipe, TalentId } from "./game/types";

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

type ViewState = "title" | "talentSelect" | "playing" | "loadMenu";

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
  const [sellFocusFishId, setSellFocusFishId] = useState<string | undefined>();
  const [recentExpanded, setRecentExpanded] = useState(false);
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

  const update = (next: GameState) => setState(next);

  const refreshSaveSummary = () => setSaveSummary(getSaveSummary());

  const startNewGameFlow = () => {
    if (hasSavedGame() && !window.confirm("已经存在存档。开始新游戏不会立刻删除旧存档，但下次保存会覆盖当前进度。是否继续？")) return;
    setView("talentSelect");
  };

  const chooseTalent = (talent: TalentId) => {
    setState(startGame(talent));
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
    update(resetGame());
    refreshSaveSummary();
    setView("title");
  };

  const openCrateAndShow = (crate: "commonCrate" | "premiumCrate") => {
    update(openCrate(state, crate));
    setShowCrate(true);
  };

  const openEatingPanel = () => {
    if (!hasEdibleFood(state)) {
      update(noteNoFood(state));
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
      update({
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Drift Crate</p>
          <h1>漂流补给箱</h1>
          <button className="compact-button" onClick={() => setView("title")}>返回主菜单</button>
        </div>
        <div className="status-grid">
          <Status label="Day" value={state.day} />
          <Status label="Weather" value={state.weather} />
          <Status label="Hunger" value={state.hunger} danger={state.hunger <= 15} />
          <Status label="Mood" value={state.mood} />
          <Status label="Coins" value={`${state.coins} 🐚`} />
          <Status label="Boat HP" value={`${state.boatHp}/${state.boatMaxHp}`} danger={state.boatHp <= 15} />
          <Status label="Boat Level" value={`Lv.${state.boatLevel}`} />
        </div>
      </header>

      <section className="layout">
        <div className="main-column">
          <section className="boat-panel panel">
            <div className={`boat-scene level-${state.boatLevel}`}>
              <div className="sun">☀️</div>
              <div className="boat">
                <div className="boat-roof">{state.boatLevel >= 3 ? "🏠" : state.boatLevel === 2 ? "⛵" : "🪵"}</div>
                <div className="boat-body">{boatNames[state.boatLevel]}</div>
                <div className="waves">≈≈≈≈≈≈≈≈≈≈≈</div>
              </div>
            </div>
            <div className="boat-info">
              <h2>{boatNames[state.boatLevel]}</h2>
              <p>天赋：{selectedTalent ? `${selectedTalent.emoji} ${selectedTalent.name}` : "未选择"}</p>
              <h3>下次升级</h3>
              {state.boatLevel >= 4 ? <p>已达到 Demo 最高等级。</p> : <RequirementList state={state} items={upgradeCost.items} coins={upgradeCost.coins} />}
              {state.boatHp <= 0 && <strong className="warning">载具严重损坏，需要尽快修理。</strong>}
            </div>
          </section>

          <section className="actions panel">
            <ActionButton onClick={() => update(fish(state))}>🎣 钓鱼</ActionButton>
            <ActionButton onClick={() => update(salvage(state))}>🪝 打捞</ActionButton>
            <ActionButton badge={state.inventory.commonCrate > 0 ? "可开" : undefined} onClick={() => openCrateAndShow("commonCrate")}>
              🎁 开普通包 x{state.inventory.commonCrate}
            </ActionButton>
            <ActionButton badge={state.inventory.premiumCrate > 0 ? "可开" : undefined} onClick={() => openCrateAndShow("premiumCrate")}>
              💝 开高级包 x{state.inventory.premiumCrate}
            </ActionButton>
            <ActionButton badge={readyToUpgrade ? "可升级" : undefined} onClick={() => update(upgradeBoat(state))}>
              🔨 升级载具
            </ActionButton>
            <ActionButton onClick={() => update(repairBoat(state))}>🧰 修理载具</ActionButton>
            <ActionButton badge={readyToCook ? "可做" : undefined} onClick={() => setShowCooking(true)}>
              🍲 制作料理
            </ActionButton>
            <ActionButton badge={readyToEat ? "可吃" : undefined} onClick={openEatingPanel}>
              🍽 进食
            </ActionButton>
            <ActionButton badge={readyToDecorate ? "可布置" : undefined} onClick={() => update(decorate(state))}>
              🪑 布置家具
            </ActionButton>
            <ActionButton className="night" onClick={() => update(endDay(state))}>🌙 结束一天</ActionButton>
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
            <div className="shop-row">
              <button onClick={() => update(buyItem(state, "commonCrate"))}>买普通补给包 30 🐚</button>
              <button onClick={() => update(buyItem(state, "premiumCrate"))}>买高级补给包 100 🐚</button>
              <button onClick={() => update(buyItem(state, "water"))}>买淡水 10 🐚</button>
              <button onClick={() => update(buyItem(state, "wood"))}>买木板 5 🐚</button>
            </div>
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

        <aside className="side-column">
          <RecentActivity
            logs={state.logs}
            expanded={recentExpanded}
            onToggle={() => setRecentExpanded((value) => !value)}
            onViewFull={() => logPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />

          <section className="panel inventory">
            <h2>🎒 背包</h2>
            <div className="inventory-grid">
              {materialOrder.map((itemId) => (
                <div className={`item ${state.inventory[itemId] > 0 ? "has-item" : "empty-item"}`} key={itemId}>
                  {(itemId === "commonCrate" || itemId === "premiumCrate") && state.inventory[itemId] > 0 && <span className="item-badge">可开</span>}
                  {itemId === "furnitureTicket" && state.inventory[itemId] > 0 && <span className="item-badge">可用</span>}
                  <span>{itemEmoji[itemId]}</span>
                  <strong>{itemNames[itemId]}</strong>
                  <em>x{state.inventory[itemId]}</em>
                </div>
              ))}
              {foodOrder.map((itemId) => (
                <div className={`item food-item ${state.inventory[itemId] > 0 ? "has-item edible-item" : "empty-item"}`} key={itemId}>
                  {state.inventory[itemId] > 0 && <span className="item-badge">可食用</span>}
                  <span>{itemEmoji[itemId]}</span>
                  <strong>{itemNames[itemId]}</strong>
                  <em>x{state.inventory[itemId]}</em>
                </div>
              ))}
            </div>
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

      {showCrate && state.lastCard && <CrateModal card={state.lastCard} crateType={state.lastCrateType ?? "commonCrate"} onClose={() => setShowCrate(false)} />}
      {showCooking && (
        <CookingModal
          state={state}
          onClose={() => setShowCooking(false)}
          onCook={(recipeId) => {
            update(cookRecipe(state, recipeId));
          }}
        />
      )}
      {showEating && (
        <EatingModal
          state={state}
          onClose={() => setShowEating(false)}
          onEat={(foodId) => {
            update(eatFood(state, foodId));
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
            update(sellSelectedFish(state, selections));
            setShowSelling(false);
            setSellFocusFishId(undefined);
          }}
        />
      )}
    </main>
  );
}

function TitleScreen({ saveSummary, hasActiveRun, onNewGame, onContinue, onLoadMenu }: { saveSummary: SaveSummary; hasActiveRun: boolean; onNewGame: () => void; onContinue: () => void; onLoadMenu: () => void }) {
  return (
    <main className="title-screen">
      <section className="title-card">
        <div className="title-art" aria-hidden="true">
          <div className="title-sun">☀️</div>
          <div className="title-cloud">☁️</div>
          <div className="title-crate">🎁</div>
          <div className="title-raft">🪵</div>
          <div className="title-waves">≈≈≈≈≈≈≈≈≈≈≈≈</div>
        </div>
        <p className="eyebrow">DRIFT CRATE</p>
        <h1>漂流补给箱</h1>
        <p className="title-subtitle">海上漂流、钓鱼囤货、开箱求生的轻松冒险。</p>
        <p className="title-tagline">今天也来海上开一箱补给吧。</p>
        <div className="title-actions">
          <button className="primary-action" onClick={onNewGame}>开始新游戏</button>
          <button disabled={!saveSummary.exists && !hasActiveRun} onClick={onContinue}>{hasActiveRun ? "返回游戏" : "继续游戏"}</button>
          <button onClick={onLoadMenu}>读取存档</button>
        </div>
        <SaveSummaryCard saveSummary={saveSummary} />
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

function ActionButton({ badge, className = "", children, onClick }: { badge?: string; className?: string; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`action-button ${className} ${badge ? "has-badge" : ""}`} onClick={onClick}>
      {badge && <span className="button-badge">{badge}</span>}
      {children}
    </button>
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

function CrateModal({ card, crateType, onClose }: { card: { name: string; rarity: Rarity; emoji: string; description: string }; crateType: "commonCrate" | "premiumCrate"; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className={`crate-modal rarity-${card.rarity.toLowerCase()}`} onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">{crateType === "premiumCrate" ? "高级补给包" : "普通补给包"}</p>
        <span className="modal-emoji">{card.emoji}</span>
        <h2>{card.name}</h2>
        <strong>{card.rarity}</strong>
        <p>{card.description}</p>
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
      <button className={status.canCook ? "primary-action" : ""} disabled={!status.canCook} onClick={onCook}>制作</button>
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
