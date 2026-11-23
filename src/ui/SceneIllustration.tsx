import type { FlagValue } from "../types/common";
type Props = {
  sceneId: string;
  flags: Readonly<Record<string, FlagValue>>;
  hasFlashlightItem: boolean;
  solvedPuzzles: readonly string[];
};

export function SceneIllustration({ sceneId, flags, hasFlashlightItem, solvedPuzzles }: Props) {
  const fogBreached = Boolean(flags.fog_breached);
  const flashlightOn = Boolean(flags.flashlight_on);
  const radioState = String(flags.radio_state ?? "broadcasting");
  const powerMode = String(flags.power_mode ?? "normal");
  const redFilter = Boolean(flags.red_filter_installed);
  const lockerKnocking = Boolean(flags.locker_knocking);

  return (
    <div className={`scene-visual scene-bg-${sceneId.toLowerCase()}`} aria-hidden="true">
      {/* Lưới tọa độ kỹ thuật & ánh đèn pin */}
      <div className="visual-grid" />
      {flashlightOn && <div className="flashlight-cone" />}

      {/* Minh họa kiến trúc theo từng phòng */}
      {sceneId === "SC-01" && (
        <svg className="scene-svg" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="towerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Hải đăng phía xa */}
          <circle cx="560" cy="68" r="75" fill="url(#towerGlow)" />
          <polygon points="546,195 554,75 566,75 574,195" fill="#1e2533" stroke="#475569" strokeWidth="1.5" />
          <rect x="552" y="62" width="16" height="13" fill="#fef3c7" />
          <polygon points="568,65 790,25 790,105 568,72" fill="#fef3c7" opacity="0.09" />

          {/* Chòi gác bên phải */}
          <rect x="470" y="135" width="76" height="85" fill="#131822" stroke="#334155" strokeWidth="1.5" />
          <rect x="482" y="148" width="52" height="30" fill="#090c10" stroke="#475569" />
          {!hasFlashlightItem && (
            <g>
              <circle cx="526" cy="196" r="14" fill="#fbbf24" opacity="0.22" />
              <rect x="520" y="193" width="12" height="5" rx="2" fill="#fbbf24" />
            </g>
          )}

          {/* Hàng rào & Cổng sắt */}
          <line x1="0" y1="220" x2="800" y2="220" stroke="#334155" strokeWidth="2" />
          {Array.from({ length: 18 }).map((_, i) => (
            <line
              key={i}
              x1={40 + i * 24}
              y1="95"
              x2={40 + i * 24}
              y2="220"
              stroke="#2a3344"
              strokeWidth="3"
            />
          ))}
          {/* Cánh cổng trung tâm */}
          <rect
            x={fogBreached ? "250" : "310"}
            y="102"
            width={fogBreached ? "42" : "150"}
            height="118"
            fill="rgba(15, 23, 42, 0.72)"
            stroke="#64748b"
            strokeWidth="2"
          />
          {!fogBreached && <circle cx="385" cy="162" r="6" fill="#d9534f" />}
        </svg>
      )}

      {sceneId === "SC-02" && (
        <svg className="scene-svg" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          {/* Cửa sổ đêm & mặt bàn trực */}
          <rect x="290" y="24" width="220" height="110" fill="#090d14" stroke="#334155" strokeWidth="2" />
          <line x1="400" y1="24" x2="400" y2="134" stroke="#334155" strokeWidth="2" />
          <polygon points="80,260 150,165 650,165 720,260" fill="#161c26" stroke="#334155" strokeWidth="1.5" />

          {/* Máy in nhiệt bên trái */}
          <rect x="145" y="142" width="74" height="44" rx="4" fill="#1e2634" stroke="#475569" />
          <polygon points="158,142 164,116 202,116 208,142" fill="#e2e8f0" opacity="0.88" />
          <line x1="168" y1="124" x2="196" y2="124" stroke="#0f172a" strokeWidth="2" />
          <line x1="166" y1="131" x2="192" y2="131" stroke="#0f172a" strokeWidth="2" />

          {/* Sổ trực & Hồ sơ giữa bàn */}
          <rect x="335" y="176" width="125" height="52" rx="3" fill="#292524" stroke="#78716c" />
          <line x1="397" y1="176" x2="397" y2="228" stroke="#57534e" strokeWidth="1.5" />

          {/* Bộ đàm bên phải */}
          <rect x="565" y="128" width="92" height="62" rx="5" fill="#18202c" stroke="#64748b" strokeWidth="1.5" />
          <line x1="642" y1="128" x2="642" y2="78" stroke="#94a3b8" strokeWidth="2.5" />
          <rect x="577" y="140" width="68" height="22" fill="#090d12" />
          {radioState === "broadcasting" ? (
            <polyline
              points="582,151 592,144 600,158 610,142 620,159 630,145 640,151"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          ) : (
            <line
              x1="582"
              y1="151"
              x2="640"
              y2="151"
              stroke={radioState === "paused" ? "#4ea87a" : "#64748b"}
              strokeWidth="2"
            />
          )}
        </svg>
      )}

      {sceneId === "SC-03" && (
        <svg className="scene-svg" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          {/* Hành lang & 4 tủ sắt */}
          <line x1="90" y1="232" x2="710" y2="232" stroke="#334155" strokeWidth="2" />
          {[0, 1, 2, 3].map(idx => {
            const x = 350 + idx * 78;
            const isLocker4 = idx === 3;
            return (
              <g key={idx} className={isLocker4 && lockerKnocking ? "svg-shake" : ""}>
                <rect
                  x={x}
                  y="62"
                  width="70"
                  height="170"
                  fill={isLocker4 ? "#1d1820" : "#161d28"}
                  stroke={isLocker4 ? "#d9534f" : "#475569"}
                  strokeWidth="1.5"
                />
                <line x1={x + 14} y1="82" x2={x + 56} y2="82" stroke="#475569" strokeWidth="2" />
                <line x1={x + 14} y1="90" x2={x + 56} y2="90" stroke="#475569" strokeWidth="2" />
                <text x={x + 26} y="122" fill="#94a3b8" fontSize="13" fontFamily="monospace">
                  0{idx + 1}
                </text>
              </g>
            );
          })}
          {/* Tủ dụng cụ bên trái */}
          <rect x="145" y="110" width="115" height="122" fill="#151b24" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="202" cy="170" r="7" fill="#d4a359" />
        </svg>
      )}

      {sceneId === "SC-04" && (
        <svg className="scene-svg" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          {/* Sơ đồ tải điện treo tường */}
          <rect x="145" y="54" width="145" height="105" fill="#121822" stroke="#64748b" strokeWidth="1.5" />
          <path d="M165 85 H225 V125 H268" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="225" cy="105" r="10" fill="none" stroke="#d4a359" strokeWidth="2" />

          {/* Tủ máy phát & Đồng hồ tải */}
          <rect x="440" y="64" width="210" height="165" rx="6" fill="#161d29" stroke="#475569" strokeWidth="2" />
          <circle cx="545" cy="118" r="32" fill="#090d14" stroke="#94a3b8" strokeWidth="2" />
          <line
            x1="545"
            y1="118"
            x2={powerMode === "low" ? "524" : powerMode === "overload" ? "568" : "545"}
            y2={powerMode === "normal" ? "92" : "100"}
            stroke={powerMode === "overload" ? "#ef4444" : powerMode === "low" ? "#4ea87a" : "#fbbf24"}
            strokeWidth="3"
          />
          <rect
            x="485"
            y="170"
            width="120"
            height="26"
            rx="4"
            fill={powerMode === "overload" ? "rgba(239,68,68,0.22)" : "rgba(78,168,122,0.16)"}
            stroke={powerMode === "overload" ? "#ef4444" : "#4ea87a"}
          />
          <text x="515" y="187" fill="#e2e8f0" fontSize="12" fontFamily="monospace">
            {powerMode.toUpperCase()}
          </text>
        </svg>
      )}

      {sceneId === "SC-05" && (
        <svg className="scene-svg" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          {/* Màn hình CCTV trái */}
          <rect x="135" y="55" width="165" height="115" rx="4" fill="#090e14" stroke="#475569" strokeWidth="2" />
          <circle cx="155" cy="73" r="4" fill="#ef4444" />
          <text x="165" y="77" fill="#94a3b8" fontSize="11" fontFamily="monospace">CAM-02</text>
          <path d="M150 145 Q215 115 285 150" fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.5" />

          {/* Radar giữa với vết xước bán nguyệt */}
          <circle cx="400" cy="115" r="64" fill="#071310" stroke="#4ea87a" strokeWidth="2" />
          <circle cx="400" cy="115" r="40" fill="none" stroke="#4ea87a" strokeOpacity="0.35" />
          <circle cx="400" cy="115" r="18" fill="none" stroke="#4ea87a" strokeOpacity="0.35" />
          <line x1="400" y1="115" x2="448" y2="76" stroke="#4ea87a" strokeWidth="2" />
          <path d="M415 62 A52 52 0 0 1 452 135" fill="none" stroke="#cbd5e1" strokeWidth="4" opacity="0.65" />

          {/* Bảng hiệu chuẩn phải */}
          <rect x="505" y="55" width="160" height="115" rx="4" fill="#121822" stroke="#475569" strokeWidth="2" />
          <line x1="525" y1="95" x2="645" y2="95" stroke="#ef4444" strokeWidth="3" />
          <text x="525" y="122" fill="#fca5a5" fontSize="12" fontFamily="monospace">&gt; 620nm SAFE</text>

          {/* Ngăn kéo bí mật dưới bàn */}
          <rect
            x="325"
            y="196"
            width="150"
            height="42"
            rx="3"
            fill={solvedPuzzles.includes("PZ-02") ? "#1f2937" : "#111620"}
            stroke={solvedPuzzles.includes("PZ-02") ? "#4ea87a" : "#d4a359"}
          />
        </svg>
      )}

      {sceneId === "SC-06" && (
        <svg className="scene-svg" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          {/* Chùm sáng thấu kính Fresnel */}
          <polygon
            points="400,128 40,20 40,245"
            fill={redFilter ? "#dc2626" : "#f8fafc"}
            opacity={redFilter ? "0.24" : "0.16"}
          />
          <polygon
            points="400,128 760,20 760,245"
            fill={redFilter ? "#dc2626" : "#f8fafc"}
            opacity={redFilter ? "0.24" : "0.16"}
          />
          {/* Trụ thấu kính trung tâm */}
          <rect x="355" y="52" width="90" height="165" rx="14" fill="#111827" stroke="#64748b" strokeWidth="2" />
          <ellipse
            cx="400"
            cy="132"
            rx="34"
            ry="56"
            fill={redFilter ? "#ef4444" : "#fef9c3"}
            opacity={redFilter ? "0.75" : "0.85"}
          />
          {/* Khay bộ lọc đỏ */}
          <rect
            x="230"
            y="108"
            width="48"
            height="48"
            rx="4"
            fill={redFilter ? "rgba(239,68,68,0.28)" : "#18202c"}
            stroke={redFilter ? "#ef4444" : "#d4a359"}
            strokeWidth="2"
          />
        </svg>
      )}

      {/* Lớp phủ sương mù & viền camera giám sát */}
      <div className="stage-fog" />
      <div className="stage-vignette" />
    </div>
  );
}