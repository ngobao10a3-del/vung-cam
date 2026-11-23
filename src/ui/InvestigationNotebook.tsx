import { useEffect, useRef, useState } from "react";
import { InvestigationSystem } from "../systems/InvestigationSystem";

type Props = {
  system: InvestigationSystem;
  preselectedRuleId?: string;
  onChange?: () => void;
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  unverified: { label: "Chưa xác minh", tone: "neutral" },
  supported: { label: "Có bằng chứng ủng hộ", tone: "warn" },
  contradicted: { label: "Có bằng chứng phản bác", tone: "warn" },
  conditional_confirmed: { label: "Xác nhận có điều kiện", tone: "ok" },
  verified: { label: "ĐÃ XÁC MINH (LUẬT THẬT)", tone: "ok" },
  debunked_fake: { label: "ĐÃ BÁC BỎ (QUY TẮC GIẢ)", tone: "fake" },
  conflicted: { label: "Bằng chứng mâu thuẫn", tone: "bad" },
};

const CATEGORY_LABELS: Record<string, string> = {
  document: "TÀI LIỆU LƯU TRỮ",
  audio_transcript: "BĂNG GHI ÂM",
  blueprint: "SƠ ĐỒ KỸ THUẬT",
  cctv: "DỮ LIỆU CAMERA",
  photo: "ẢNH CHỤP HIỆN TRƯỜNG",
};

export function InvestigationNotebook({ system, preselectedRuleId, onChange }: Props) {
  const clues = system.getDiscoveredClues();
  const [selectedId, setSelectedId] = useState<string>(() => clues[0]?.id ?? "");
  const [selectedRules, setSelectedRules] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const lastAppliedRuleRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (clues.length === 0) return;
    if (!selectedId || !clues.some(c => c.id === selectedId)) {
      setSelectedId(clues[0].id);
    }
  }, [clues.length, selectedId]);

  useEffect(() => {
    if (!preselectedRuleId || preselectedRuleId === lastAppliedRuleRef.current) return;
    lastAppliedRuleRef.current = preselectedRuleId;
    const matchingClue = clues.find(c => c.relatedRuleIds.includes(preselectedRuleId));
    if (matchingClue) {
      setSelectedId(matchingClue.id);
      setSelectedRules(prev => ({ ...prev, [matchingClue.id]: preselectedRuleId }));
    }
  }, [preselectedRuleId]);

  const selectedClue = clues.find(clue => clue.id === selectedId) ?? clues[0];

  const handleLink = () => {
    if (!selectedClue) return;
    const ruleId = selectedRules[selectedClue.id] || selectedClue.relatedRuleIds[0];
    if (!ruleId) {
      setMessage({ text: "Hãy chọn một quy tắc để đối chiếu.", ok: false });
      return;
    }

    const result = system.linkClueToRule(ruleId, selectedClue.id);
    if (result.ok) {
      const status = system.getInvestigationStatus(ruleId);
      const statusText = STATUS_LABELS[status]?.label ?? status;
      setMessage({
        text: `Đã gắn ${selectedClue.id} vào ${ruleId} → Trạng thái: ${statusText}.`,
        ok: true,
      });
      onChange?.();
    } else {
      const reasonMap: Record<string, string> = {
        ALREADY_LINKED: "Manh mối này đã được gắn vào quy tắc trên.",
        NOT_DISCOVERED: "Bạn chưa phát hiện quy tắc này trong sổ luật.",
        CLUE_NOT_FOUND: "Không tìm thấy dữ liệu manh mối.",
      };
      setMessage({ text: reasonMap[result.reason] ?? result.reason, ok: false });
    }
  };

  const handleUnlink = (ruleId: string, clueId: string) => {
    const success = system.unlinkClueFromRule(ruleId, clueId);
    setMessage({
      text: success ? `Đã gỡ liên kết ${clueId} khỏi ${ruleId}.` : "Không thể gỡ liên kết.",
      ok: success,
    });
    onChange?.();
  };

  const unlockedNotes = system.getUnlockedDeductionNotes();

  return (
    <div className="notebook-wrap">
      <div className="notebook-intro">
        <p>
          <strong>Cách đối chiếu:</strong> Chọn một manh mối bên dưới, ghép với quy tắc nghi ngờ rồi bấm{" "}
          <em>Gắn bằng chứng</em> để vạch trần quy tắc giả hoặc xác minh điều kiện sinh tồn.
        </p>
      </div>

      {clues.length === 0 ? (
        <div className="empty-box">
          <p>Chưa thu thập được manh mối nào.</p>
          <small>Hãy đọc tài liệu, nghe băng ghi âm hoặc kiểm tra camera trong các phòng.</small>
        </div>
      ) : (
        <>
          <div className="clue-chips">
            {clues.map(clue => {
              const isSelected = selectedClue?.id === clue.id;
              return (
                <button
                  type="button"
                  key={clue.id}
                  className={`clue-chip ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setSelectedId(clue.id);
                    setMessage(null);
                  }}
                >
                  <span className="chip-id">{clue.id}</span>
                  <span className="chip-title">{clue.title}</span>
                </button>
              );
            })}
          </div>

          {selectedClue && (
            <article className="dossier-card">
              <div className="dossier-meta">
                <span>{CATEGORY_LABELS[selectedClue.category] ?? selectedClue.category}</span>
                <b>{selectedClue.id}</b>
              </div>
              <h4>{selectedClue.title}</h4>
              <p className="dossier-summary">{selectedClue.summary}</p>
              <div className="dossier-body">{selectedClue.detailContent}</div>

              <div className="dossier-link-box">
                <label>Đối chiếu với quy tắc liên quan:</label>
                <div className="dossier-controls">
                  <select
                    value={selectedRules[selectedClue.id] ?? selectedClue.relatedRuleIds[0] ?? ""}
                    onChange={e =>
                      setSelectedRules(curr => ({ ...curr, [selectedClue.id]: e.target.value }))
                    }
                  >
                    {selectedClue.relatedRuleIds.map(ruleId => (
                      <option key={ruleId} value={ruleId}>
                        {ruleId} ({STATUS_LABELS[system.getInvestigationStatus(ruleId)]?.label ?? "Chưa rõ"})
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-primary" onClick={handleLink}>
                    Gắn bằng chứng
                  </button>
                </div>
              </div>

              <div className="linked-rules-list">
                {selectedClue.relatedRuleIds.map(ruleId => {
                  const linkedIds = system.getLinkedClueIds(ruleId);
                  if (!linkedIds.includes(selectedClue.id)) return null;
                  const st = system.getInvestigationStatus(ruleId);
                  const meta = STATUS_LABELS[st] ?? { label: st, tone: "neutral" };
                  return (
                    <div className="linked-row" key={ruleId}>
                      <div>
                        <strong>{ruleId}</strong>
                        <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() => handleUnlink(ruleId, selectedClue.id)}
                      >
                        Gỡ
                      </button>
                    </div>
                  );
                })}
              </div>

              {message && (
                <div className={`nb-toast ${message.ok ? "ok" : "warn"}`} role="status">
                  {message.text}
                </div>
              )}
            </article>
          )}

          {unlockedNotes.length > 0 && (
            <div className="deduction-notes">
              <div className="section-kicker">KẾT LUẬN SUY LUẬN ĐÃ MỞ KHÓA ({unlockedNotes.length})</div>
              {unlockedNotes.map((note, idx) => (
                <p key={idx}>• {note}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}