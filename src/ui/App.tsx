import { useEffect, useMemo, useState } from "react";
import { ACTION_TAGS } from "../types/common";
import type { EventDefinition } from "../types/events";
import type { RuleDefinition } from "../types/rules";
import type { SaveData } from "../types/save";
import { ConditionEvaluator } from "../core/ConditionEvaluator";
import { EffectExecutor } from "../core/EffectExecutor";
import { EventDispatcher } from "../core/EventDispatcher";
import { createInitialState, GameStateStore } from "../core/GameStateStore";
import { RuleSystem } from "../systems/RuleSystem";
import { InvestigationSystem } from "../systems/InvestigationSystem";
import { PuzzleSystem } from "../systems/PuzzleSystem";
import { CHAPTER1_CLUES, CHAPTER1_DEDUCTION_GROUPS } from "../data/chapter1Investigation";
import { InvestigationNotebook } from "./InvestigationNotebook";
import { SceneIllustration } from "./SceneIllustration";

type ActiveModal = "rules" | "notebook" | "puzzles" | "map" | "logs" | "hint" | null;

const SAVE_STORAGE_KEY = "vung_cam_ch01_quicksave_v2";

const SCENES = [
  {
    id: "SC-01", name: "Cổng trạm", time: "23:40",
    description: "Cánh cổng sắt ngăn cách bạn với con đường dẫn vào trạm. Sương trắng đang áp sát hàng rào. Một chiếc đèn pin cũ nằm trên bệ gác.",
    detail: "Phía sau lớp sương, ánh đèn hải đăng vẫn quay đều. Không có bóng người ở vọng gác."
  },
  {
    id: "SC-02", name: "Phòng trực", time: "00:15",
    description: "Máy bộ đàm phát ra tiếng rè đều đặn. Một cuốn sổ trực, hồ sơ nhân sự và máy cassette nằm trên bàn.",
    detail: "Bản tin thời tiết vừa in ra có một dòng mô tả chính xác bộ quần áo bạn đang mặc."
  },
  {
    id: "SC-03", name: "Khu nghỉ nhân viên", time: "00:35",
    description: "Những chiếc giường được xếp ngay ngắn. Tủ đồ số 04 thỉnh thoảng phát ra ba tiếng gõ.",
    detail: "Một tủ dụng cụ bị khóa. Trên sàn có dấu kéo lê hướng về phía phòng máy."
  },
  {
    id: "SC-04", name: "Phòng máy", time: "01:10",
    description: "Máy phát điện hoạt động không ổn định. Sơ đồ tải điện được ghim cạnh bảng điều khiển.",
    detail: "Một nhánh điện phụ đang tiêu thụ công suất bất thường. Chế độ OVERLOAD được đánh dấu bằng mực đỏ."
  },
  {
    id: "SC-05", name: "Phòng quan sát", time: "01:55",
    description: "Màn hình radar phủ đầy nhiễu. Một góc màn hình bị che bởi vết xước hình bán nguyệt.",
    detail: "Có một ngăn kéo bí mật phía dưới bàn thiết bị. Camera ghi lại sương di chuyển về phía nguồn sáng."
  },
  {
    id: "SC-06", name: "Buồng đèn", time: "02:30",
    description: "Thấu kính khổng lồ chiếm gần hết căn phòng. Cánh cửa buồng đèn có một bảng nhập mã tần số.",
    detail: "Chùm sáng trắng quét qua căn phòng theo chu kỳ. Vùng trung tâm không có bộ lọc đỏ là vùng nguy hiểm."
  }
] as const;

const SCENE_RULE_UNLOCKS: Record<string, string[]> = {
  "SC-01": ["R-01", "R-10"],
  "SC-02": ["R-02", "R-04", "R-09"],
  "SC-03": ["R-06"],
  "SC-04": ["R-05"],
  "SC-05": ["R-07", "R-08"],
  "SC-06": ["R-03"]
};

const ITEMS: Record<string, { name: string; note: string }> = {
  "I-01": { name: "Đèn pin", note: "Đèn pin cầm tay. Bấm vào ô vật phẩm để Bật/Tắt (lưu ý Quy tắc 10 khi sương tràn hoặc điện LOW)." },
  "I-02": { name: "Chìa khóa tủ", note: "Chìa khóa đồng mở tủ dụng cụ tại Khu nghỉ nhân viên (SC-03)." },
  "I-03": { name: "Băng cassette", note: "Cuộn băng ghi âm cuối cùng. Phát bằng máy cassette tại Phòng trực (SC-02)." },
  "I-04": { name: "Cầu chì 30A", note: "Cầu chì công nghiệp dùng để ổn định bảng tải điện Phòng máy (SC-04)." },
  "I-05": { name: "Bộ lọc đỏ", note: "Kính lọc bước sóng > 620nm. Lắp vào thấu kính Buồng đèn (SC-06)." },
  "I-06": { name: "Sổ mã tần số", note: "Bản ghi kỹ thuật trạm: 'Tần số mở khóa liên động buồng đèn Mũi Sương: 6208 Hz'." }
};

const RULES: RuleDefinition[] = [
  {
    id: "R-01", code: "QUY TẮC 01", title: "Cánh cổng trong sương",
    type: "true", scope: "Toàn trạm",
    baseText: "Không mở cửa ra ngoài khi sương mù đang áp sát chân tường trạm.",
    violationTriggers: [{ actionTag: ACTION_TAGS.OPEN_EXTERIOR_DOOR }],
    maxViolations: 1,
    onViolate: {
      effects: [
        { type: "SET_FLAG", key: "fog_breached", value: true },
        { type: "SET_ENTITY_STATE", entityId: "EN-01", state: "stalking" },
        { type: "TRIGGER_FX", fx: "red_flash", durationMs: 650 },
        { type: "SHOW_LOG", message: "[VI PHẠM R-01] Sương trắng (EN-01) đã tràn qua cánh cổng." }
      ]
    },
    countermeasureHint: "Không mở cửa ngoài."
  },
  {
    id: "R-02", code: "QUY TẮC 02", title: "Bản tin vô tuyến",
    type: "true", scope: "SC-02 · Phòng trực",
    baseText: "Khi bản tin mô tả bạn, hãy tạm dừng bộ đàm. Không trả lời micro.",
    violationTriggers: [
      { actionTag: ACTION_TAGS.ANSWER_RADIO, condition: { flagEquals: { key: "radio_state", value: "broadcasting" } } }
    ],
    maxViolations: 1,
    onViolate: {
      effects: [
        { type: "SET_FLAG", key: "identity_exposed", value: true },
        { type: "SHOW_LOG", message: "[VI PHẠM R-02] Bộ đàm đã ghi nhận giọng nói của bạn." }
      ]
    },
    countermeasureHint: "Tạm dừng bộ đàm trước khi tương tác."
  },
  {
    id: "R-03", code: "QUY TẮC 03", title: "Vùng sáng trung tâm",
    type: "true", scope: "SC-06 · Buồng đèn",
    baseText: "Không bước vào vùng sáng trung tâm trước khi lắp bộ lọc đỏ.",
    violationTriggers: [
      { actionTag: ACTION_TAGS.ENTER_LANTERN_BEAM, condition: { flagEquals: { key: "red_filter_installed", value: false } } }
    ],
    maxViolations: 1,
    onViolate: { effects: [{ type: "TRIGGER_ENDING", endingId: "END-03" }] },
    countermeasureHint: "Lắp bộ lọc đỏ trước khi tiếp cận thấu kính."
  },
  {
    id: "R-04", code: "QUY TẮC 04", title: "Sổ đăng ký nhân sự",
    type: "fake", scope: "SC-02 · Phòng trực",
    baseText: "Hãy ký tên vào sổ trực và báo mã nhân viên qua bộ đàm.",
    violationTriggers: [],
    countermeasureHint: "Không cung cấp danh tính."
  },
  {
    id: "R-05", code: "QUY TẮC 05", title: "Chế độ quá tải",
    type: "fake", scope: "SC-04 · Phòng máy",
    baseText: "Khi đèn hành lang chuyển đỏ, hãy đặt nguồn điện ở chế độ OVERLOAD.",
    violationTriggers: [],
    countermeasureHint: "Đối chiếu sơ đồ tải điện trước khi đổi chế độ."
  },
  {
    id: "R-06", code: "QUY TẮC 06", title: "Tủ đồ số 04",
    type: "fake", scope: "SC-03 · Khu nghỉ",
    baseText: "Khi nghe ba tiếng gõ, hãy mở tủ đồ số 04.",
    violationTriggers: [],
    countermeasureHint: "Không mở tủ khi có tiếng gõ."
  },
  {
    id: "R-07", code: "QUY TẮC 07", title: "Thiết bị quan sát",
    type: "conditional", scope: "SC-05 · Phòng quan sát",
    baseText: "Thiết bị quan sát chỉ hoạt động an toàn khi nguồn điện ở chế độ LOW.",
    activeCondition: { flagEquals: { key: "power_mode", value: "low" } },
    violationTriggers: [
      { actionTag: ACTION_TAGS.USE_OBSERVATION_GEAR, condition: { not: { flagEquals: { key: "power_mode", value: "low" } } } }
    ],
    maxViolations: 1,
    onViolate: { effects: [{ type: "SHOW_LOG", message: "[VI PHẠM R-07] Thiết bị bị nhiễu và không thể đọc dữ liệu." }] },
    countermeasureHint: "Chuyển nguồn điện về LOW."
  },
  {
    id: "R-08", code: "QUY TẮC 08", title: "Khóa liên động",
    type: "true", scope: "SC-05 → SC-06",
    baseText: "Cửa buồng đèn chỉ được mở khi bộ đàm đã tạm dừng.",
    violationTriggers: [
      { actionTag: ACTION_TAGS.OPEN_LANTERN_DOOR, condition: { not: { flagEquals: { key: "radio_state", value: "paused" } } } }
    ],
    maxViolations: 1,
    onViolate: { effects: [{ type: "SHOW_LOG", message: "[VI PHẠM R-08] Khóa liên động từ chối mở cửa buồng đèn." }] },
    countermeasureHint: "Tạm dừng bộ đàm."
  },
  {
    id: "R-09", code: "QUY TẮC 09", title: "Điện thoại nội bộ",
    type: "transforming", scope: "SC-02 · Phòng trực",
    baseText: "Hãy nhấc điện thoại nội bộ để nhận chỉ thị từ trạm trưởng.",
    transformCondition: { flagEquals: { key: "captain_missing_confirmed", value: true } },
    transformedText: "Trạm trưởng đã mất tích. Không nghe điện thoại nội bộ; hãy ngắt kết nối.",
    violationTriggers: [{ actionTag: ACTION_TAGS.ANSWER_PHONE }],
    maxViolations: 1,
    onViolate: { effects: [{ type: "SHOW_LOG", message: "[VI PHẠM R-09] Đầu dây bên kia gọi đúng tên bạn." }] },
    countermeasureHint: "Xác minh hồ sơ nhân sự trước khi nghe máy."
  },
  {
    id: "R-10", code: "QUY TẮC 10", title: "Nguồn sáng nhân tạo",
    type: "transforming", scope: "Toàn trạm",
    baseText: "Luôn bật đèn pin khi di chuyển trong khu vực tối.",
    transformCondition: {
      any: [
        { flagEquals: { key: "fog_breached", value: true } },
        { flagEquals: { key: "power_mode", value: "low" } }
      ]
    },
    transformedText: "Tắt mọi nguồn sáng nhân tạo trước khi di chuyển. Sương đang hướng về phía ánh sáng.",
    violationTriggers: [
      { actionTag: ACTION_TAGS.LEAVE_SCENE, condition: { flagEquals: { key: "flashlight_on", value: true } } }
    ],
    maxViolations: 1,
    onViolate: { effects: [{ type: "SHOW_LOG", message: "[VI PHẠM R-10] Sương bắt đầu di chuyển theo ánh đèn pin." }] },
    countermeasureHint: "Tắt đèn pin trước khi rời cảnh."
  }
];

/** EventDefinition xử lý các bẫy quy tắc giả (R-04, R-05, R-06) theo hướng data-driven */
const CHAPTER1_EVENT_DEFINITIONS: EventDefinition[] = [
  {
    id: "EV-R04-SIGN",
    triggerEvent: "PLAYER_ACTION_PERFORMED",
    eventFilter: { actionTags: [ACTION_TAGS.SIGN_LOGBOOK], sceneIds: ["SC-02"] },
    result: {
      onceId: "once_r04_sign",
      effects: [
        { type: "SET_FLAG", key: "identity_exposed", value: true },
        { type: "SHOW_LOG", message: "[BẪY QUY TẮC R-04] Mực trên trang sổ trực thấm ngược vào giấy. Danh tính của bạn đã bị ghi nhận." }
      ]
    }
  },
  {
    id: "EV-R04-REPORT",
    triggerEvent: "PLAYER_ACTION_PERFORMED",
    eventFilter: { actionTags: [ACTION_TAGS.REPORT_ID], sceneIds: ["SC-02"] },
    result: {
      onceId: "once_r04_report",
      effects: [
        { type: "SET_FLAG", key: "identity_exposed", value: true },
        { type: "SHOW_LOG", message: "[BẪY QUY TẮC R-04] Tín hiệu phản hồi lặp lại đúng mã nhân viên bạn vừa đọc." }
      ]
    }
  },
  {
    id: "EV-R05-OVERLOAD",
    triggerEvent: "PLAYER_ACTION_PERFORMED",
    eventFilter: { actionTags: [ACTION_TAGS.USE_ITEM], targetIds: ["power_overload_switch"], sceneIds: ["SC-04"] },
    result: {
      onceId: "once_r05_overload",
      effects: [
        { type: "SET_FLAG", key: "power_mode", value: "overload" },
        { type: "SET_FLAG", key: "fog_breached", value: true },
        { type: "SET_ENTITY_STATE", entityId: "EN-01", state: "stalking" },
        { type: "TRIGGER_FX", fx: "red_flash", durationMs: 650 },
        { type: "SHOW_LOG", message: "[BẪY QUY TẮC R-05] Cầu dao quá tải làm nổ khóa cổng ngoài. Sương tràn vào hành lang!" }
      ]
    }
  },
  {
    id: "EV-R06-LOCKER04",
    triggerEvent: "PLAYER_ACTION_PERFORMED",
    eventFilter: { actionTags: [ACTION_TAGS.OPEN_LOCKER_04], sceneIds: ["SC-03"] },
    condition: { flagEquals: { key: "locker_knocking", value: true } },
    result: {
      onceId: "once_r06_locker04",
      effects: [
        { type: "SET_ENTITY_STATE", entityId: "EN-02", state: "stalking" },
        { type: "TRIGGER_FX", fx: "red_flash", durationMs: 500 },
        { type: "SHOW_LOG", message: "[BẪY QUY TẮC R-06] Bóng đen (EN-02) trườn ra từ khe tủ số 04 trước khi bạn kịp sập cửa!" }
      ]
    }
  }
];

const INV_STATUS_BADGE: Record<string, { text: string; tone: string }> = {
  unverified: { text: "Chưa đối chiếu", tone: "neutral" },
  supported: { text: "Có bằng chứng", tone: "warn" },
  contradicted: { text: "Bị phản bác", tone: "warn" },
  conditional_confirmed: { text: "Xác nhận điều kiện", tone: "ok" },
  verified: { text: "Luật thật", tone: "ok" },
  debunked_fake: { text: "Quy tắc giả", tone: "fake" },
  conflicted: { text: "Mâu thuẫn", tone: "fake" }
};

function makeInitialState() {
  const state = createInitialState("CH-01", "SC-01");
  state.discoveredRuleIds = ["R-01", "R-10"];
  state.ruleLifecycleStates = Object.fromEntries(
    RULES.map(r => [r.id, r.id === "R-01" || r.id === "R-10" ? "active" : "inactive"])
  ) as typeof state.ruleLifecycleStates;
  state.flags = {
    power_mode: "normal",
    radio_state: "broadcasting",
    fog_breached: false,
    identity_exposed: false,
    locker_knocking: false,
    flashlight_on: false,
    red_filter_installed: false,
    captain_missing_confirmed: false
  };
  state.logs = ["23:40 · Bắt đầu ca trực thay thế tại Trạm Hải Đăng Mũi Sương (Trạm 09)."];
  return state;
}

function loadSavedFromStorage(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

function createEngine() {
  const store = new GameStateStore(makeInitialState());
  const evaluator = new ConditionEvaluator();
  const executor = new EffectExecutor(store);
  const dispatcher = new EventDispatcher(store, evaluator, executor, CHAPTER1_EVENT_DEFINITIONS);
  const investigation = new InvestigationSystem(store, executor, dispatcher, CHAPTER1_CLUES, CHAPTER1_DEDUCTION_GROUPS);

  const puzzleDefinitions = [
    { id: "PZ-01", sceneId: "SC-04", title: "Cân bằng tải điện", description: "Nhập mã chế độ tải an toàn theo sơ đồ mạch điện.", solutionType: "passcode" as const },
    { id: "PZ-02", sceneId: "SC-05", title: "Tọa độ điểm mù", description: "Nhập mã tọa độ 4 chữ số quan sát được trên màn hình radar.", solutionType: "passcode" as const },
    { id: "PZ-03", sceneId: "SC-05", title: "Khóa tần số buồng đèn", description: "Nhập tần số mở khóa liên động buồng đèn (4 chữ số).", solutionType: "passcode" as const }
  ];
  const puzzleSolutions = [
    {
      puzzleId: "PZ-01", expectedSolution: "LOW",
      onSolve: {
        effects: [
          { type: "SET_FLAG" as const, key: "power_mode", value: "low" },
          { type: "DISCOVER_RULE" as const, ruleId: "R-07" },
          { type: "SHOW_LOG" as const, message: "Nguồn điện đã chuyển sang LOW. Thiết bị quan sát được cấp nguồn ổn định." }
        ]
      }
    },
    {
      puzzleId: "PZ-02", expectedSolution: "2714",
      onSolve: {
        effects: [
          { type: "ADD_ITEM" as const, itemId: "I-05" },
          { type: "SET_FLAG" as const, key: "red_filter_installed", value: false },
          { type: "DISCOVER_CLUE" as const, clueId: "C-08" },
          { type: "SHOW_LOG" as const, message: "Ngăn bí mật mở ra. Bạn tìm thấy Bộ lọc đỏ (I-05) và Bản nháp viết tay (C-08)." }
        ]
      }
    },
    {
      puzzleId: "PZ-03", expectedSolution: "6208",
      onSolve: {
        effects: [
          { type: "SHOW_LOG" as const, message: "Mã tần số được chấp nhận. Chốt cơ khí cửa buồng đèn đã mở." }
        ]
      }
    }
  ];
  const puzzles = new PuzzleSystem(store, executor, dispatcher, puzzleDefinitions, puzzleSolutions);
  return { store, evaluator, executor, dispatcher, investigation, puzzles };
}

export default function App() {
  const engine = useMemo(() => createEngine(), []);
  // Khởi tạo RuleSystem theo lifecycle của component để an toàn tuyệt đối với React StrictMode
  const rules = useMemo(
    () => new RuleSystem(engine.store, engine.evaluator, engine.executor, engine.dispatcher, RULES),
    [engine]
  );

  const [, refresh] = useState(0);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [preselectedRuleId, setPreselectedRuleId] = useState<string | undefined>(undefined);
  const [speaker, setSpeaker] = useState("NHẬP CA TRỰC · 23:40");
  const [dialogue, setDialogue] = useState(
    "Bạn nhận lệnh trực thay ca đêm tại Trạm Hải Đăng Mũi Sương. Cánh cổng sắt đóng chặt; sương trắng đang ép sát hàng rào. Một chiếc đèn pin nằm trên bệ gác."
  );
  const [isViolationMsg, setIsViolationMsg] = useState(false);
  const [puzzleInputs, setPuzzleInputs] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState(false);
  const [savedSlot, setSavedSlot] = useState<SaveData | null>(() => loadSavedFromStorage());

  const state = engine.store.snapshot();
  const sceneIdx = SCENES.findIndex(s => s.id === state.currentSceneId);
  const scene = SCENES[sceneIdx >= 0 ? sceneIdx : 0];
  const nextScene = SCENES[sceneIdx + 1];
  const discoveredClues = state.discoveredClueIds;
  const discoveredRules = rules.getDiscoveredRules();
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  const has = (id: string) => state.inventoryItemIds.includes(id);
  const refreshUI = () => refresh(v => v + 1);

  useEffect(() => {
    const unsubscribe = engine.dispatcher.subscribe(event => {
      if (event.type === "RULE_VIOLATED") {
        setSpeaker(`CẢNH BÁO · ${event.ruleId}`);
        setIsViolationMsg(true);
        setDialogue(`Bạn vừa vi phạm ${event.ruleId}! Hậu quả đã được ghi nhận trong nhật ký.`);
      }
      if (event.type === "FX_REQUESTED" && event.fx === "red_flash") {
        setFlash(true);
        window.setTimeout(() => setFlash(false), event.durationMs);
      }
      refreshUI();
    });
    return () => {
      unsubscribe();
    };
  }, [engine]);

  const say = (who: string, text: string, violation = false, writeLog = true) => {
    if (writeLog) {
      const currentLogs = engine.store.snapshot().logs;
      if (currentLogs[currentLogs.length - 1] !== text) {
        engine.store.addLog(text);
      }
    }
    setSpeaker(who);
    setIsViolationMsg(violation);
    setDialogue(text);
    refreshUI();
  };

  const setFlag = (key: string, value: string | boolean) => {
    engine.store.setFlag(key, value);
    engine.dispatcher.dispatch({ type: "STATE_CHANGED", domain: "flags", targetId: key, sceneId: state.currentSceneId });
    refreshUI();
  };

  const perform = (actionTag: keyof typeof ACTION_TAGS, targetId: string) => {
    engine.dispatcher.dispatch({
      type: "PLAYER_ACTION_PERFORMED",
      actionTag: ACTION_TAGS[actionTag],
      targetId,
      sceneId: state.currentSceneId
    });
    refreshUI();
  };

  const discoverClue = (id: string, text: string) => {
    if (discoveredClues.includes(id)) {
      say(`HỒ SƠ ${id}`, text, false, false);
      setActiveModal("notebook");
      return;
    }
    engine.store.discoverClue(id);
    say(`MANH MỐI MỚI · ${id}`, text);
  };

  const addItem = (id: string) => {
    if (has(id)) return;
    engine.store.addItem(id);
    say("THU THẬP VẬT PHẨM", `Đã cất [${ITEMS[id]?.name ?? id}] vào túi đồ.`);
  };

  const getSceneLockReason = (id: string): string | null => {
    if (id === "SC-03" && !discoveredClues.includes("C-01") && !has("I-02")) {
      return "Hãy kiểm tra tài liệu hoặc lấy chìa khóa tại Phòng trực (SC-02) trước khi sang Khu nghỉ.";
    }
    if (id === "SC-04" && !has("I-04")) {
      return "Cửa Phòng máy cần Cầu chì công nghiệp 30A (I-04) tìm thấy tại Khu nghỉ (SC-03).";
    }
    if (id === "SC-05" && !solved("PZ-01")) {
      return "Phòng quan sát chưa ổn định nguồn. Hãy giải Cân bằng tải điện (PZ-01) tại Phòng máy trước.";
    }
    if (id === "SC-06" && !solved("PZ-03")) {
      return "Cửa buồng đèn đang khóa. Hãy giải Khóa tần số (PZ-03) tại Phòng quan sát trước.";
    }
    return null;
  };

  const go = (id: string) => {
    if (id === state.currentSceneId) return;
    const lockReason = getSceneLockReason(id);
    if (lockReason) {
      say("LỐI ĐI BỊ KHÓA", lockReason, true, false);
      return;
    }

    // Kiểm tra R-08 qua hành động mở cửa buồng đèn thực tế
    if (id === "SC-06") {
      const beforeR08 = rules.getViolationCount("R-08");
      perform("OPEN_LANTERN_DOOR", "lantern_door");
      if (rules.getViolationCount("R-08") > beforeR08 || engine.store.snapshot().activeEndingId !== null) {
        return;
      }
    }

    // Kiểm tra R-10 trước khi rời cảnh; nếu vi phạm R-10 hoặc kích hoạt ending thì dừng chuyển cảnh
    const beforeR10 = rules.getViolationCount("R-10");
    perform("LEAVE_SCENE", `leave_${state.currentSceneId}`);
    const postLeaveState = engine.store.snapshot();
    if (postLeaveState.activeEndingId !== null || rules.getViolationCount("R-10") > beforeR10) {
      return;
    }

    engine.store.changeScene(id);
    engine.dispatcher.dispatch({ type: "SCENE_ENTERED", sceneId: id });

    const unlockRules = SCENE_RULE_UNLOCKS[id] ?? [];
    for (const rId of unlockRules) {
      if (!engine.store.snapshot().discoveredRuleIds.includes(rId)) {
        engine.store.discoverRule(rId);
      }
    }

    const target = SCENES.find(s => s.id === id);
    setActiveModal(null);
    say(`${target?.id} · ${target?.name.toUpperCase()}`, target?.description ?? "");
  };

  const submitPuzzle = (puzzleId: string) => {
    const inputVal = puzzleInputs[puzzleId] ?? "";
    const result = engine.puzzles.submitSolution(puzzleId, inputVal);
    if (result.status === "solved") {
      setPuzzleInputs(prev => ({ ...prev, [puzzleId]: "" }));
      setActiveModal(null);
      say("GIẢI MÃ THÀNH CÔNG", `Cơ cấu ${puzzleId} đã mở khóa!`);
    } else if (result.status === "failed") {
      say("MÃ KHÔNG KHỚP", `Sai mật mã ${puzzleId} (lần thử ${result.attemptsUsed}). Hãy kiểm tra tài liệu hoặc vật phẩm đã thu thập.`, true, false);
    } else {
      say("THÔNG BÁO", `Không thể thực hiện ${puzzleId}: ${result.status}.`, true, false);
    }
    refreshUI();
  };

  const end = (endingId: string) => {
    const events = engine.executor.execute({ effects: [{ type: "TRIGGER_ENDING", endingId }] });
    events.forEach(event => engine.dispatcher.dispatch(event));
    refreshUI();
  };

  const getHintText = (): string => {
    if (!has("I-01")) return "Nhặt Đèn pin trên bệ gác Cổng trạm, tuyệt đối không mở cửa ngoài, rồi tiến vào Phòng trực (SC-02).";
    if (state.currentSceneId === "SC-01") return "Bấm 'Tiến tới Phòng trực' để bắt đầu kiểm tra hồ sơ ca trực.";
    if (!discoveredClues.includes("C-01") || !discoveredClues.includes("C-03")) {
      return "Đọc Bản tin nhiệt và Hồ sơ nhân sự trên bàn trực để nắm tình trạng trạm trưởng.";
    }
    if (state.flags.radio_state === "broadcasting") {
      return "Tạm dừng bộ đàm (PAUSED) để tránh lộ danh tính và đáp ứng khóa liên động buồng đèn.";
    }
    if (!has("I-04")) return "Lấy Chìa khóa tủ (I-02) và Sổ mã tần số (I-06) ở Phòng trực, sau đó sang Khu nghỉ (SC-03) lấy Cầu chì 30A (I-04).";
    if (!solved("PZ-01")) return "Sang Phòng máy (SC-04), đọc Sơ đồ tải điện để tìm chế độ tải an toàn rồi mở khóa PZ-01.";
    if (!has("I-05") || !solved("PZ-03")) {
      return "Sang Phòng quan sát (SC-05), bật thiết bị quan sát để đọc tọa độ điểm mù (PZ-02) và tra cứu Sổ mã tần số (I-06) để mở khóa PZ-03.";
    }
    if (!state.flags.red_filter_installed) {
      return "Lên Buồng đèn (SC-06) và lắp Bộ lọc đỏ vào thấu kính trước khi bước vào vùng sáng trung tâm.";
    }
    return "Mở Sổ tay đối chiếu các manh mối đã thu thập để phân loại quy tắc thật/giả trước khi quyết định kết thúc ca trực.";
  };

  const stageHotspots: Array<{
    id: string; label: string; x: string; y: string; onClick: () => void;
    danger?: boolean; done?: boolean; disabled?: boolean;
  }> = (() => {
    switch (scene.id) {
      case "SC-01":
        return [
          { id: "hs1", label: "Khe cổng sắt", x: "28%", y: "58%", onClick: () => say("QUAN SÁT", "Sương trắng đang áp sát hàng rào. Không có bóng người ở vọng gác.") },
          { id: "hs2", label: has("I-01") ? "✓ Đèn pin" : "Đèn pin trên bệ gác", x: "66%", y: "66%", done: has("I-01"), onClick: () => addItem("I-01") },
          { id: "hs3", label: "Cửa ngoài", x: "48%", y: "46%", danger: true, disabled: Boolean(state.flags.fog_breached), onClick: () => perform("OPEN_EXTERIOR_DOOR", "hs_exterior_door") }
        ];
      case "SC-02":
        return [
          { id: "hs1", label: discoveredClues.includes("C-01") ? "✓ Bản tin nhiệt" : "Máy in bản tin", x: "23%", y: "48%", done: discoveredClues.includes("C-01"), onClick: () => discoverClue("C-01", "Bản tin mô tả chính xác trang phục của bạn.") },
          { id: "hs2", label: discoveredClues.includes("C-03") ? "✓ Hồ sơ nhân sự" : "Hồ sơ trên bàn", x: "50%", y: "62%", done: discoveredClues.includes("C-03"), onClick: () => { discoverClue("C-03", "Hồ sơ xác nhận trạm trưởng đã mất tích."); setFlag("captain_missing_confirmed", true); } },
          { id: "hs3", label: `Bộ đàm (${String(state.flags.radio_state).toUpperCase()})`, x: "76%", y: "48%", done: state.flags.radio_state === "paused", onClick: () => { setFlag("radio_state", "paused"); say("BỘ ĐÀM", "Đã chuyển bộ đàm sang trạng thái TẠM DỪNG (PAUSED)."); } }
        ];
      case "SC-03":
        return [
          { id: "hs1", label: has("I-04") ? "✓ Cầu chì 30A" : "Hộp dụng cụ", x: "26%", y: "56%", done: has("I-04"), onClick: () => addItem("I-04") },
          { id: "hs2", label: "Tủ đồ số 04", x: "72%", y: "48%", danger: true, onClick: () => {
            perform("OPEN_LOCKER_04", "locker_04");
            if (!state.flags.locker_knocking) say("TỦ SỐ 04", "Tủ số 04 trống rỗng.");
          }}
        ];
      case "SC-04":
        return [
          { id: "hs1", label: discoveredClues.includes("C-04") ? "✓ Sơ đồ tải điện" : "Bảng sơ đồ mạch", x: "28%", y: "44%", done: discoveredClues.includes("C-04"), onClick: () => discoverClue("C-04", "OVERLOAD làm thấu kính quét xuyên tường; LOW triệt nhiễu.") },
          { id: "hs2", label: solved("PZ-01") ? "✓ Nguồn: LOW" : "Bảng điều khiển tải", x: "68%", y: "54%", done: solved("PZ-01"), onClick: () => setActiveModal("puzzles") }
        ];
      case "SC-05":
        return [
          { id: "hs1", label: discoveredClues.includes("C-06") ? "✓ Camera hành lang" : "Màn hình CCTV", x: "26%", y: "42%", done: discoveredClues.includes("C-06"), onClick: () => discoverClue("C-06", "Khi nguồn LOW hoặc sương tràn, sương hướng về nguồn sáng.") },
          { id: "hs2", label: discoveredClues.includes("C-07") ? "✓ Bảng bộ lọc" : "Tài liệu hiệu chỉnh", x: "74%", y: "42%", done: discoveredClues.includes("C-07"), onClick: () => discoverClue("C-07", "Ánh sáng đỏ trên 620nm vô hiệu hóa chức năng ghi nhận.") },
          { id: "hs3", label: solved("PZ-02") ? "✓ Ngăn bí mật" : "Ngăn kéo dưới bàn", x: "50%", y: "66%", done: solved("PZ-02"), onClick: () => setActiveModal("puzzles") }
        ];
      case "SC-06":
        return [
          { id: "hs1", label: state.flags.red_filter_installed ? "✓ Đã lắp bộ lọc đỏ" : "Khay bộ lọc đỏ", x: "31%", y: "48%", done: Boolean(state.flags.red_filter_installed), onClick: () => {
            if (!has("I-05")) { say("THIẾU VẬT PHẨM", "Bạn chưa có Bộ lọc đỏ (I-05).", true, false); return; }
            setFlag("red_filter_installed", true);
            say("THẤU KÍNH", "Bộ lọc đỏ đã được lắp. Luồng sáng chuyển sang sắc đỏ 620nm an toàn.");
          }},
          { id: "hs2", label: "Vùng sáng trung tâm", x: "68%", y: "46%", danger: !state.flags.red_filter_installed, onClick: () => perform("ENTER_LANTERN_BEAM", "central_beam") }
        ];
      default:
        return [];
    }
  })();

  const choice = (label: string, fn: () => void, opts?: { danger?: boolean; disabled?: boolean; done?: boolean; nav?: boolean }) => (
    <button
      type="button"
      className={`choice-btn ${opts?.danger ? "danger" : ""} ${opts?.done ? "done" : ""} ${opts?.nav ? "nav-next" : ""}`}
      onClick={fn}
      disabled={opts?.disabled}
    >
      {opts?.done ? `✓ ${label}` : label}
    </button>
  );

  const renderSceneChoices = () => {
    const moveNext = nextScene && choice(`Tiến tới ${nextScene.name} →`, () => go(nextScene.id), { nav: true });
    switch (scene.id) {
      case "SC-01":
        return <>
          {choice("Quan sát cổng", () => say("QUAN SÁT", "Sương trắng đang áp sát hàng rào. Không có người ở vọng gác."))}
          {choice("Nhặt đèn pin", () => addItem("I-01"), { done: has("I-01"), disabled: has("I-01") })}
          {choice("Mở cửa ngoài", () => perform("OPEN_EXTERIOR_DOOR", "hs_exterior_door"), { danger: true, disabled: Boolean(state.flags.fog_breached) })}
          {moveNext}
        </>;
      case "SC-02":
        return <>
          {choice("Đọc bản tin nhiệt", () => discoverClue("C-01", "Bản tin mô tả chính xác trang phục của bạn."), { done: discoveredClues.includes("C-01") })}
          {choice("Đọc sổ Trần Minh", () => discoverClue("C-02", "Ba nhân viên biến mất sau bản tin; Trần Minh từng ẩn trong điểm mù."), { done: discoveredClues.includes("C-02") })}
          {choice("Đọc hồ sơ nhân sự", () => { discoverClue("C-03", "Hồ sơ xác nhận trạm trưởng đã mất tích."); setFlag("captain_missing_confirmed", true); }, { done: discoveredClues.includes("C-03") })}
          {choice("Phát băng cassette", () => discoverClue("C-05", "Giọng nói trong băng mô tả thực thể bắt chước nhân viên mất tích."), { done: discoveredClues.includes("C-05"), disabled: !has("I-03") })}
          {choice("Lấy chìa khóa tủ", () => addItem("I-02"), { done: has("I-02"), disabled: has("I-02") })}
          {choice("Lấy sổ mã tần số", () => addItem("I-06"), { done: has("I-06"), disabled: has("I-06") })}
          {choice("Tạm dừng bộ đàm", () => { setFlag("radio_state", "paused"); say("BỘ ĐÀM", "Bộ đàm đã tạm dừng."); }, { done: state.flags.radio_state === "paused" })}
          {choice("Trả lời bộ đàm", () => perform("ANSWER_RADIO", "radio_microphone"), { danger: true })}
          {choice("Ký sổ trực", () => perform("SIGN_LOGBOOK", "duty_logbook"), { danger: true })}
          {choice("Báo mã nhân viên", () => perform("REPORT_ID", "radio_microphone"), { danger: true })}
          {choice("Nghe điện thoại", () => perform("ANSWER_PHONE", "internal_phone"), { danger: true })}
          {moveNext}
        </>;
      case "SC-03":
        return <>
          {choice("Kiểm tra tủ dụng cụ", () => say("TỦ DỤNG CỤ", has("I-02") ? "Chìa khóa mở được ngăn dụng cụ." : "Tủ dụng cụ đang khóa.", false, false))}
          {choice("Lấy băng cassette", () => addItem("I-03"), { done: has("I-03"), disabled: !has("I-02") || has("I-03") })}
          {choice("Lấy cầu chì 30A", () => addItem("I-04"), { done: has("I-04"), disabled: has("I-04") })}
          {choice("Nghe tiếng gõ tủ 04", () => { setFlag("locker_knocking", true); say("TỦ SỐ 04", "Bên trong tủ vang lên ba tiếng gõ chậm."); })}
          {choice("Mở tủ số 04", () => {
            perform("OPEN_LOCKER_04", "locker_04");
            if (!state.flags.locker_knocking) say("TỦ SỐ 04", "Tủ số 04 trống rỗng.");
          }, { danger: true })}
          {moveNext}
        </>;
      case "SC-04":
        return <>
          {choice("Đọc sơ đồ tải điện", () => discoverClue("C-04", "OVERLOAD làm thấu kính quét xuyên tường; LOW triệt nhiễu."), { done: discoveredClues.includes("C-04") })}
          {choice("Đặt nguồn OVERLOAD", () => perform("USE_ITEM", "power_overload_switch"), { danger: true })}
          {choice("Giải mã cân bằng tải", () => setActiveModal("puzzles"), { done: solved("PZ-01"), disabled: !has("I-04") || solved("PZ-01") })}
          {moveNext}
        </>;
      case "SC-05":
        return <>
          {choice("Xem camera hành lang", () => discoverClue("C-06", "Khi nguồn LOW hoặc sương tràn, sương hướng về nguồn sáng."), { done: discoveredClues.includes("C-06") })}
          {choice("Đọc bảng bộ lọc", () => discoverClue("C-07", "Ánh sáng đỏ trên 620nm vô hiệu hóa chức năng ghi nhận."), { done: discoveredClues.includes("C-07") })}
          {choice("Vận hành thiết bị quan sát", () => {
            perform("USE_OBSERVATION_GEAR", "observation_gear");
            if (String(state.flags.power_mode) === "low") say("RADAR", "Thiết bị hiển thị rõ góc mù của thấu kính: 2714.");
          })}
          {choice("Mở khóa giải mã (PZ-02 / PZ-03)", () => setActiveModal("puzzles"))}
          {moveNext}
        </>;
      case "SC-06": {
        const canEndingB = Boolean(state.flags.red_filter_installed) && !state.flags.identity_exposed;
        const canEndingS =
          canEndingB &&
          discoveredClues.includes("C-08") &&
          engine.investigation.getInvestigationStatus("R-03") === "verified" &&
          engine.investigation.getInvestigationStatus("R-04") === "debunked_fake" &&
          engine.investigation.getInvestigationStatus("R-05") === "debunked_fake";
        return <>
          {choice("Lắp bộ lọc đỏ", () => {
            if (!has("I-05")) { say("THIẾU VẬT PHẨM", "Bạn chưa có Bộ lọc đỏ (I-05).", true, false); return; }
            setFlag("red_filter_installed", true);
            say("THẤU KÍNH", "Bộ lọc đỏ đã được lắp vào thấu kính.");
          }, { done: Boolean(state.flags.red_filter_installed), disabled: Boolean(state.flags.red_filter_installed) })}
          {choice("Bước vào vùng sáng", () => perform("ENTER_LANTERN_BEAM", "central_beam"), { danger: !state.flags.red_filter_installed })}
          {choice("Ngắt mạch chính (Kết thúc B)", () => end("END-02"), { disabled: !canEndingB })}
          {choice("Đảo tần số tín hiệu (Kết thúc S)", () => end("END-01"), { disabled: !canEndingS, nav: true })}
        </>;
      }
      default:
        return null;
    }
  };

  if (state.activeEndingId) {
    const endings: Record<string, { title: string; text: string; rank: string }> = {
      "END-01": { title: "Hồ Sơ Mũi Sương & Sự Thật 1998", text: "Tín hiệu đảo pha quét qua màn sương. Toàn bộ quy tắc giả bị vạch trần, bản ghi của Trạm 09 khép lại an toàn.", rank: "HẠNG S · HOÀN HẢO" },
      "END-02": { title: "Ngắt Mạch Cưỡng Bức", text: "Thấu kính tắt. Sương rút khỏi trạm, nhưng nguồn phát tín hiệu bất thường vẫn còn tồn tại ở một nơi khác.", rank: "HẠNG B · SỐNG SÓT" },
      "END-03": { title: "Bản Tin Thời Tiết Tiếp Theo", text: "Trạm 09 đã ghi nhận sự hiện diện của bạn. Máy in nhiệt bắt đầu chạy dòng mô tả ca trực kế tiếp.", rank: "DEAD · THẤT BẠI" }
    };
    const ending = endings[state.activeEndingId] ?? endings["END-03"];
    return (
      <main className="game-viewport">
        <div className="ending-screen">
          <div className="seal-box" style={{ margin: "0 auto 0.75rem" }}>禁</div>
          <div className="location-sub">HỒ SƠ TRẠM 09 · KẾT THÚC CA TRỰC</div>
          <h1>{ending.title}</h1>
          <div className="ending-rank">{ending.rank}</div>
          <p>{ending.text}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Bắt đầu lại ca trực</button>
        </div>
      </main>
    );
  }

  const inventorySlots = Array.from({ length: 6 }, (_, i) => state.inventoryItemIds[i] ?? null);
  const scenePuzzles = engine.puzzles.getPuzzlesForScene(scene.id);

  return (
    <main className={`game-viewport ${flash ? "red-flash" : ""}`}>
      <div className={`stage-backdrop ${state.flags.fog_breached ? "breached" : ""}`}>
        <SceneIllustration sceneId={scene.id} flags={state.flags} hasFlashlightItem={has("I-01")} solvedPuzzles={state.solvedPuzzleIds} />
      </div>

      <header className="hud-top">
        <div className="location-plaque">
          <div className="seal-box">禁</div>
          <div>
            <div className="location-title">{scene.id} · {scene.name}</div>
            <div className="location-sub">TRẠM HẢI ĐĂNG MŨI SƯƠNG · {scene.time}</div>
          </div>
        </div>

        <div className="icon-dock">
          <button type="button" className="hud-icon-btn" onClick={() => setActiveModal("rules")}>
            <span className="hud-badge">{discoveredRules.length}/10</span>
            <span className="ico-glyph">📜</span>
            <span className="ico-label">Quy tắc</span>
          </button>

          <button type="button" className="hud-icon-btn" onClick={() => setActiveModal("notebook")}>
            <span className="hud-badge">{discoveredClues.length}/8</span>
            <span className="ico-glyph">🗂️</span>
            <span className="ico-label">Sổ tay</span>
          </button>

          <button type="button" className="hud-icon-btn" onClick={() => setActiveModal("puzzles")}>
            <span className="hud-badge">{state.solvedPuzzleIds.length}/3</span>
            <span className="ico-glyph">🔐</span>
            <span className="ico-label">Giải mã</span>
          </button>

          <button type="button" className="hud-icon-btn" onClick={() => setActiveModal("map")}>
            <span className="ico-glyph">🧭</span>
            <span className="ico-label">Sơ đồ</span>
          </button>

          <button type="button" className="hud-icon-btn" onClick={() => setActiveModal("logs")}>
            <span className="hud-badge">{state.logs.length}</span>
            <span className="ico-glyph">🕯️</span>
            <span className="ico-label">Nhật ký</span>
          </button>

          <button type="button" className="hud-icon-btn hint-btn" onClick={() => setActiveModal("hint")}>
            <span className="ico-glyph">📖</span>
            <span className="ico-label">Gợi ý</span>
          </button>
        </div>
      </header>

      <section className="hotspot-layer">
        {stageHotspots.map(hs => (
          <button
            key={hs.id}
            type="button"
            className={`hotspot-node ${hs.danger ? "danger" : ""} ${hs.done ? "done" : ""}`}
            style={{ left: hs.x, top: hs.y }}
            disabled={hs.disabled}
            onClick={hs.onClick}
          >
            <span className="pulse-dot" />
            {hs.label}
          </button>
        ))}
      </section>

      <section className="hud-bottom">
        <div className="dialogue-box">
          <div className="dialogue-header">
            <span className="speaker-tag">{speaker}</span>
            <div className="status-chips">
              <span>Điện: <b>{String(state.flags.power_mode).toUpperCase()}</b></span>
              <span>Bộ đàm: <b>{String(state.flags.radio_state).toUpperCase()}</b></span>
              <span className={state.flags.fog_breached ? "bad" : "ok"}>
                Sương: <b>{state.flags.fog_breached ? "TRÀN VÀO" : "NGOÀI RÀO"}</b>
              </span>
              {has("I-01") && (
                <span className={state.flags.flashlight_on ? "ok" : ""}>
                  Đèn pin: <b>{state.flags.flashlight_on ? "BẬT" : "TẮT"}</b>
                </span>
              )}
            </div>
          </div>

          <p className={`dialogue-text ${isViolationMsg ? "violation" : ""}`}>{dialogue}</p>

          <div className="choice-bar">{renderSceneChoices()}</div>
        </div>

        <div className="inventory-dock" aria-label="Túi đồ">
          {inventorySlots.map((itemId, idx) => {
            if (!itemId) {
              return <div className="inv-slot empty" key={`empty-${idx}`}><span>—</span></div>;
            }
            const itemMeta = ITEMS[itemId] ?? { name: itemId, note: "" };
            return (
              <button
                type="button"
                className="inv-slot filled"
                key={itemId}
                onClick={() => {
                  if (itemId === "I-01") {
                    const next = !state.flags.flashlight_on;
                    setFlag("flashlight_on", next);
                    say("ĐÈN PIN (I-01)", next ? "Đã bật đèn pin cầm tay." : "Đã tắt đèn pin cầm tay.");
                  } else {
                    say(`${itemId} · ${itemMeta.name.toUpperCase()}`, itemMeta.note, false, false);
                  }
                }}
              >
                <small>{itemId}</small>
                <span>{itemMeta.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                {activeModal === "rules" && `QUY TẮC ĐÃ PHÁT HIỆN (${discoveredRules.length}/10)`}
                {activeModal === "notebook" && `SỔ TAY ĐIỀU TRA (${discoveredClues.length}/8)`}
                {activeModal === "puzzles" && `CƠ CẤU GIẢI MÃ · ${scene.name.toUpperCase()}`}
                {activeModal === "map" && "SƠ ĐỒ TRẠM HẢI ĐĂNG 09"}
                {activeModal === "logs" && `NHẬT KÝ CA TRỰC (${state.logs.length})`}
                {activeModal === "hint" && "MANH MỐI ĐỊNH HƯỚNG"}
              </h3>
              <button type="button" className="close-modal" onClick={() => setActiveModal(null)}>Đóng ✕</button>
            </div>

            {activeModal === "rules" && (
              <div>
                {discoveredRules.map(rule => {
                  const invStatus = engine.investigation.getInvestigationStatus(rule.id);
                  const badge = INV_STATUS_BADGE[invStatus] ?? { text: invStatus, tone: "neutral" };
                  const lifecycle = rules.getRuleLifecycle(rule.id);
                  return (
                    <article className={`rule-card ${lifecycle === "transformed" ? "transformed" : ""}`} key={rule.id}>
                      <div className="rule-card-top">
                        <strong>{rule.code} · {rule.title}</strong>
                        <span className={`badge badge-${badge.tone}`}>{badge.text}</span>
                      </div>
                      <p>{rules.getEffectiveRuleText(rule.id)}</p>
                      <div className="rule-card-foot">
                        <span>{rule.scope} · {lifecycle === "transformed" ? "ĐÃ BIẾN ĐỔI" : lifecycle}</span>
                        <button
                          type="button"
                          className="btn-ghost-sm"
                          onClick={() => {
                            setPreselectedRuleId(rule.id);
                            setActiveModal("notebook");
                          }}
                        >
                          Đối chiếu trong Sổ tay →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {activeModal === "notebook" && (
              <InvestigationNotebook
                system={engine.investigation}
                preselectedRuleId={preselectedRuleId}
                onChange={refreshUI}
              />
            )}

            {activeModal === "puzzles" && (
              <div>
                {scenePuzzles.length === 0 ? (
                  <div className="empty-box">Khu vực hiện tại không có ổ khóa giải mã nào.</div>
                ) : (
                  scenePuzzles.map(pz => {
                    const isPzSolved = solved(pz.id);
                    return (
                      <div className="puzzle-card" key={pz.id}>
                        <div className="rule-card-top">
                          <strong>{pz.id} · {pz.title}</strong>
                          <span className={`badge ${isPzSolved ? "badge-ok" : "badge-warn"}`}>
                            {isPzSolved ? "ĐÃ GIẢI" : "CHƯA GIẢI"}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.84rem", margin: "0.4rem 0" }}>{pz.description}</p>
                        {!isPzSolved && (
                          <form className="puzzle-form" onSubmit={e => { e.preventDefault(); submitPuzzle(pz.id); }}>
                            <input
                              value={puzzleInputs[pz.id] ?? ""}
                              onChange={e => setPuzzleInputs(prev => ({ ...prev, [pz.id]: e.target.value }))}
                              placeholder="Nhập mã giải..."
                            />
                            <button type="submit" className="btn-primary">Xác nhận</button>
                          </form>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeModal === "map" && (
              <div className="map-grid">
                {SCENES.map(s => {
                  const isLocked = getSceneLockReason(s.id) !== null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`map-node ${scene.id === s.id ? "current" : ""} ${isLocked ? "locked" : ""}`}
                      onClick={() => go(s.id)}
                    >
                      <small>{s.id} · {s.time} {isLocked ? "🔒" : ""}</small>
                      <strong>{s.name}</strong>
                    </button>
                  );
                })}
              </div>
            )}

            {activeModal === "logs" && (
              <div>
                {[...state.logs].reverse().map((entry, idx) => (
                  <p className={`log-line ${entry.includes("VI PHẠM") || entry.includes("BẪY") ? "alert" : ""}`} key={`${state.logs.length - idx}-${entry}`}>
                    {entry}
                  </p>
                ))}
              </div>
            )}

            {activeModal === "hint" && (
              <div>
                <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>{getHintText()}</p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    onClick={() => {
                      const data = engine.store.exportSave("quick-slot");
                      try {
                        window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
                      } catch { /* ignore quota */ }
                      setSavedSlot(data);
                      setActiveModal(null);
                      say("HỆ THỐNG", "Đã lưu tiến trình vào bộ nhớ trình duyệt (localStorage).", false, false);
                    }}
                  >
                    Lưu nhanh
                  </button>
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    disabled={!savedSlot}
                    onClick={() => {
                      if (!savedSlot) return;
                      if (engine.store.importSave(savedSlot)) {
                        rules.syncLifecycles();
                        setActiveModal(null);
                        say("HỆ THỐNG", "Đã tải lại bản lưu từ bộ nhớ trình duyệt.", false, false);
                      }
                    }}
                  >
                    Tải bản lưu
                  </button>
                  <button type="button" className="btn-ghost-sm" onClick={() => window.location.reload()}>
                    Chơi lại từ đầu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}