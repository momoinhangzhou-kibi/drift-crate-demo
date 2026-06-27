import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { boatNames, catOptions, fishList, foodItems, itemEmoji, itemMeta, itemNames, recipes, talents } from "./game/data";
import {
  abandonOrder,
  buyShopItem,
  canCookAnyRecipe,
  canCompleteOrder,
  canUpgradeBoat,
  completeOrder,
  cookRecipe,
  decorate,
  deleteSaveSlot,
  endDay,
  eatFood,
  exploreWithCat,
  feedCat,
  autosaveGame,
  getActiveSaveId,
  fish,
  fishWithMiniGame,
  getCatFeedOptions,
  getRecipeStatus,
  getRepairPreview,
  getMissingRequirements,
  getUpgradeCost,
  getSaveSummary,
  getSaveSlots,
  getMoodStatus,
  getSurvivalInfo,
  hasEdibleFood,
  hasFishToSell,
  hasSavedGame,
  loadGame,
  loadGameWithLog,
  noteNoFood,
  openCrate,
  petCat,
  placeInventoryFurniture,
  playWithCat,
  repairBoat,
  removeFurniture,
  resetGame,
  salvage,
  renameSaveSlot,
  saveGame,
  saveGameAs,
  saveGameWithLog,
  sellSelectedFish,
  startGame,
  upgradeBoat,
  useUtilityItem,
} from "./game/logic";
import type { SaveSummary } from "./game/logic";
import type { SaveSlot } from "./game/logic";
import { CatFeedOption, CatOption, CatState, CatType, Fish, FishingMode, FishRarity, Food, GameState, ItemCategory, ItemId, LogEntry, LogType, Rarity, Recipe, SeaOrder, ShopItem, TalentId } from "./game/types";

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

const foodOrder: ItemId[] = ["grilledFish", "fishSoup", "grilledFishSkewer", "seafoodSkewer", "shrimpRiceBall", "seafoodSoup", "cannedRamen", "warmFishSoup", "searedTuna", "rainbowSashimi", "driftHotpot", "deluxeSeafoodPot", "survivorFeast"];
const categoryLabels: Record<ItemCategory | "all", string> = { all: "全部", materials: "材料", food: "食物", tools: "工具", hygiene: "卫生", furniture: "家具", equipment: "装备", special: "特殊" };

type ViewState = "title" | "talentSelect" | "catSelect" | "playing" | "loadMenu";
type ModulePanel = "inventory" | "shop" | "orders" | "dex" | "recipes" | "journal" | "cat" | "home" | "guide" | "settings";
type TitlePanel = "dex" | "settings";
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

type MusicTrack = {
  id: string;
  name: string;
  file: string;
  description: string;
};

type MusicMode = "random" | string;
type TalentChoiceMode = "manual" | "random" | "three";

const MUSIC_SETTINGS_KEY = "drift-crate-music-settings";
const TALENT_CHOICE_MODE_KEY = "drift-crate-talent-choice-mode";
const musicTracks: MusicTrack[] = [
  { id: "ocean-cozy-1", name: "海风小屋", file: `${import.meta.env.BASE_URL}assets/audio/ocean-cozy-1.mp3`, description: "温暖、治愈，适合整理海上小家。" },
  { id: "ocean-cozy-2", name: "漂流午后", file: `${import.meta.env.BASE_URL}assets/audio/ocean-cozy-2.mp3`, description: "轻松午后感，适合钓鱼和开箱。" },
  { id: "ocean-cozy-3", name: "轻快海浪", file: `${import.meta.env.BASE_URL}assets/audio/ocean-cozy-3.mp3`, description: "更活泼的海浪节奏，适合经营补给站。" },
];

function readTalentChoiceMode(): TalentChoiceMode {
  const saved = localStorage.getItem(TALENT_CHOICE_MODE_KEY);
  return saved === "manual" || saved === "random" || saved === "three" ? saved : "three";
}

function drawTalents(amount: number) {
  return [...talents].sort(() => Math.random() - 0.5).slice(0, amount);
}

function talentStartingText(talent: (typeof talents)[number]) {
  const items = Object.entries(talent.startingItems ?? {}).map(([id, amount]) => `${itemNames[id as ItemId]} x${amount}`);
  const equipment = (talent.startingEquipment ?? []).map((item) => item === "grill" ? "海上烧烤架" : displayName(item));
  return [...items, ...equipment].join("、") || "无额外物资";
}

const equipmentNames: Record<string, string> = {
  oldRod: "旧钓鱼竿",
  sturdyRod: "结实钓鱼竿",
  advancedRod: "高级钓鱼竿",
  advancedRodItem: "高级钓鱼竿",
  goldenRod: "黄金钓鱼竿",
  waterPurifier: "自动净水器",
  solarPurifier: "太阳能净水器",
  fishingNet: "渔网",
  grill: "烤架",
  kitchen: "移动海上厨房",
  shopPermit: "海上便利店许可证",
  waterproofBackpack: "防水背包",
};

const catAssetByType: Record<CatType, string> = {
  black: `${import.meta.env.BASE_URL}assets/cats/kibi.png`,
  cow: `${import.meta.env.BASE_URL}assets/cats/xiaopiao.png`,
  orange: `${import.meta.env.BASE_URL}assets/cats/juzi.png`,
  calico: `${import.meta.env.BASE_URL}assets/cats/huahua.png`,
};

const raftAssetByLevel: Record<number, string> = {
  1: `${import.meta.env.BASE_URL}assets/raft/raft-lv1.png`,
  2: `${import.meta.env.BASE_URL}assets/raft/raft-lv2.png`,
  3: `${import.meta.env.BASE_URL}assets/raft/raft-lv3.png`,
  4: `${import.meta.env.BASE_URL}assets/raft/raft-lv4.png`,
};

function displayName(name: string) {
  return equipmentNames[name] ?? name;
}

function readMusicSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MUSIC_SETTINGS_KEY) ?? "{}");
    const trackExists = musicTracks.some((track) => track.id === parsed.trackId);
    const mode: MusicMode = parsed.mode === "random" || musicTracks.some((track) => track.id === parsed.mode) ? parsed.mode : "random";
    return {
      on: Boolean(parsed.on),
      mode,
      trackId: trackExists ? parsed.trackId as string : musicTracks[0]?.id,
    };
  } catch {
    return { on: false, mode: "random" as MusicMode, trackId: musicTracks[0]?.id };
  }
}

function describeMusicPlayError(error: unknown) {
  if (error instanceof DOMException) return `音乐播放失败：${error.message || error.name}`;
  if (error instanceof Error) return `音乐播放失败：${error.message}`;
  return "音乐播放失败，请再点一次音乐开关试试。";
}

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
  const [saveSlots, setSaveSlots] = useState(() => getSaveSlots());
  const [activeSaveId, setActiveSaveId] = useState(() => getActiveSaveId());
  const [autoSaveNote, setAutoSaveNote] = useState<string | undefined>();
  const [showCrate, setShowCrate] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [showEating, setShowEating] = useState(false);
  const [showSelling, setShowSelling] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [showFishingGame, setShowFishingGame] = useState(false);
  const [activePanel, setActivePanel] = useState<ModulePanel | undefined>();
  const [titlePanel, setTitlePanel] = useState<TitlePanel | undefined>();
  const [selectedItem, setSelectedItem] = useState<ItemId | undefined>();
  const [selectedFurniture, setSelectedFurniture] = useState<string | undefined>();
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | undefined>();
  const [showTutorial, setShowTutorial] = useState(false);
  const [musicOn, setMusicOn] = useState(() => readMusicSettings().on);
  const [musicMode, setMusicMode] = useState<MusicMode>(() => readMusicSettings().mode);
  const [currentTrackId, setCurrentTrackId] = useState<string | undefined>(() => readMusicSettings().trackId);
  const [musicReady, setMusicReady] = useState(false);
  const [musicError, setMusicError] = useState<string | undefined>();
  const [pendingTalent, setPendingTalent] = useState<TalentId | undefined>();
  const [talentMode, setTalentMode] = useState<TalentChoiceMode>(() => readTalentChoiceMode());
  const [randomTalent, setRandomTalent] = useState(() => drawTalents(1)[0]);
  const [threeTalents, setThreeTalents] = useState(() => drawTalents(3));
  const [randomDrawCount, setRandomDrawCount] = useState(0);
  const [showTalentConfirm, setShowTalentConfirm] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<ItemCategory | "all">("all");
  const [sellFocusFishId, setSellFocusFishId] = useState<string | undefined>();
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | undefined>();
  const logPanelRef = useRef<HTMLElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedTalent = talents.find((talent) => talent.id === state.talent);
  const upgradeCost = useMemo(() => getUpgradeCost(state), [state]);
  const repairPreview = useMemo(() => getRepairPreview(state), [state]);
  const hotpotMissing = useMemo(() => getMissingRequirements(state, { hotpotBase: 1, veggiePack: 1, meatSlices: 1, water: 1 }), [state]);
  const readyToCook = canCookAnyRecipe(state);
  const readyToEat = hasEdibleFood(state);
  const readyToUpgrade = canUpgradeBoat(state);
  const readyToDecorate = state.inventory.furnitureTicket > 0;
  const readyToSell = hasFishToSell(state);
  const readyToDeliverOrder = state.orders.some((order) => canCompleteOrder(state, order));
  const discoveredCount = fishList.filter((fishItem) => state.fishCollection[fishItem.id]?.discovered).length;
  const completion = Math.round((discoveredCount / fishList.length) * 100);
  const survival = getSurvivalInfo(state);
  const talentsForMode = talentMode === "manual" ? talents : talentMode === "random" ? [randomTalent ?? talents[0]] : threeTalents;

  const pickMusicTrack = (excludeId?: string) => {
    const options = musicTracks.filter((track) => track.id !== excludeId);
    const pool = options.length ? options : musicTracks;
    return pool[Math.floor(Math.random() * pool.length)] ?? musicTracks[0];
  };

  const playNextTrack = () => {
    const next = musicMode === "random" ? pickMusicTrack(currentTrackId) : musicTracks.find((track) => track.id === musicMode) ?? pickMusicTrack(currentTrackId);
    setCurrentTrackId(next.id);
    setMusicReady(true);
    setMusicError(undefined);
  };

  const toggleMusic = () => {
    setMusicReady(true);
    setMusicError(undefined);
    setMusicOn((value) => {
      const nextOn = !value;
      if (nextOn && !currentTrackId) setCurrentTrackId(pickMusicTrack().id);
      return nextOn;
    });
  };

  useEffect(() => {
    localStorage.setItem(MUSIC_SETTINGS_KEY, JSON.stringify({ on: musicOn, mode: musicMode, trackId: currentTrackId }));
  }, [musicOn, musicMode, currentTrackId]);

  useEffect(() => {
    const markReady = () => setMusicReady(true);
    window.addEventListener("pointerdown", markReady, { once: true });
    window.addEventListener("keydown", markReady, { once: true });
    return () => {
      window.removeEventListener("pointerdown", markReady);
      window.removeEventListener("keydown", markReady);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicOn || !musicReady) {
      audio.pause();
      if (!musicOn) setMusicError(undefined);
      return;
    }
    const track = musicTracks.find((item) => item.id === (musicMode === "random" ? currentTrackId : musicMode)) ?? musicTracks[0];
    if (!track) return;
    if (currentTrackId !== track.id) setCurrentTrackId(track.id);
    if (audio.getAttribute("src") !== track.file) {
      audio.src = track.file;
      audio.load();
    }
    audio.volume = 0.42;
    audio.loop = musicMode !== "random";
    audio.play()
      .then(() => setMusicError(undefined))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMusicError(describeMusicPlayError(error));
      });
  }, [musicOn, musicReady, musicMode, currentTrackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => {
      const next = musicMode === "random" ? pickMusicTrack(currentTrackId) : musicTracks.find((track) => track.id === musicMode) ?? musicTracks[0];
      if (!next) return;
      setCurrentTrackId(next.id);
      audio.src = next.file;
      audio.load();
      audio.currentTime = 0;
      audio.play().then(() => setMusicError(undefined)).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMusicError(describeMusicPlayError(error));
      });
    };
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [musicMode, currentTrackId]);

  const refreshSaves = () => {
    setSaveSummary(getSaveSummary());
    setSaveSlots(getSaveSlots());
    setActiveSaveId(getActiveSaveId());
  };

  const markAutosaved = () => {
    setAutoSaveNote("已自动保存");
    window.setTimeout(() => setAutoSaveNote(undefined), 1600);
  };

  const autoSaveIfPlaying = (next: GameState) => {
    if (!next.started) return;
    autosaveGame(next);
    refreshSaves();
    markAutosaved();
  };

  const update = (next: GameState) => {
    setState(next);
    autoSaveIfPlaying(next);
  };

  const applyAction = (title: string, next: GameState) => {
    setFeedback(buildFeedback(title, state, next));
    setState(next);
    autoSaveIfPlaying(next);
  };

  const startNewGameFlow = () => {
    setPendingTalent(undefined);
    setShowTalentConfirm(false);
    setRandomDrawCount(0);
    setRandomTalent(drawTalents(1)[0]);
    setThreeTalents(drawTalents(3));
    setView("talentSelect");
  };

  const changeTalentMode = (mode: TalentChoiceMode) => {
    setTalentMode(mode);
    localStorage.setItem(TALENT_CHOICE_MODE_KEY, mode);
    setRandomDrawCount(0);
    setRandomTalent(drawTalents(1)[0]);
    setThreeTalents(drawTalents(3));
  };

  const chooseTalent = (talent: TalentId) => {
    setPendingTalent(talent);
    setShowTalentConfirm(true);
  };

  const confirmTalent = () => {
    if (!pendingTalent) return;
    setShowTalentConfirm(false);
    setView("catSelect");
  };

  const chooseCat = (catType: CatType) => {
    const next = startGame(pendingTalent ?? "fishing", catType);
    const name = window.prompt("给这次漂流存档起个名字吧：", "漂流记录 Day 1")?.trim() || "漂流记录 Day 1";
    saveGame(next, { asNew: true, name });
    setState(next);
    setPendingTalent(undefined);
    setShowTutorial(true);
    refreshSaves();
    markAutosaved();
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
    refreshSaves();
    setView("playing");
  };

  const loadSaveSlot = (slotId: string) => {
    if (!window.confirm("确定读取这个存档吗？当前未保存进度可能丢失。")) return;
    setState(loadGameWithLog(slotId));
    refreshSaves();
    setView("playing");
  };

  const deleteSlot = (slotId: string) => {
    const slot = saveSlots.find((item) => item.id === slotId);
    if (!window.confirm(`确定删除「${slot?.name ?? "这个存档"}」吗？此操作不能撤销。`)) return;
    deleteSaveSlot(slotId);
    refreshSaves();
  };

  const openTitleLoad = () => {
    if (!hasSavedGame()) {
      window.alert("还没有存档。先开始新游戏，在游戏里保存后就能读取啦。");
      return;
    }
    setView("loadMenu");
  };

  const saveCurrentGame = () => {
    const next = saveGameWithLog(state);
    setState(next);
    refreshSaves();
  };

  const saveAsNewSlot = () => {
    const name = window.prompt("新存档名称：", `漂流记录 Day ${state.day}`)?.trim() || `漂流记录 Day ${state.day}`;
    saveGameAs(state, name);
    refreshSaves();
    setAutoSaveNote("已另存为新存档");
    window.setTimeout(() => setAutoSaveNote(undefined), 1800);
  };

  const renameCurrentSlot = () => {
    const slot = saveSlots.find((item) => item.id === activeSaveId);
    if (!slot) return window.alert("当前没有可重命名的存档。");
    const name = window.prompt("新的存档名称：", slot.name)?.trim();
    if (!name) return;
    renameSaveSlot(slot.id, name);
    refreshSaves();
  };

  const resetCurrentGame = () => {
    setShowCrate(false);
    setShowCooking(false);
    setShowEating(false);
    setShowCat(false);
    setActivePanel(undefined);
    setFeedback(undefined);
    update(resetGame());
    refreshSaves();
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
      <>
        <audio ref={audioRef} preload="none" />
        <TitleScreen
          saveSummary={saveSummary}
          hasActiveRun={state.started}
          onNewGame={startNewGameFlow}
          onContinue={continueGame}
          onLoadMenu={openTitleLoad}
          onDex={() => setTitlePanel("dex")}
          onSettings={() => setTitlePanel("settings")}
          musicOn={musicOn}
          onToggleMusic={toggleMusic}
        />
        {titlePanel === "dex" && (
          <TitleDexPanel state={state.started ? state : loadGame()} completion={completion} onClose={() => setTitlePanel(undefined)} />
        )}
        {titlePanel === "settings" && (
          <TitleSettingsPanel
            musicOn={musicOn}
            musicMode={musicMode}
            currentTrackId={currentTrackId}
            musicError={musicError}
            onToggleMusic={toggleMusic}
            onMusicModeChange={(mode) => {
              setMusicReady(true);
              setMusicMode(mode);
              setCurrentTrackId(mode === "random" ? pickMusicTrack(currentTrackId).id : mode);
              setMusicError(undefined);
            }}
            onNextTrack={playNextTrack}
            onClose={() => setTitlePanel(undefined)}
          />
        )}
      </>
    );
  }

  if (view === "loadMenu") {
    return (
      <>
        <audio ref={audioRef} preload="none" />
        <LoadScreen
          slots={saveSlots}
          activeSaveId={activeSaveId}
          onBack={() => setView("title")}
          onLoad={loadSaveSlot}
          onDelete={deleteSlot}
        />
      </>
    );
  }

  if (view === "catSelect") {
    return (
      <>
        <audio ref={audioRef} preload="none" />
        <CatSelectScreen onBack={() => setView("talentSelect")} onChoose={chooseCat} />
      </>
    );
  }

  if (view === "talentSelect" || !state.started) {
    return (
      <>
        <audio ref={audioRef} preload="none" />
        <main className="start-screen">
          <section className="start-card">
            <p className="eyebrow">Drift Crate</p>
            <h1>漂流补给箱</h1>
            <p className="intro">选择一个初始天赋，带着小木筏、旧鱼竿和潮汐系统，开始你的海上小家计划。</p>
            <div className="talent-mode-row">
              <button className={talentMode === "three" ? "active-filter" : ""} onClick={() => changeTalentMode("three")}>推荐：随机三选一</button>
              <button className={talentMode === "manual" ? "active-filter" : ""} onClick={() => changeTalentMode("manual")}>手动选择</button>
              <button className={talentMode === "random" ? "active-filter" : ""} onClick={() => changeTalentMode("random")}>随机抽取</button>
            </div>
            <p className="talent-mode-hint">{talentMode === "three" ? "本局从三份漂流本领里，挑一份带上船。" : talentMode === "random" ? "让潮汐替你决定开局。" : "看看全部天赋，慢慢选一份最顺手的。"}</p>
            <div className="talent-grid">
              {talentsForMode.map((talent) => (
                <button className="talent-card" key={talent.id} onClick={() => chooseTalent(talent.id as TalentId)}>
                  <span>{talent.emoji}</span>
                  <strong>{talent.name}</strong>
                  <small>{talent.description}</small>
                  <em>初始：{talentStartingText(talent)}</em>
                </button>
              ))}
            </div>
            {talentMode === "random" && <button className="compact-button" disabled={randomDrawCount >= 1} onClick={() => { setRandomTalent(drawTalents(1)[0]); setRandomDrawCount((count) => count + 1); }}>{randomDrawCount >= 1 ? "已重新抽取" : "重新抽取一次"}</button>}
            <button className="compact-button menu-back" onClick={() => setView("title")}>返回主菜单</button>
          </section>
        </main>
        {showTalentConfirm && pendingTalent && (() => {
          const talent = talents.find((item) => item.id === pendingTalent);
          if (!talent) return null;
          return <div className="modal-backdrop"><section className="crate-modal talent-confirm-modal"><span>{talent.emoji}</span><p className="eyebrow">确认开局天赋</p><h2>{talent.name}</h2><p>{talent.description}</p><p className="ready">初始物资：{talentStartingText(talent)}</p><div className="modal-actions"><button onClick={() => setShowTalentConfirm(false)}>再想想</button><button className="primary-action" onClick={confirmTalent}>确认并选择猫猫</button></div></section></div>;
        })()}
      </>
    );
  }

  if (state.gameOverReason) {
    return (
      <>
        <audio ref={audioRef} preload="none" />
        <GameOverScreen state={state} completion={completion} onRestart={() => { setState(resetGame()); setView("talentSelect"); }} onTitle={() => setView("title")} />
      </>
    );
  }

  return (
    <main className={`app-shell game-home weather-${state.weather}`}>
      <audio ref={audioRef} preload="none" />
      {autoSaveNote && <div className="autosave-toast">{autoSaveNote}</div>}
      <header className="topbar game-topbar">
        <div>
          <p className="eyebrow">Drift Crate</p>
          <h1>漂流补给箱</h1>
          <button className="compact-button" onClick={() => setView("title")}>返回主菜单</button>
        </div>
        <div className="status-grid hud-grid">
          <Status label="Day" value={state.day} />
          <Status label="阶段" value={survival.phase} />
          <Status label="灾害倒计时" value={survival.nextDisasterIn === 0 ? "今日" : `${survival.nextDisasterIn}天`} danger={survival.nextDisasterIn <= 2 && state.day >= 5} />
          <Status label="危险等级" value={survival.danger} danger={survival.danger === "高"} />
          <Status label="Weather" value={state.weather} />
          <Status label="Hunger" value={state.hunger} danger={state.hunger <= 15} />
          <Status label="Mood" value={`${state.mood} · ${survival.moodStatus}`} danger={state.mood < 40} />
          <Status label="Coins" value={`${state.coins} 🐚`} />
          <Status label="Boat HP" value={`${state.boatHp}/${state.boatMaxHp}`} danger={state.boatHp / state.boatMaxHp < 0.4} />
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
                <img className="raft-asset-image" src={raftAssetByLevel[state.boatLevel] ?? raftAssetByLevel[1]} alt={boatNames[state.boatLevel]} />
                <div className="furniture-strip">{state.furniture.slice(0, 6).map((item) => <span key={item}>{furnitureIcon(item)}</span>)}</div>
                <div className="stage-cat" title={`${state.cat.name} / ${state.cat.breed}`}>
                  <CatIcon cat={state.cat} />
                  <span className="cat-bubble">{catBubble(state.cat)}</span>
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
              {state.boatLevel >= 4 ? <p>海上补给站已建成，可以通过订单继续经营。</p> : <RequirementList state={state} items={upgradeCost.items} coins={upgradeCost.coins} />}
              {state.boatHp / state.boatMaxHp < 0.4 && <strong className="warning">船体严重受损。下一次灾害前请尽快修理、升级或准备防水布。</strong>}
            </div>
          </section>

          <section className="actions panel action-dock">
            <ActionButton onClick={() => state.fishingMode === "quick" ? applyAction("钓鱼", fish(state)) : setShowFishingGame(true)}>🎣 钓鱼<small>{state.fishingMode === "quick" ? "快速钓鱼" : "小游戏钓鱼"}</small></ActionButton>
            <ActionButton onClick={() => applyAction("打捞", salvage(state))}>🪝 打捞</ActionButton>
            <ActionButton badge={state.inventory.commonCrate > 0 ? "可开" : undefined} onClick={() => openCrateAndShow("commonCrate")}>
              🎁 开普通包 x{state.inventory.commonCrate}<small>消耗普通包 x1</small>
            </ActionButton>
            <ActionButton badge={state.inventory.premiumCrate > 0 ? "可开" : undefined} onClick={() => openCrateAndShow("premiumCrate")}>
              💝 开高级包 x{state.inventory.premiumCrate}<small>消耗高级包 x1</small>
            </ActionButton>
            <ActionButton badge={readyToUpgrade ? "可升级" : undefined} onClick={() => applyAction("升级载具", upgradeBoat(state))}>
              🔨 升级载具<small>{state.boatLevel >= 4 ? "已达最高等级" : "材料需求见载具信息"}</small>
            </ActionButton>
            <ActionButton onClick={() => applyAction("修理载具", repairBoat(state))}>🧰 修理载具<small>{Object.entries(repairPreview.cost).map(([id, amount]) => `${itemNames[id as ItemId]} x${amount}`).join("、") || "无需材料"} · HP +{repairPreview.repairValue}</small></ActionButton>
            <ActionButton badge={readyToCook ? "可做" : undefined} onClick={() => setActivePanel("recipes")}>
              🍲 制作料理
            </ActionButton>
            <ActionButton badge={readyToEat ? "可吃" : undefined} onClick={openEatingPanel}>
              🍽 进食
            </ActionButton>
            <ActionButton onClick={() => setActivePanel("shop")}>🛒 商店</ActionButton>
            <ActionButton badge={readyToDeliverOrder ? "可交付" : undefined} onClick={() => setActivePanel("orders")}>📦 订单</ActionButton>
            <ActionButton onClick={() => setActivePanel("cat")}>猫 猫猫</ActionButton>
            <ActionButton badge={readyToDecorate ? "可布置" : undefined} onClick={() => applyAction("布置家具", decorate(state))}>
              🪑 布置家具
            </ActionButton>
            <ActionButton className="night" onClick={() => applyAction("结束一天", endDay(state))}>🌙 结束一天</ActionButton>
          </section>

          <RecentActivity
            logs={state.logs}
            expanded={recentExpanded}
            onToggle={() => setRecentExpanded((value) => !value)}
            onViewFull={() => setActivePanel("journal")}
          />

          <ModuleMenu activePanel={activePanel} onOpen={setActivePanel} hasNewFish={!!state.newestFishId} />

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
            <TideShop state={state} onBuy={setSelectedShopItem} />
          </section>

          <section className="panel fishdex-panel">
            <div className="section-heading">
              <h2>📘 钓鱼图鉴</h2>
              {state.newestFishId && <span className="new-pill">NEW</span>}
            </div>
            <FishDexSummary state={state} discoveredCount={discoveredCount} completion={completion} />
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
            <InventoryPanel state={state} filter={inventoryFilter} onFilter={setInventoryFilter} onItemSelect={setSelectedItem} />
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
              {state.furniture.length ? state.furniture.map((item) => <button className="tag-button" key={item} onClick={() => setSelectedFurniture(item)}>{furnitureIcon(item)} {item}</button>) : <p>还没有家具，等一张家具券来改变生活。</p>}
            </div>
            <h3>装备</h3>
            <div className="tag-list">
              {state.equipment.length ? state.equipment.map((item) => <span key={item}>{displayName(item)}</span>) : <p>暂无装备。</p>}
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

      {activePanel && (
        <GameModulePanel
          panel={activePanel}
          state={state}
          completion={completion}
          inventoryFilter={inventoryFilter}
          onInventoryFilter={setInventoryFilter}
          onItemSelect={setSelectedItem}
          onClose={() => setActivePanel(undefined)}
          onBuy={setSelectedShopItem}
          onSellFish={openSellPanel}
          onCompleteOrder={(orderId) => applyAction("完成订单", completeOrder(state, orderId))}
          onAbandonOrder={(orderId) => applyAction("放弃订单", abandonOrder(state, orderId))}
          onCook={(recipeId) => applyAction("制作料理", cookRecipe(state, recipeId))}
          onFeedCat={(optionId) => applyAction("喂猫", feedCat(state, optionId))}
          onPetCat={() => applyAction("抚摸猫猫", petCat(state))}
          onPlayCat={() => applyAction("陪猫玩", playWithCat(state))}
          onExploreCat={() => applyAction("猫猫探索", exploreWithCat(state))}
          onDecorate={() => applyAction("布置家具", decorate(state))}
          onFurnitureSelect={setSelectedFurniture}
          onToggleMusic={toggleMusic}
          musicOn={musicOn}
          musicMode={musicMode}
          currentTrackId={currentTrackId}
          musicError={musicError}
          onMusicModeChange={(mode) => {
            setMusicReady(true);
            setMusicMode(mode);
            setCurrentTrackId(mode === "random" ? pickMusicTrack(currentTrackId).id : mode);
            setMusicError(undefined);
          }}
          onFishingModeChange={(mode) => update({ ...state, fishingMode: mode })}
          onNextTrack={playNextTrack}
          onSave={saveCurrentGame}
          onSaveAs={saveAsNewSlot}
          onRenameSave={renameCurrentSlot}
          onLoadMenu={() => {
            setActivePanel(undefined);
            setView("loadMenu");
          }}
          onReset={resetCurrentGame}
          onTitle={() => setView("title")}
        />
      )}
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
          onPet={() => applyAction("抚摸猫猫", petCat(state))}
          onPlay={() => applyAction("陪猫玩", playWithCat(state))}
          onExplore={() => applyAction("猫猫探索", exploreWithCat(state))}
        />
      )}
      {selectedItem && (
        <ItemDetailModal
          state={state}
          itemId={selectedItem}
          onClose={() => setSelectedItem(undefined)}
          onEat={(itemId) => applyAction("使用物品", eatFood(state, itemId))}
          onFeedCat={(optionId) => applyAction("喂猫", feedCat(state, optionId))}
          onOpenCrate={(crate) => {
            applyAction(crate === "premiumCrate" ? "打开高级补给包" : "打开普通补给包", openCrate(state, crate));
            setShowCrate(true);
          }}
          onUse={(itemId) => applyAction("使用物品", useUtilityItem(state, itemId))}
          onDecorate={(itemId) => applyAction("布置家具", itemId === "furnitureTicket" ? decorate(state) : placeInventoryFurniture(state, itemId))}
        />
      )}
      {selectedFurniture && (
        <FurnitureDetailModal
          state={state}
          furniture={selectedFurniture}
          onClose={() => setSelectedFurniture(undefined)}
          onRemove={(furniture) => {
            applyAction("收起家具", removeFurniture(state, furniture));
            setSelectedFurniture(undefined);
          }}
        />
      )}
      {selectedShopItem && (
        <ShopPurchaseModal
          state={state}
          item={selectedShopItem}
          onClose={() => setSelectedShopItem(undefined)}
          onConfirm={(amount) => {
            applyAction("购买", buyShopItem(state, selectedShopItem.id, amount));
            setSelectedShopItem(undefined);
          }}
        />
      )}
      {showFishingGame && (
        <FishingMiniGame
          state={state}
          onClose={() => setShowFishingGame(false)}
          onFinish={(result) => {
            setShowFishingGame(false);
            applyAction("钓鱼", fishWithMiniGame(state, result));
          }}
        />
      )}
      {showTutorial && <TutorialModal onClose={() => { setShowTutorial(false); update({ ...state, tutorialSeen: true }); }} />}
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

  addArrayDiff(before.equipment, after.equipment, "装备", gains, costs, displayName);
  addArrayDiff(before.furniture, after.furniture, "家具", gains, costs);
  addNumberDiff("🐚 贝壳币", before.coins, after.coins, stats);
  addNumberDiff("🍗 Hunger", before.hunger, after.hunger, stats);
  addNumberDiff("😊 Mood", before.mood, after.mood, stats);
  addNumberDiff("🛶 Boat HP", before.boatHp, after.boatHp, stats);
  addNumberDiff("📅 Day", before.day, after.day, stats);
  addNumberDiff("猫饱腹", before.cat?.satiety ?? 0, after.cat?.satiety ?? 0, stats);
  addNumberDiff("猫亲密", before.cat?.intimacy ?? 0, after.cat?.intimacy ?? 0, stats);
  addNumberDiff("猫心情", before.cat?.mood ?? 0, after.cat?.mood ?? 0, stats);
  if (before.boatLevel !== after.boatLevel) {
    stats.push({ label: `🚤 Boat Lv ${before.boatLevel} → ${after.boatLevel}` });
  }

  if (!gains.length && !costs.length && !stats.length && primaryLog?.type !== "warning" && primaryLog?.message) {
    notes.push(primaryLog.message);
  }

  const rarity = strongestFeedbackRarity(gains.concat(costs), newLogs);
  const discoveryLog = newLogs.find((log) => log.type === "discovery" && (log.message.includes("首次钓到") || log.message.includes("补给包里发现")));
  const newFish = fishList.find((fishItem) => discoveryLog?.message.includes(fishItem.name));

  return {
    title: newFish ? "新图鉴解锁！" : title,
    icon: newFish ? newFish.emoji : primaryLog ? feedbackIcon(primaryLog.type) : "✨",
    message: newFish ? `${newFish.name} · ${newFish.rarity} · 售价 ${newFish.basePrice} 贝壳币` : primaryLog?.message,
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

function addArrayDiff(beforeItems: string[], afterItems: string[], group: string, gains: FeedbackLine[], costs: FeedbackLine[], formatter: (value: string) => string = (value) => value) {
  const beforeCounts = countStrings(beforeItems);
  const afterCounts = countStrings(afterItems);
  const names = new Set([...Object.keys(beforeCounts), ...Object.keys(afterCounts)]);
  names.forEach((name) => {
    const diff = (afterCounts[name] ?? 0) - (beforeCounts[name] ?? 0);
    if (diff > 0) gains.push({ label: `${group}：${formatter(name)}`, amount: diff });
    if (diff < 0) costs.push({ label: `${group}：${formatter(name)}`, amount: Math.abs(diff) });
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

function CatIcon({ cat, size = "normal" }: { cat: Pick<CatState | CatOption, "type" | "breed">; size?: "normal" | "large" }) {
  return (
    <img className={`cat-asset-icon ${size === "large" ? "large" : ""}`} src={catAssetByType[cat.type]} alt={cat.breed} />
  );
}

function catBubble(cat: CatState) {
  const event = cat.todayEvent ?? "";
  if (cat.satiety < 25) return "想吃鱼";
  if (cat.mood < 35 || event.includes("害怕") || event.includes("吓")) return "有点害怕";
  if (event.includes("找到") || event.includes("拖出") || event.includes("扒拉") || event.includes("叼来")) return "找到了东西！";
  if (event.includes("满足") || cat.mood > 80) return "今天很满足";
  return "喵～";
}

const moduleItems: { id: ModulePanel; icon: string; label: string }[] = [
  { id: "inventory", icon: "箱", label: "背包" },
  { id: "shop", icon: "店", label: "商店" },
  { id: "orders", icon: "单", label: "订单" },
  { id: "dex", icon: "鱼", label: "图鉴" },
  { id: "recipes", icon: "锅", label: "菜谱" },
  { id: "journal", icon: "日", label: "日记" },
  { id: "cat", icon: "猫", label: "猫猫" },
  { id: "home", icon: "家", label: "家具" },
  { id: "guide", icon: "📘", label: "漂流指南" },
  { id: "settings", icon: "设", label: "设置" },
];

function ModuleMenu({ activePanel, onOpen, hasNewFish }: { activePanel?: ModulePanel; onOpen: (panel: ModulePanel) => void; hasNewFish: boolean }) {
  return (
    <nav className="module-menu panel" aria-label="功能菜单">
      {moduleItems.map((item) => (
        <button className={activePanel === item.id ? "active" : ""} key={item.id} onClick={() => onOpen(item.id)}>
          {item.id === "dex" && hasNewFish && <span className="new-pill">NEW</span>}
          <span>{item.icon}</span>
          <strong>{item.label}</strong>
        </button>
      ))}
    </nav>
  );
}

function GameModulePanel({
  panel,
  state,
  completion,
  inventoryFilter,
  onInventoryFilter,
  onItemSelect,
  onClose,
  onBuy,
  onSellFish,
  onCompleteOrder,
  onAbandonOrder,
  onCook,
  onFeedCat,
  onPetCat,
  onPlayCat,
  onExploreCat,
  onDecorate,
  onFurnitureSelect,
  musicOn,
  musicMode,
  currentTrackId,
  musicError,
  onToggleMusic,
  onMusicModeChange,
  onFishingModeChange,
  onNextTrack,
  onSave,
  onSaveAs,
  onRenameSave,
  onLoadMenu,
  onReset,
  onTitle,
}: {
  panel: ModulePanel;
  state: GameState;
  completion: number;
  inventoryFilter: ItemCategory | "all";
  onInventoryFilter: (value: ItemCategory | "all") => void;
  onItemSelect: (itemId: ItemId) => void;
  onClose: () => void;
  onBuy: (item: ShopItem) => void;
  onSellFish: (fishId?: string) => void;
  onCompleteOrder: (orderId: string) => void;
  onAbandonOrder: (orderId: string) => void;
  onCook: (recipeId: string) => void;
  onFeedCat: (optionId: string) => void;
  onPetCat: () => void;
  onPlayCat: () => void;
  onExploreCat: () => void;
  onDecorate: () => void;
  onFurnitureSelect: (furniture: string) => void;
  musicOn: boolean;
  musicMode: MusicMode;
  currentTrackId?: string;
  musicError?: string;
  onToggleMusic: () => void;
  onMusicModeChange: (mode: MusicMode) => void;
  onFishingModeChange: (mode: FishingMode) => void;
  onNextTrack: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onRenameSave: () => void;
  onLoadMenu: () => void;
  onReset: () => void;
  onTitle: () => void;
}) {
  const title = moduleItems.find((item) => item.id === panel);

  return (
    <div className="modal-backdrop game-panel-backdrop" onClick={onClose}>
      <section className={`wide-modal game-module-panel module-${panel}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Module</p>
            <h2>{title?.icon} {title?.label}</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>

        {panel === "inventory" && <InventoryPanel state={state} filter={inventoryFilter} onFilter={onInventoryFilter} onItemSelect={onItemSelect} />}

        {panel === "shop" && (
          <div className="module-stack">
            <button className="sell-all" onClick={() => onSellFish()}>出售鱼获</button>
            <div className="fish-trade-grid">
              {fishList.map((fishItem) => (
                <FishTradeCard key={fishItem.id} fish={fishItem} state={state} onSell={() => onSellFish(fishItem.id)} />
              ))}
            </div>
            <TideShop state={state} onBuy={onBuy} />
          </div>
        )}

        {panel === "orders" && <OrdersPanel state={state} onComplete={onCompleteOrder} onAbandon={onAbandonOrder} />}

        {panel === "dex" && (
          <>
            <FishDexSummary state={state} discoveredCount={fishList.filter((fishItem) => state.fishCollection[fishItem.id]?.discovered).length} completion={completion} />
            <div className="fishdex-grid">
              {fishList.map((fishItem) => <FishDexCard key={fishItem.id} fish={fishItem} state={state} />)}
            </div>
          </>
        )}

        {panel === "recipes" && (
          <div className="recipe-grid">
            {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} state={state} onCook={() => onCook(recipe.id)} />)}
          </div>
        )}

        {panel === "journal" && <JournalList logs={state.logs} />}

        {panel === "cat" && <CatPanelContent state={state} onFeed={onFeedCat} onPet={onPetCat} onPlay={onPlayCat} onExplore={onExploreCat} />}

        {panel === "home" && (
          <div className="module-stack">
            <button className="primary-action" disabled={state.inventory.furnitureTicket <= 0} onClick={onDecorate}>布置家具</button>
            <div className="tag-list">
              {state.furniture.length ? state.furniture.map((item) => <button className="tag-button" key={item} onClick={() => onFurnitureSelect(item)}>{furnitureIcon(item)} {item}</button>) : <p>还没有家具。</p>}
            </div>
            <h3>装备</h3>
            <div className="tag-list">
              {state.equipment.length ? state.equipment.map((item) => <span key={item}>{displayName(item)}</span>) : <p>暂无装备。</p>}
            </div>
          </div>
        )}

        {panel === "guide" && <PlayerGuidePanel />}

        {panel === "settings" && (
          <div className="settings-grid">
            <div className="music-settings-card">
              <div>
                <strong>🎣 钓鱼模式</strong>
                <p>当前模式：{state.fishingMode === "miniGame" ? "小游戏钓鱼" : "快速钓鱼"}</p>
                <p>小游戏会根据鱼竿、天赋和 Mood 调整成功区域；快速钓鱼保留原本一键体验。</p>
              </div>
              <select value={state.fishingMode} onChange={(event) => onFishingModeChange(event.target.value as FishingMode)}>
                <option value="miniGame">小游戏钓鱼</option>
                <option value="quick">快速钓鱼</option>
              </select>
            </div>
            <div className="music-settings-card">
              <div>
                <strong>🎵 背景音乐</strong>
                <p>当前模式：{musicMode === "random" ? "随机播放" : musicTracks.find((track) => track.id === musicMode)?.name ?? "随机播放"}</p>
                <p>当前曲目：{musicTracks.find((track) => track.id === currentTrackId)?.name ?? "等待选择"}</p>
                {musicError && <p className="music-error">{musicError}</p>}
              </div>
              <select value={musicMode} onChange={(event) => onMusicModeChange(event.target.value as MusicMode)}>
                <option value="random">随机播放</option>
                {musicTracks.map((track) => <option value={track.id} key={track.id}>{track.name}</option>)}
              </select>
              <div className="music-track-desc">
                {(musicMode === "random" ? musicTracks.find((track) => track.id === currentTrackId) : musicTracks.find((track) => track.id === musicMode))?.description ?? "随机从海上小屋歌单里挑一首。"}
              </div>
              <div className="music-actions">
                <button onClick={onToggleMusic}>音乐 {musicOn ? "关" : "开"}</button>
                <button onClick={onNextTrack}>下一首</button>
              </div>
            </div>
            <button onClick={onSave}>保存当前存档</button>
            <button onClick={onSaveAs}>另存为新存档</button>
            <button onClick={onRenameSave}>重命名当前存档</button>
            <button onClick={onLoadMenu}>读取存档</button>
            <button onClick={onTitle}>返回标题页</button>
            <button className="danger-button" onClick={onReset}>重置游戏</button>
          </div>
        )}
      </section>
    </div>
  );
}

function PlayerGuidePanel() {
  const guideSections = [
    { icon: "玩", title: "基础玩法", text: "钓鱼收集鱼获和贝壳币，打捞带回建材；卖鱼后买补给，开补给包找惊喜。再做饭、进食、升级海上小家。" },
    { icon: "存", title: "存档小贴士", text: "每次钓鱼、打捞、开箱、做饭和结束一天后都会自动保存。设置里还能手动保存、另存为、重命名或读取不同的漂流记录。" },
    { icon: "锅", title: "菜谱和进食", text: "料理会恢复 Hunger 和 Mood，先做好再从背包或进食面板吃掉。热汤和火锅在寒潮、坏天气时更暖心，部分料理猫猫也喜欢。" },
    { icon: "猫", title: "猫猫伙伴", text: "每天可以抚摸、陪玩或让猫猫探索一次。喂猫能提升亲密度；高亲密度的猫偶尔会带回惊喜。" },
    { icon: "券", title: "家具券从哪来", text: "高级补给包更容易开到家具券；Day 5 后打捞、潮汐商店和猫猫探索也有小概率发现。" },
    { icon: "用", title: "生活物资用途", text: "防水布会在暴雨、风暴或高温时自动保护木筏；打火机让烤鱼类料理少花木板；湿巾能恢复 Mood，高温时更有效；修理胶带会让修理多恢复 Boat HP。" },
    { icon: "警", title: "别忘了船体", text: "查看状态栏里的灾害倒计时。暴雨、风暴和巨浪都会伤害 Boat HP，提前留木板、废铁和修理胶带会安心很多。" },
    { icon: "心", title: "Mood 心情", text: "Mood 高时，钓鱼、打捞、开箱和猫咪事件会更走运；太低时容易失手。吃点好料理、用生活物资或陪猫玩都能慢慢恢复。" },
    { icon: "册", title: "钓鱼图鉴", text: "首次钓到新鱼会解锁图鉴；持续收集能领取图鉴奖励。看到 NEW 时，记得去图鉴看看新朋友。" },
  ];

  return (
    <div className="guide-grid">
      {guideSections.map((section) => (
        <article className="guide-card" key={section.title}>
          <span>{section.icon}</span>
          <div>
            <h3>{section.title}</h3>
            <p>{section.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function JournalList({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="logs module-logs">
      {logs.map((log) => (
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
  );
}

function CatPanelContent({ state, onFeed, onPet, onPlay, onExplore }: { state: GameState; onFeed: (optionId: string) => void; onPet: () => void; onPlay: () => void; onExplore: () => void }) {
  const options = getCatFeedOptions(state);
  const cat = state.cat;
  return (
    <div className="module-stack">
      <div className="cat-status-card">
        <CatIcon cat={cat} size="large" />
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
      <div className="cat-action-grid">
        <button onClick={onPet}>
          <strong>抚摸</strong>
          <small>{cat.lastPetDay === state.day ? "今日已互动" : "猫心情 +5 / 亲密 +1"}</small>
        </button>
        <button onClick={onPlay}>
          <strong>陪玩</strong>
          <small>{cat.lastPlayDay === state.day ? "今日已互动" : "猫心情 +8 / 亲密 +2"}</small>
        </button>
        <button onClick={onExplore}>
          <strong>探索 / 翻找</strong>
          <small>{cat.lastExploreDay === state.day ? "今日已探索" : "触发随机猫咪事件"}</small>
        </button>
      </div>
      <div className="cat-feed-list">
        {options.length ? options.map((option) => (
          <button key={option.id} onClick={() => onFeed(option.id)}>
            <span>{option.emoji}</span>
            <strong>{option.label}</strong>
            <small>消耗 {option.label} x1 · 饱腹 +{option.catSatiety} / 亲密 +{option.catIntimacy} / Mood +{option.playerMood}</small>
          </button>
        )) : <p className="hint">背包里暂时没有适合喂猫的食物。</p>}
      </div>
    </div>
  );
}

function TitleScreen({ saveSummary, hasActiveRun, onNewGame, onContinue, onLoadMenu, onDex, onSettings, musicOn, onToggleMusic }: { saveSummary: SaveSummary; hasActiveRun: boolean; onNewGame: () => void; onContinue: () => void; onLoadMenu: () => void; onDex: () => void; onSettings: () => void; musicOn: boolean; onToggleMusic: () => void }) {
  const snapshot = loadGame();
  const info = getSurvivalInfo(snapshot);
  return (
    <main className="title-screen">
      <img className="title-cover-image" src={`${import.meta.env.BASE_URL}assets/title-bg.png`} alt="漂流补给箱标题封面" />
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
          <button onClick={onDex}>📘 图鉴</button>
          <button onClick={onToggleMusic}>🎵 音乐 {musicOn ? "开" : "关"}</button>
          <button onClick={onSettings}>⚙ 设置</button>
        </div>
        <SaveSummaryCard saveSummary={saveSummary} />
      </section>
      <section className="title-status-bar">
        <Status label="Day" value={snapshot.day} /><Status label="Boat Lv" value={`Lv.${snapshot.boatLevel}`} />
        <Status label="金币" value={`${snapshot.coins} 🐚`} /><Status label="Hunger" value={snapshot.hunger} />
        <Status label="Mood" value={snapshot.mood} /><Status label="天气" value={snapshot.weather} />
        <Status label="阶段" value={info.phase} /><Status label="下次风暴" value={info.nextDisasterIn === 0 ? "今日" : `${info.nextDisasterIn}天`} danger={info.nextDisasterIn <= 2 && snapshot.day >= 5} />
      </section>
    </main>
  );
}

function TitleDexPanel({ state, onClose }: { state: GameState; completion: number; onClose: () => void }) {
  const discovered = fishList.filter((fishItem) => state.fishCollection[fishItem.id]?.discovered).length;
  const percent = Math.round((discovered / fishList.length) * 100);
  return (
    <div className="modal-backdrop game-panel-backdrop" onClick={onClose}>
      <section className="wide-modal game-module-panel module-dex" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Fish Dex</p>
            <h2>📘 图鉴预览</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <FishDexSummary state={state} discoveredCount={discovered} completion={percent} />
        <div className="fishdex-grid">
          {fishList.map((fishItem) => <FishDexCard key={fishItem.id} fish={fishItem} state={state} />)}
        </div>
      </section>
    </div>
  );
}

function TitleSettingsPanel({
  musicOn,
  musicMode,
  currentTrackId,
  musicError,
  onToggleMusic,
  onMusicModeChange,
  onNextTrack,
  onClose,
}: {
  musicOn: boolean;
  musicMode: MusicMode;
  currentTrackId?: string;
  musicError?: string;
  onToggleMusic: () => void;
  onMusicModeChange: (mode: MusicMode) => void;
  onNextTrack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop game-panel-backdrop" onClick={onClose}>
      <section className="wide-modal game-module-panel module-settings" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>⚙ 设置</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <div className="music-settings-card">
          <div>
            <strong>🎵 背景音乐</strong>
            <p>当前模式：{musicMode === "random" ? "随机播放" : musicTracks.find((track) => track.id === musicMode)?.name ?? "随机播放"}</p>
            <p>当前曲目：{musicTracks.find((track) => track.id === currentTrackId)?.name ?? "等待选择"}</p>
            {musicError && <p className="music-error">{musicError}</p>}
          </div>
          <select value={musicMode} onChange={(event) => onMusicModeChange(event.target.value as MusicMode)}>
            <option value="random">随机播放</option>
            {musicTracks.map((track) => <option value={track.id} key={track.id}>{track.name}</option>)}
          </select>
          <div className="music-actions">
            <button onClick={onToggleMusic}>音乐 {musicOn ? "关" : "开"}</button>
            <button onClick={onNextTrack}>下一首</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function LoadScreen({ slots, activeSaveId, onBack, onLoad, onDelete }: { slots: SaveSlot[]; activeSaveId?: string; onBack: () => void; onLoad: (slotId: string) => void; onDelete: (slotId: string) => void }) {
  return (
    <main className="start-screen">
      <section className="start-card load-card">
        <p className="eyebrow">Save Data</p>
        <h1>读取存档</h1>
        <div className="save-slot-list">
          {slots.length ? slots.map((slot) => (
            <SaveSlotCard
              key={slot.id}
              slot={slot}
              active={slot.id === activeSaveId}
              onLoad={() => onLoad(slot.id)}
              onDelete={() => onDelete(slot.id)}
            />
          )) : (
            <div className="save-slot empty">
              <strong>暂无存档</strong>
              <p>开始新游戏后会自动创建本地存档。</p>
            </div>
          )}
        </div>
        <button className="compact-button menu-back" onClick={onBack}>返回主菜单</button>
      </section>
    </main>
  );
}

function SaveSlotCard({ slot, active, onLoad, onDelete }: { slot: SaveSlot; active: boolean; onLoad: () => void; onDelete: () => void }) {
  const summary = slot.summary;
  return (
    <article className={`save-slot-card ${active ? "active" : ""}`}>
      <div>
        <div className="save-slot-title">
          <strong>{slot.name}</strong>
          {active && <span className="new-pill">当前存档</span>}
        </div>
        <p>
          Day {summary.day} · Boat Lv.{summary.boatLevel} · {summary.coins} 贝壳币 · 猫咪 {summary.catName ?? "未选择"}
        </p>
        <div className="save-slot-summary">
          <span>Hunger {summary.hunger}</span>
          <span>Mood {summary.mood}</span>
          <span>Boat HP {summary.boatHp}/{summary.boatMaxHp}</span>
          <span>图鉴 {summary.fishDexCompletion ?? 0}%</span>
        </div>
        {summary.savedAt && <small>最后保存：{formatSaveTime(summary.savedAt)}</small>}
      </div>
      <div className="save-slot-actions">
        <button className="primary-action" onClick={onLoad}>读取</button>
        <button className="danger-button" onClick={onDelete}>删除</button>
      </div>
    </article>
  );
}

function CatSelectScreen({ onBack, onChoose }: { onBack: () => void; onChoose: (catType: CatType) => void }) {
  const [selectedCat, setSelectedCat] = useState<(typeof catOptions)[number] | undefined>();
  return (
    <main className="start-screen">
      <section className="start-card">
        <p className="eyebrow">Cat Companion</p>
        <h1>选择猫猫伙伴</h1>
        <p className="intro">猫猫不会战斗，只会陪你在海上生活。黑猫 kibi 是推荐默认伙伴。</p>
        <div className="cat-select-grid">
          {catOptions.map((cat) => (
            <button className={`cat-choice-card ${cat.recommended ? "recommended" : ""}`} key={cat.type} onClick={() => setSelectedCat(cat)}>
              {cat.recommended && <span className="item-badge">推荐</span>}
              <CatIcon cat={cat} size="large" />
              <strong>{cat.defaultName}</strong>
              <small>{cat.breed}</small>
              <p>{cat.personality}</p>
              <em>{cat.bonus}</em>
            </button>
          ))}
        </div>
        <button className="compact-button menu-back" onClick={onBack}>返回天赋选择</button>
      </section>
      {selectedCat && (
        <div className="modal-backdrop" onClick={() => setSelectedCat(undefined)}>
          <section className="crate-modal cat-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <CatIcon cat={selectedCat} size="large" />
            <p className="eyebrow">确认猫猫伙伴</p>
            <h2>{selectedCat.defaultName}</h2>
            <p><strong>{selectedCat.breed}</strong></p>
            <p>{selectedCat.personality}</p>
            <p className="ready">{selectedCat.bonus}</p>
            <div className="music-actions">
              <button onClick={() => setSelectedCat(undefined)}>返回选择</button>
              <button className="primary-action" onClick={() => onChoose(selectedCat.type)}>确定出发</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function CatModal({ state, onClose, onFeed, onPet, onPlay, onExplore }: { state: GameState; onClose: () => void; onFeed: (optionId: string) => void; onPet: () => void; onPlay: () => void; onExplore: () => void }) {
  const options = getCatFeedOptions(state);
  const cat = state.cat;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="wide-modal cat-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Cat Companion</p>
            <h2>猫 {cat.name}</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <div className="cat-status-card">
          <CatIcon cat={cat} size="large" />
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
        <div className="cat-action-grid">
          <button onClick={onPet}>
            <strong>抚摸</strong>
            <small>{cat.lastPetDay === state.day ? "今日已互动" : "猫心情 +5 / 亲密 +1"}</small>
          </button>
          <button onClick={onPlay}>
            <strong>陪玩</strong>
            <small>{cat.lastPlayDay === state.day ? "今日已互动" : "猫心情 +8 / 亲密 +2"}</small>
          </button>
          <button onClick={onExplore}>
            <strong>探索 / 翻找</strong>
            <small>{cat.lastExploreDay === state.day ? "今日已探索" : "触发随机猫咪事件"}</small>
          </button>
        </div>
        <h3>喂猫</h3>
        {options.length ? (
          <div className="cat-feed-list">
            {options.map((option: CatFeedOption) => (
              <button key={option.id} onClick={() => onFeed(option.id)}>
                <span>{option.emoji}</span>
                <strong>{option.label}</strong>
                <small>消耗 {option.label} x1 · 饱腹 +{option.catSatiety} / 亲密 +{option.catIntimacy} / Mood +{option.playerMood}</small>
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
        <p>{saveSummary.name ?? "漂流记录"} · Day {saveSummary.day} · Boat Lv.{saveSummary.boatLevel} · {saveSummary.coins} 🐚 · 猫咪 {saveSummary.catName ?? "未选择"}{saveSummary.savedAt ? ` · ${formatSaveTime(saveSummary.savedAt)}` : ""}</p>
      ) : (
        <p>开始新游戏后会自动写入本地存档。</p>
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

function getFishingZones(state: GameState) {
  let successWidth = 32;
  let perfectWidth = 8;
  if (state.equipment.includes("sturdyRod")) successWidth += 8;
  if (state.equipment.includes("advancedRod") || state.equipment.includes("advancedRodItem")) {
    successWidth += 14;
    perfectWidth += 2;
  }
  if (state.equipment.includes("goldenRod")) {
    successWidth += 20;
    perfectWidth += 4;
  }
  if (state.talent === "fishing") successWidth += 6;
  if (state.mood >= 80) perfectWidth += 4;
  else if (state.mood < 40) successWidth -= 8;
  const success = Math.max(22, Math.min(68, successWidth));
  const perfect = Math.max(6, Math.min(18, perfectWidth));
  return {
    successStart: 50 - success / 2,
    successEnd: 50 + success / 2,
    perfectStart: 50 - perfect / 2,
    perfectEnd: 50 + perfect / 2,
  };
}

function FishingMiniGame({ state, onClose, onFinish }: { state: GameState; onClose: () => void; onFinish: (result: "fail" | "success" | "perfect") => void }) {
  const [pointer, setPointer] = useState(0);
  const [direction, setDirection] = useState(1);
  const zones = getFishingZones(state);
  const rodName = state.equipment.includes("goldenRod")
    ? "黄金钓鱼竿"
    : state.equipment.includes("advancedRodItem") || state.equipment.includes("advancedRod")
      ? "高级钓鱼竿"
      : state.equipment.includes("sturdyRod")
        ? "结实钓鱼竿"
        : "旧钓鱼竿";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPointer((value) => {
        const next = value + direction * 2.6;
        if (next >= 100) {
          setDirection(-1);
          return 100;
        }
        if (next <= 0) {
          setDirection(1);
          return 0;
        }
        return next;
      });
    }, 24);
    return () => window.clearInterval(timer);
  }, [direction]);

  const reelIn = () => {
    const result = pointer >= zones.perfectStart && pointer <= zones.perfectEnd
      ? "perfect"
      : pointer >= zones.successStart && pointer <= zones.successEnd
        ? "success"
        : "fail";
    onFinish(result);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="crate-modal fishing-mini-modal" onClick={(event) => event.stopPropagation()}>
        <span className="modal-emoji">🎣</span>
        <p className="eyebrow">Fishing Mini Game</p>
        <h2>看准时机收杆</h2>
        <p>{rodName} · Mood {state.mood}（{getMoodStatus(state.mood)}）</p>
        <div className="fishing-meter">
          <span className="success-zone" style={{ left: `${zones.successStart}%`, width: `${zones.successEnd - zones.successStart}%` }} />
          <span className="perfect-zone" style={{ left: `${zones.perfectStart}%`, width: `${zones.perfectEnd - zones.perfectStart}%` }} />
          <span className="fishing-pointer" style={{ left: `${pointer}%` }} />
        </div>
        <div className="fishing-legend">
          <span><i className="legend-success" /> 成功</span>
          <span><i className="legend-perfect" /> 完美：稀有率提升</span>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>放弃</button>
          <button className="primary-action" onClick={reelIn}>收杆</button>
        </div>
      </section>
    </div>
  );
}

function OrdersPanel({ state, onComplete, onAbandon }: { state: GameState; onComplete: (orderId: string) => void; onAbandon: (orderId: string) => void }) {
  const orderNeedLines = (order: SeaOrder) => {
    const lines: { label: string; ready: boolean }[] = [];
    Object.entries(order.itemCost ?? {}).forEach(([id, amount]) => {
      const itemId = id as ItemId;
      const owned = state.inventory[itemId] ?? 0;
      const need = amount ?? 0;
      lines.push({ label: `${itemEmoji[itemId]} ${itemNames[itemId]} ${owned}/${need}`, ready: owned >= need });
    });
    if (order.fishRarityCost && order.fishCount) {
      const owned = fishList.filter((fishItem) => fishItem.rarity === order.fishRarityCost).reduce((sum, fishItem) => sum + (state.fishCollection[fishItem.id]?.count ?? 0), 0);
      lines.push({ label: `🐟 ${order.fishRarityCost} 鱼 ${owned}/${order.fishCount}`, ready: owned >= order.fishCount });
    }
    if (order.catMoodRequired) lines.push({ label: `猫心情 ${state.cat.mood}/${order.catMoodRequired}`, ready: state.cat.mood >= order.catMoodRequired });
    if (order.catIntimacyRequired) lines.push({ label: `猫亲密 ${state.cat.intimacy}/${order.catIntimacyRequired}`, ready: state.cat.intimacy >= order.catIntimacyRequired });
    return lines;
  };

  const rewardLines = (order: SeaOrder) => [
    order.rewardCoins ? `+${order.rewardCoins}${state.boatLevel >= 4 ? "+12" : ""} 贝壳币` : "",
    order.rewardMood ? `Mood +${order.rewardMood}` : "",
    order.rewardCatIntimacy ? `猫亲密 +${order.rewardCatIntimacy}` : "",
    ...Object.entries(order.rewardItems ?? {}).map(([id, amount]) => `${itemEmoji[id as ItemId]} ${itemNames[id as ItemId]} x${amount}`),
  ].filter(Boolean);

  return (
    <div className="module-stack">
      <div className="section-heading">
        <div>
          <h3>📦 海上订单</h3>
          <p className="hint">{state.boatLevel >= 4 ? "海上补给站已建成，订单会带来更好的经营收益。" : "每天会刷新 2～3 张订单，提交鱼获、料理或材料换取奖励。"}</p>
        </div>
        {state.orders.some((order) => canCompleteOrder(state, order)) && <span className="notice-pill">有订单可完成</span>}
      </div>
      <div className="orders-grid">
        {state.orders.length ? state.orders.map((order) => {
          const ready = canCompleteOrder(state, order);
          return (
            <article className={`order-card order-${order.kind} ${ready ? "ready-order" : ""}`} key={order.id}>
              <span className="order-kind">{order.kind === "food" ? "🍲" : order.kind === "fish" ? "🐟" : order.kind === "cat" ? "猫" : order.kind === "rescue" ? "🛟" : "🧰"}</span>
              <div>
                <h3>{order.title}</h3>
                <p>{order.story}</p>
              </div>
              <div className="order-needs">
                {orderNeedLines(order).map((line) => <span className={line.ready ? "ready" : "warning"} key={line.label}>{line.label}</span>)}
              </div>
              <div className="reward-row">
                {rewardLines(order).map((reward) => <span key={reward}>{reward}</span>)}
              </div>
              <div className="modal-actions">
                <button onClick={() => onAbandon(order.id)}>放弃</button>
                <button className="primary-action" disabled={!ready} onClick={() => onComplete(order.id)}>完成订单</button>
              </div>
            </article>
          );
        }) : <p>今天暂时没有订单，结束一天后会有新的海上委托。</p>}
      </div>
    </div>
  );
}

function TideShop({ state, onBuy }: { state: GameState; onBuy: (item: ShopItem) => void }) {
  const daysLeft = 7 - ((state.day - 1) % 7);
  return (
    <div className="tide-shop">
      <div className="section-heading">
        <h3>🌊 潮汐商店</h3>
        <span className="notice-pill">余额 {state.coins} 🐚 · {daysLeft}天后刷新</span>
      </div>
      <div className="shop-stock-grid">
        {state.shopStock.map((item) => (
          <button className={`shop-card rarity-${item.rarity.toLowerCase()}`} key={item.id} disabled={item.quantity <= 0} onClick={() => onBuy(item)}>
            <span>{itemEmoji[item.id]}</span>
            <strong>{itemNames[item.id]}</strong>
            <small>{categoryLabels[item.category]} · {item.rarity}</small>
            <em>购买 {item.price} 🐚 · 剩余 x{item.quantity}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShopPurchaseModal({ state, item, onClose, onConfirm }: { state: GameState; item: ShopItem; onClose: () => void; onConfirm: (amount: number) => void }) {
  const [amount, setAmount] = useState(1);
  const maxByCoins = Math.floor(state.coins / item.price);
  const maxAmount = Math.max(0, Math.min(item.quantity, maxByCoins || 0));
  const safeAmount = Math.min(Math.max(1, amount), Math.max(1, item.quantity));
  const total = item.price * safeAmount;
  const canBuy = safeAmount <= item.quantity && total <= state.coins;
  const setSafeAmount = (value: number) => setAmount(Math.min(Math.max(1, Math.floor(value) || 1), Math.max(1, item.quantity)));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="crate-modal shop-purchase-modal" onClick={(event) => event.stopPropagation()}>
        <span className="modal-emoji">{itemEmoji[item.id]}</span>
        <p className="eyebrow">潮汐商店</p>
        <h2>{itemNames[item.id]}</h2>
        <p>单价：{item.price} 贝壳币 · 库存 x{item.quantity}</p>
        <div className="quantity-control">
          <button onClick={() => setSafeAmount(safeAmount - 1)}>-</button>
          <input value={safeAmount} min={1} max={item.quantity} type="number" onChange={(event) => setSafeAmount(Number(event.target.value))} />
          <button onClick={() => setSafeAmount(safeAmount + 1)}>+</button>
          <button onClick={() => setSafeAmount(Math.max(1, maxAmount))}>MAX</button>
          <button onClick={() => setSafeAmount(Math.max(1, maxAmount))}>全部买完</button>
        </div>
        <div className="purchase-summary">
          <span>当前数量：x{safeAmount}</span>
          <span>总价：{total} 贝壳币</span>
          <span>当前金币：{state.coins} 贝壳币</span>
          <span className={canBuy ? "ready" : "warning"}>购买后剩余：{state.coins - total} 贝壳币</span>
          {!canBuy && <span className="warning">金币不足或超过库存。</span>}
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary-action" disabled={!canBuy} onClick={() => onConfirm(safeAmount)}>确认购买</button>
        </div>
      </section>
    </div>
  );
}

function InventoryPanel({ state, filter, onFilter, onItemSelect }: { state: GameState; filter: ItemCategory | "all"; onFilter: (value: ItemCategory | "all") => void; onItemSelect: (itemId: ItemId) => void }) {
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
          <button className={`item has-item rarity-border-${itemMeta[itemId].rarity.toLowerCase()}`} key={itemId} onClick={() => onItemSelect(itemId)}>
            {(itemId === "commonCrate" || itemId === "premiumCrate") && <span className="item-badge">可开</span>}
            {itemMeta[itemId].category === "food" && <span className="item-badge">可吃</span>}
            {itemMeta[itemId].category === "furniture" && <span className="item-badge">可布置</span>}
            {itemMeta[itemId].category === "equipment" && <span className="item-badge">可装备</span>}
            <span>{itemEmoji[itemId]}</span>
            <strong>{itemNames[itemId]}</strong>
            <em>x{state.inventory[itemId]}</em>
          </button>
        )) : <p className="hint">这个分类暂时没有物品。</p>}
      </div>
    </>
  );
}

const itemDetailText: Partial<Record<ItemId, { description: string; use: string; effect: string }>> = {
  wood: { description: "漂在海上的基础木板。", use: "修理、升级载具，也能当作烹饪燃料。", effect: "材料本身不会直接生效。" },
  plastic: { description: "轻便防水的漂流材料。", use: "升级载具和制作生活设施。", effect: "材料本身不会直接生效。" },
  rope: { description: "能把松散木板牢牢绑住。", use: "升级载具、固定家具。", effect: "材料本身不会直接生效。" },
  scrap: { description: "结实的金属铁片。", use: "升级和修理载具。", effect: "材料本身不会直接生效。" },
  water: { description: "干净淡水。", use: "做饭、维持生活。", effect: "部分料理需要淡水。" },
  toolbox: { description: "装满基础工具的小箱子。", use: "修理载具时自动生效。", effect: "修理消耗降低，Boat HP 恢复量提高。" },
  waterproofBackpack: { description: "防水背包能保护打捞物资。", use: "获得后自动作为装备生效。", effect: "打捞时小概率额外获得材料。" },
  solarPurifier: { description: "用阳光慢慢净化海水的小设备。", use: "获得后自动作为装备生效。", effect: "每天结束时淡水 +1。" },
  autoFisher: { description: "会在夜里安静工作的简易钓鱼器。", use: "获得后自动作为装备生效。", effect: "每天结束时小概率获得普通鱼 x1。" },
  advancedRodItem: { description: "比旧鱼竿更稳的高级钓具。", use: "获得后自动装备。", effect: "提高 Rare 以上鱼出现概率。" },
  sturdyRod: { description: "更结实的钓鱼竿。", use: "获得后自动装备。", effect: "略微提高 Uncommon 和 Rare 鱼出现概率。" },
  fishingNet: { description: "能一次捞住更多小鱼的渔网。", use: "获得后自动装备。", effect: "钓鱼时有概率额外获得鱼。" },
  commonCrate: { description: "海上漂来的普通补给包。", use: "可以打开获得多件生活物资。", effect: "掉落基础材料、食物、小工具或少量稀有物。" },
  premiumCrate: { description: "包得更严实的高级补给包。", use: "可以打开获得更多补给。", effect: "更容易出现高级材料、家具、装备和稀有物。" },
  furnitureTicket: { description: "一张可以换来随机家具的券。", use: "点击布置，为海上小屋增加家具。", effect: "布置后 Mood 提升。" },
  wetWipes: { description: "随手擦去海风和黏腻。", use: "在背包详情中直接使用。", effect: "Mood +4；高温天气 Mood +6。" },
  lighter: { description: "可靠的防风打火机。", use: "拥有后烤鱼类料理自动少消耗 1 块木板。", effect: "寒潮时也会帮助降低 Mood 损失。" },
  tarp: { description: "能挡雨、遮阳的防水布。", use: "暴雨、风暴或高温时自动消耗。", effect: "减少 Boat HP 或 Mood 损失。" },
  repairTape: { description: "专门用于加固木筏裂缝的胶带。", use: "修理载具时自动消耗 1 个。", effect: "本次修理额外 Boat HP +12。" },
  soap: { description: "小小一块肥皂，也能让海上生活整洁一点。", use: "在背包详情中直接使用。", effect: "Mood +2。" },
  toothbrush: { description: "认真刷牙，是漂流生活的仪式感。", use: "在背包详情中直接使用。", effect: "Mood +2。" },
  toothpaste: { description: "一点清新的味道。", use: "在背包详情中直接使用。", effect: "Mood +2。" },
  medkit: { description: "简单处理疲惫和擦伤的药包。", use: "Hunger 或 Mood 偏低时可使用。", effect: "Hunger +15，Mood +8。" },
};

function getItemDetail(itemId: ItemId) {
  const food = foodItems.find((item) => item.id === itemId);
  if (food) return { description: food.description, use: "可以食用，也可能适合喂猫。", effect: `Hunger +${food.hunger}，Mood +${food.mood}` };
  return itemDetailText[itemId] ?? {
    description: `${itemNames[itemId]}是漂流生活中的常用物资。`,
    use: itemMeta[itemId].category === "materials" ? "用于料理、升级、修理或后续制作。" : "在合适的场景中使用。",
    effect: "没有即时效果，会在对应功能中消耗或生效。",
  };
}

function ItemDetailModal({
  state,
  itemId,
  onClose,
  onEat,
  onFeedCat,
  onOpenCrate,
  onUse,
  onDecorate,
}: {
  state: GameState;
  itemId: ItemId;
  onClose: () => void;
  onEat: (itemId: ItemId) => void;
  onFeedCat: (optionId: string) => void;
  onOpenCrate: (crate: "commonCrate" | "premiumCrate") => void;
  onUse: (itemId: ItemId) => void;
  onDecorate: (itemId: ItemId) => void;
}) {
  const detail = getItemDetail(itemId);
  const category = itemMeta[itemId].category;
  const count = state.inventory[itemId] ?? 0;
  const food = foodItems.find((item) => item.id === itemId);
  const catOption = getCatFeedOptions(state).find((option) => option.itemId === itemId);
  const crate = itemId === "commonCrate" || itemId === "premiumCrate" ? itemId : undefined;
  const usableItemIds: ItemId[] = ["wetWipes", "soap", "toothbrush", "toothpaste", "medkit"];
  const furnitureIds: ItemId[] = ["furnitureTicket", "foldingChair", "shellLamp", "waterproofMattress", "simpleToilet", "storageBox"];
  const equipmentActive = state.equipment.includes(itemId) || (itemId === "advancedRodItem" && state.equipment.includes("advancedRod"));

  const runAndClose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="wide-modal item-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{categoryLabels[category]}</p>
            <h2>{itemEmoji[itemId]} {itemNames[itemId]}</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <div className="item-detail-body">
          <span className="item-detail-emoji">{itemEmoji[itemId]}</span>
          <div>
            <p><strong>数量：</strong>x{count}</p>
            <p><strong>描述：</strong>{detail.description}</p>
            <p><strong>用途：</strong>{detail.use}</p>
            <p><strong>效果：</strong>{detail.effect}</p>
            {category === "equipment" && <p className={equipmentActive ? "ready" : "hint"}>{equipmentActive ? "当前已装备/已生效。" : "获得后会自动装备或生效。"}</p>}
          </div>
        </div>
        <div className="item-detail-actions">
          {food && <button className="primary-action" onClick={() => runAndClose(() => onEat(itemId))}>使用 / 食用</button>}
          {catOption && <button onClick={() => runAndClose(() => onFeedCat(catOption.id))}>喂猫</button>}
          {crate && <button className="primary-action" onClick={() => runAndClose(() => onOpenCrate(crate))}>打开礼包</button>}
          {usableItemIds.includes(itemId) && <button className="primary-action" onClick={() => runAndClose(() => onUse(itemId))}>使用</button>}
          {furnitureIds.includes(itemId) && <button onClick={() => runAndClose(() => onDecorate(itemId))}>布置</button>}
          {category === "equipment" && <button disabled>{equipmentActive ? "已装备" : "查看效果"}</button>}
          {category === "materials" && <button disabled>材料会在制作/升级时使用</button>}
        </div>
      </section>
    </div>
  );
}

const furnitureDetails: Record<string, { emoji: string; description: string; effect: string }> = {
  "迷你温泉": { emoji: "♨️", description: "小小一池热水，是海上小家最奢侈的角落。", effect: "每日 Mood +2，寒潮时 Mood 损失减少。" },
  "海上火锅桌": { emoji: "🍲", description: "稳稳固定在平台上的小火锅桌，适合庆祝钓到好鱼。", effect: "进食/料理 Mood 效果 +1，寒潮时额外保护。" },
  "豪华沙发": { emoji: "🛋️", description: "软乎乎的休息角，让木筏有了真正的客厅。", effect: "每日 Mood +2。" },
  "贝壳灯": { emoji: "🏮", description: "暖黄色小灯，坏天气里也能照亮小屋。", effect: "暴雨时减少 Mood 损失。" },
  "防水床垫": { emoji: "🛏️", description: "不会被浪花轻易打湿的床垫，睡起来踏实很多。", effect: "每日 Mood +1，暴雨/寒潮时减少 Mood 损失。" },
  "海上便利店许可证": { emoji: "🏪", description: "挂在小屋里的经营许可，感觉真的要开店了。", effect: "商店价格小幅优惠，也代表补给站经营感提升。" },
  "小木桌": { emoji: "🪵", description: "一张结实的小桌子，可以摆饭、摆贝壳、摆今天的收获。", effect: "提升生活感，后续可扩展更多料理/摆放效果。" },
  "折叠椅": { emoji: "🪑", description: "收放方便的椅子，适合坐着看海。", effect: "提升生活感，布置时 Mood 提升。" },
  "简易马桶": { emoji: "🚽", description: "朴素但重要的生活设施。", effect: "提升小屋生活质量。" },
  "收纳箱": { emoji: "📦", description: "把补给收好，心里也会安稳一点。", effect: "提升仓储感，后续可扩展背包容量效果。" },
};

function getFurnitureDetail(furniture: string) {
  return furnitureDetails[furniture] ?? { emoji: furnitureIcon(furniture), description: `${furniture}让海上小家更有生活感。`, effect: "已布置后持续生效。" };
}

function FurnitureDetailModal({ state, furniture, onClose, onRemove }: { state: GameState; furniture: string; onClose: () => void; onRemove: (furniture: string) => void }) {
  const detail = getFurnitureDetail(furniture);
  const placed = state.furniture.includes(furniture);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="wide-modal item-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">家具</p>
            <h2>{detail.emoji} {furniture}</h2>
          </div>
          <button className="compact-button" onClick={onClose}>关闭</button>
        </div>
        <div className="item-detail-body">
          <span className="item-detail-emoji">{detail.emoji}</span>
          <div>
            <p><strong>分类：</strong>家具</p>
            <p><strong>状态：</strong>{placed ? "已布置 / 生效中" : "未布置"}</p>
            <p><strong>描述：</strong>{detail.description}</p>
            <p><strong>布置效果：</strong>{detail.effect}</p>
          </div>
        </div>
        <div className="item-detail-actions">
          <button disabled={placed}>{placed ? "已布置" : "布置"}</button>
          <button className="danger-button" disabled={!placed} onClick={() => onRemove(furniture)}>收起</button>
          <button onClick={onClose}>关闭</button>
        </div>
      </section>
    </div>
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

function FishDexSummary({ state, discoveredCount, completion }: { state: GameState; discoveredCount: number; completion: number }) {
  const rewards = [
    { milestone: 25, label: "25% · 贝壳币 +20" },
    { milestone: 50, label: "50% · 普通补给包 x1" },
    { milestone: 75, label: "75% · 高级补给包 x1" },
    { milestone: 100, label: "100% · 星潮收藏家" },
  ];

  return (
    <div className="dex-summary">
      <div>
        <strong>鱼类收集卡册</strong>
        <span>已发现 {discoveredCount}/{fishList.length} 种鱼 · 完成度 {completion}%</span>
      </div>
      <div className="dex-progress"><span style={{ width: `${completion}%` }} /></div>
      <div className="dex-rewards">
        {rewards.map((reward) => {
          const claimed = state.fishDexRewardsClaimed?.includes(reward.milestone);
          const ready = completion >= reward.milestone;
          return <span className={claimed ? "claimed" : ready ? "ready" : ""} key={reward.milestone}>{claimed ? "已领取" : ready ? "可领取" : "未达成"} · {reward.label}</span>;
        })}
      </div>
    </div>
  );
}

function FishDexCard({ fish, state }: { fish: Fish; state: GameState }) {
  const entry = state.fishCollection[fish.id];
  const discovered = !!entry?.discovered;
  const isNew = state.newestFishId === fish.id;

  return (
    <article className={`fish-card rarity-fish-${fish.rarity.toLowerCase()} ${discovered ? "discovered" : "unknown"} ${isNew ? "new-discovery" : ""}`}>
      {isNew && <span className="new-pill">NEW</span>}
      <div className="fish-card-top">
        <span className="fish-icon">{discovered ? fish.emoji : "?"}</span>
        <span className="rarity-chip">{fish.rarity}</span>
      </div>
      <h3>{discovered ? fish.name : "???"}</h3>
      <p>{discovered ? fish.description : "这张卡还没有点亮，描述被海雾藏起来了。"}</p>
      <div className="fish-meta">
        <span>售价 {discovered ? fish.basePrice : "?"} 🐚</span>
        <span>天气 {discovered ? fish.weatherHint?.join(" / ") : "???"}</span>
        <span>条件 {discovered ? fish.timeHint : "???"}</span>
        <span>拥有 {entry?.count ?? 0}</span>
      </div>
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
  const rarity = recipe.rarity ?? "Common";
  const firstCooked = state.firstCookedRecipeIds?.includes(recipe.id);
  const weatherBonus = ["fishSoup", "seafoodSoup", "cannedRamen", "warmFishSoup", "driftHotpot", "deluxeSeafoodPot"].includes(recipe.output)
    ? state.weather === "寒潮" ? "寒潮热食加成：Mood +6" : state.weather === "暴雨" || state.weather === "风暴" ? "坏天气热食加成：Mood +3" : "寒潮/坏天气时有热食加成"
    : recipe.id.includes("grilled") || recipe.id.includes("skewer") ? "打火机或烤架可少消耗木板" : "天气加成：无";

  return (
    <article className={`recipe-card recipe-rarity-${rarity.toLowerCase()} ${status.canCook ? "craftable" : ""} ${status.unlocked ? "" : "locked"}`}>
      {status.canCook && <span className="item-badge">可制作</span>}
      {!status.unlocked && <span className="item-badge locked-badge">未解锁</span>}
      <div className="recipe-title">
        <span>{recipe.emoji}</span>
        <div>
          <h3>{recipe.name}</h3>
          <p>{recipe.description}</p>
        </div>
      </div>
      <div className="recipe-tags">
        <span>{rarity}</span>
        <span>{status.unlocked ? "已解锁" : recipe.unlockHint ?? "未解锁"}</span>
        {recipe.catFavorite && <span>猫猫也喜欢</span>}
        {firstCooked && <span>已收录</span>}
      </div>
      <div className="recipe-block">
        <strong>所需材料</strong>
        <RequirementList state={state} items={status.effectiveCost} />
        {recipe.fishCount && (
          <span className={status.selectedFish.length >= recipe.fishCount ? "fish-requirement met" : "fish-requirement missing"}>
            🐟 {recipe.fishIds?.length ? recipe.fishIds.map((id) => fishList.find((fishItem) => fishItem.id === id)?.name ?? "指定鱼").join(" / ") : recipe.rareFishOnly ? "Rare以上鱼" : "Common/Uncommon鱼"} {status.selectedFish.length}/{recipe.fishCount}
          </span>
        )}
      </div>
      <div className="recipe-result">
        <span>获得：{itemEmoji[recipe.output]} {itemNames[recipe.output]} x1</span>
        {food && <span>进食效果：Hunger +{food.hunger} / Mood +{food.mood}</span>}
        <span className="recipe-weather-bonus">{weatherBonus}</span>
      </div>
      <p className={status.canCook ? "ready" : "hint recipe-missing"}>{status.canCook ? "材料齐了，可以制作。" : status.unlocked ? `不足：${status.missing.join("、")}` : recipe.unlockHint ?? "继续漂流后解锁。"}</p>
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
