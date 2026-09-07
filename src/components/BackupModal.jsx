import { useState, useRef } from 'react';
import { X, Download, Copy, Upload, Trash2, Check, ShieldCheck, FileText } from 'lucide-react';

export default function BackupModal({
  isOpen, onClose,
  memorizedSet, seenSet,
  onRestore, onClearAll,
}) {
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 현재 백업 데이터 객체 생성
  const getBackupPayload = () => {
    return {
      app: 'FlashCardApp',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      memorizedCount: memorizedSet.size,
      memorized: Array.from(memorizedSet),
      seen: Array.from(seenSet),
    };
  };

  // 1. JSON 파일로 다운로드
  const handleDownload = () => {
    try {
      const data = getBackupPayload();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `flashcard_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('백업 파일이 다운로드되었습니다!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('다운로드 중 오류가 발생했습니다.');
    }
  };

  // 2. 텍스트 클립보드 복사 (모바일 카카오톡/메모장용)
  const handleCopyText = async () => {
    try {
      const data = getBackupPayload();
      const jsonStr = JSON.stringify(data);
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setSuccessMsg('백업 데이터가 클립보드에 복사되었습니다! (메모장 등에 붙여넣기 해두세요)');
      setTimeout(() => {
        setCopied(false);
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setErrorMsg('클립보드 복사 권한이 필요합니다.');
    }
  };

  // 3. 파일 업로드로 복원
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        applyRestore(parsed);
      } catch (err) {
        setErrorMsg('올바른 백업 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4. 텍스트 붙여넣기로 복원
  const handlePasteRestore = () => {
    if (!pasteText.trim()) {
      setErrorMsg('복원할 백업 텍스트를 입력해주세요.');
      return;
    }
    try {
      const parsed = JSON.parse(pasteText.trim());
      applyRestore(parsed);
    } catch (err) {
      setErrorMsg('JSON 형식이 올바르지 않습니다.');
    }
  };

  // 공통 복원 처리
  const applyRestore = (data) => {
    if (!data || (!Array.isArray(data.memorized) && !Array.isArray(data.seen))) {
      setErrorMsg('백업 데이터 형식이 올바르지 않습니다.');
      return;
    }

    const memList = Array.isArray(data.memorized) ? data.memorized : [];
    const seenList = Array.isArray(data.seen) ? data.seen : [];

    onRestore({ memorized: memList, seen: seenList });
    setErrorMsg('');
    setSuccessMsg(`성공적으로 복원되었습니다! (암기단어 ${memList.length}개)`);
    setPasteText('');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1500);
  };

  // 5. 전체 초기화
  const handleReset = () => {
    if (window.confirm('정말로 모든 학습 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      onClearAll();
      setSuccessMsg('모든 학습 데이터가 초기화되었습니다.');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div className="modal-title-row">
            <ShieldCheck size={22} className="modal-icon-shield" />
            <h2 className="modal-title">학습 데이터 백업 & 복원</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {/* 현재 상태 안내 */}
        <div className="modal-stats-box">
          <div className="ms-item">
            <span className="ms-lbl">외운 단어</span>
            <span className="ms-val g">{memorizedSet.size}개</span>
          </div>
          <div className="ms-item">
            <span className="ms-lbl">학습한 단어</span>
            <span className="ms-val">{seenSet.size}개</span>
          </div>
        </div>

        {/* 알림 메시지 */}
        {successMsg && <div className="modal-alert success">{successMsg}</div>}
        {errorMsg && <div className="modal-alert error">{errorMsg}</div>}

        <div className="modal-body">
          {/* 섹션 1: 데이터 백업하기 */}
          <div className="modal-section">
            <h3 className="modal-sec-title">💾 내 데이터 백업하기</h3>
            <p className="modal-sec-desc">
              기록을 파일로 저장하거나 카카오톡/메모장에 복사해두세요.
            </p>
            <div className="modal-btn-grid">
              <button className="btn-modal-action" onClick={handleDownload}>
                <Download size={16} />
                <span>파일로 저장 (.json)</span>
              </button>
              <button className="btn-modal-action" onClick={handleCopyText}>
                {copied ? <Check size={16} color="var(--green)" /> : <Copy size={16} />}
                <span>{copied ? '복사 완료!' : '텍스트로 복사'}</span>
              </button>
            </div>
          </div>

          {/* 섹션 2: 데이터 복원하기 */}
          <div className="modal-section">
            <h3 className="modal-sec-title">🔄 데이터 복원하기</h3>
            <p className="modal-sec-desc">
              기존에 백업해둔 파일이나 텍스트로 학습 기록을 즉시 복구합니다.
            </p>

            {/* 파일 업로드 버튼 */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="btn-modal-action upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>백업 파일 선택 (.json)</span>
            </button>

            {/* 텍스트 붙여넣기 */}
            <div className="paste-area-wrap">
              <textarea
                className="paste-textarea"
                placeholder="또는 백업 텍스트를 여기에 붙여넣으세요..."
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={2}
              />
              {pasteText.trim() && (
                <button className="btn btn-primary btn-paste-apply" onClick={handlePasteRestore}>
                  텍스트로 복원 적용
                </button>
              )}
            </div>
          </div>

          {/* 섹션 3: 초기화 */}
          <div className="modal-section danger-sec">
            <button className="btn-reset-all" onClick={handleReset}>
              <Trash2 size={14} />
              <span>학습 기록 전체 초기화</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
