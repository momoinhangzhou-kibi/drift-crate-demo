import { useEffect, useMemo, useState, type ReactNode } from "react";
import { boatNames, fishList, itemEmoji, itemNames, talents } from "./game/data";
import {
  buyItem,
  canCookHotpot,
  canUpgradeBoat,
  cookHotpot,
  decorate,
  endDay,
  fish,
  getMissingRequirements,
  getUpgradeCost,
  hasFishToSell,
  loadGame,
  openCrate,
  repairBoat,
  resetGame,
  salvage,
  saveGame,
  sellAllFish,
  sellFish,
  startGame,
  upgradeBoat,
} from "./game/logic";
import { Fish, GameState, ItemId, LogType, Rarity, TalentId } from "./game/types";

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

const hotpotCost: Partial<Record<ItemId, number>> = { hotpotBase: 1, veggiePack: 1, meatSlices: 1, water: 1 };

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
  const [showCrate, setShowCrate] = useState(false);
  const selectedTalent = talents.find((talent) => talent.id === state.talent);
  const upgradeCost = useMemo(() => getUpgradeCost(state), [state]);
  const hotpotMissing = useMemo(() => getMissingRequirements(state, hotpotCost), [state]);
  const readyToCook = canCookHotpot(state);
  const readyToUpgrade = canUpgradeBoat(state);
  const readyToDecorate = state.inventory.furnitureTicket > 0;
  const readyToSell = hasFishToSell(state);
  const discoveredCount = fishList.filter((fishItem) => state.fishCollection[fishItem.id]?.discovered).length;
  const completion = Math.round((discoveredCount / fishList.length) * 100);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  const update = (next: GameState) => setState(next);

  const openCrateAndShow = (crate: "commonCrate" | "premiumCrate") => {
    update(openCrate(state, crate));
    setShowCrate(true);
  };

  if (!state.started) {
    return (
      <main className="start-screen">
        <section className="start-card">
          <p className="eyebrow">Drift Crate</p>
          <h1>漂流补给箱</h1>
          <p className="intro">选择一个初始天赋，带着小木筏、旧鱼竿和潮汐系统，开始你的海上小家计划。</p>
          <div className="talent-grid">
            {talents.map((talent) => (
              <button className="talent-card" key={talent.id} onClick={() => update(startGame(talent.id as TalentId))}>
                <span>{talent.emoji}</span>
                <strong>{talent.name}</strong>
                <small>{talent.description}</small>
              </button>
            ))}
          </div>
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
            <ActionButton badge={readyToCook ? "可做" : undefined} onClick={() => update(cookHotpot(state))}>
              🍲 制作料理
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
            <button className="sell-all" onClick={() => update(sellAllFish(state))}>出售所有鱼获</button>
            <div className="fish-trade-grid">
              {fishList.map((fishItem) => (
                <FishTradeCard key={fishItem.id} fish={fishItem} state={state} onSell={() => update(sellFish(state, fishItem.id))} />
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
            <h2>🍲 漂流火锅</h2>
            <RequirementList state={state} items={hotpotCost} />
            <p className={hotpotMissing.length ? "hint" : "ready"}>{hotpotMissing.length ? `还缺：${hotpotMissing.join("、")}` : "材料齐了，可以开锅！"}</p>
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
        <section className="panel log-panel">
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
          <button onClick={() => saveGame(state)}>保存游戏</button>
          <button
            className="danger-button"
            onClick={() => {
              setShowCrate(false);
              update(resetGame());
            }}
          >
            重置游戏
          </button>
        </section>
      </section>

      {showCrate && state.lastCard && <CrateModal card={state.lastCard} crateType={state.lastCrateType ?? "commonCrate"} onClose={() => setShowCrate(false)} />}
    </main>
  );
}

function ActionButton({ badge, className = "", children, onClick }: { badge?: string; className?: string; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`action-button ${className} ${badge ? "has-badge" : ""}`} onClick={onClick}>
      {badge && <span className="button-badge">{badge}</span>}
      {children}
    </button>
  );
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

function FishTradeCard({ fish, state, onSell }: { fish: Fish; state: GameState; onSell: () => void }) {
  const entry = state.fishCollection[fish.id];
  const count = entry?.count ?? 0;
  const price = state.fishPrices[fish.id] ?? fish.basePrice;
  const ratio = price / fish.basePrice;
  const tone = ratio >= 1.2 ? "高价" : ratio < 0.9 ? "低价" : "普通";
  const discovered = entry?.discovered;

  return (
    <button className={`fish-trade-card ${count > 0 ? "sellable" : ""}`} onClick={onSell}>
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

function Status({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={danger ? "status danger" : "status"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
