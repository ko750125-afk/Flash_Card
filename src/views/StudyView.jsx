import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Square, CheckSquare } from 'lucide-react';
import { speak } from '../utils/speech';
import { playMemorizedSound } from '../utils/sound';

/* ────────────────────────────────────────────────────
   StudyView
   
   iOS Safari 음성 호환 정책:
   - speak()는 반드시 onClick 핸들러 내부에서 직접 호출
   - 카드 탭 → 현재 단어 발음 반복 재생
   - 좌/우 화살표 탭 → 이전/다음 단어로 이동하며 해당 단어 발음
   - 한국어 보기 버튼 → 현재 단어 발음 후 한국어 표시
──────────────────────────────────────────────────── */
export default function StudyView({
  words, rawWords, dayKey, setLabel,
  memorized, toggleMemorized,
  onComplete, onBack, onHome,
}) {
  const [wordsList, setWordsList] = useState(words);
  const [index, setIndex]         = useState(0);
  const [showKo, setShowKo]       = useState(false);
  const [done, setDone]           = useState(false);

  const current     = wordsList[index];
  const isMemorized = current ? memorized.has(current.id) : false;
  const progress    = wordsList.length > 1 ? (index / (wordsList.length - 1)) * 100 : 0;

  /* ── 카드 탭: 현재 단어 발음 반복 재생 ── */
  const handleCardTap = useCallback(() => {
    if (current) {
      speak(current.en);
    }
  }, [current]);

  /* ── 이전 단어 이동 (좌측 삼각형) ── */
  const handlePrev = useCallback(() => {
    if (index > 0) {
      const prevIndex = index - 1;
      const prevWord = wordsList[prevIndex];
      setShowKo(false);
      setIndex(prevIndex);
      if (prevWord) speak(prevWord.en);
    }
  }, [index, wordsList]);

  /* ── 다음 단어 이동 (우측 삼각형) ── */
  const handleNext = useCallback(() => {
    if (index < wordsList.length - 1) {
      const nextIndex = index + 1;
      const nextWord = wordsList[nextIndex];
      setShowKo(false);
      setIndex(nextIndex);
      if (nextWord) {
        speak(nextWord.en);
      }
    } else {
      // 마지막 단어에서 다음 버튼 누르면 완료 처리
      const allTargetWords = rawWords || wordsList;
      onComplete(allTargetWords.map(w => w.id));
      setDone(true);
    }
  }, [index, wordsList, rawWords, onComplete]);

  /* ── 남은 미외운 단어로 즉시 재학습 ── */
  const handleRestartUnmemorized = useCallback(() => {
    const pool = rawWords || wordsList;
    const remaining = pool.filter(w => !memorized.has(w.id));
    if (remaining.length === 0) return;
    setWordsList(remaining);
    setIndex(0);
    setShowKo(false);
    setDone(false);
    speak(remaining[0].en); // 첫 단어 발음 자동 재생
  }, [rawWords, wordsList, memorized]);

  /* ── 전체 단어 다시보기 ── */
  const handleRestartAll = useCallback(() => {
    const all = rawWords || words;
    setWordsList(all);
    setIndex(0);
    setShowKo(false);
    setDone(false);
    speak(all[0].en);
  }, [rawWords, words]);

  /* ── 한국어 빈칸 클릭: 발음 재생 및 뜻 열기 ── */
  const handleShowKo = useCallback(() => {
    if (!current) return;
    speak(current.en); // ✅ iOS: 탭 이벤트 내부에서 직접 호출
    setShowKo(true);
  }, [current]);

  /* ── 암기완료 토글 (체크 시 청량한 사운드 재생) ── */
  const handleToggleMem = useCallback((e) => {
    e.stopPropagation();
    if (!current) return;
    if (!isMemorized) {
      playMemorizedSound(); // 🎶 기분 좋은 3단 차임벨 사운드
    }
    toggleMemorized(current.id);
  }, [current, isMemorized, toggleMemorized]);

  /* ── 완료 화면 ── */
  if (done) {
    const pool = rawWords || wordsList;
    const totalCount = pool.length;
    const memCount = pool.filter(w => memorized.has(w.id)).length;
    const unmemorized = pool.filter(w => !memorized.has(w.id));
    const allDone = unmemorized.length === 0;

    return (
      <div className="view-container done-screen">
        <div className="done-emoji">{allDone ? '👑' : '🎉'}</div>
        <h2 className="done-title">{allDone ? '세트 정복 완료!' : '학습 완료!'}</h2>
        <p className="done-sub">{dayKey} · {setLabel}</p>
        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-num g">{memCount}</div>
            <div className="stat-lbl">암기 완료</div>
          </div>
          <div className="stat-box">
            <div className="stat-num a">{unmemorized.length}</div>
            <div className="stat-lbl">남은 단어</div>
          </div>
        </div>
        <div className="done-actions">
          {!allDone ? (
            <button className="btn btn-primary" onClick={handleRestartUnmemorized}>
              🔥 남은 {unmemorized.length}단어 다시 외우기
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleRestartAll}>
              🔄 전체 단어 다시보기
            </button>
          )}
          <button className="btn btn-ghost" onClick={onBack}>다른 세트 선택</button>
          <button className="btn btn-ghost" onClick={onHome}>홈으로</button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="view-container study-view">
      {/* 헤더 */}
      <div className="study-header">
        <button className="btn-icon" onClick={onBack} aria-label="뒤로">
          <ChevronLeft size={20} />
        </button>
        <div className="study-info">
          <div className="study-label">
            {dayKey} · {setLabel}
            {rawWords && rawWords.length !== wordsList.length && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)', marginLeft: '6px' }}>
                (미암기 {wordsList.length}개 집중)
              </span>
            )}
          </div>
        </div>
        <div className="study-counter">{index + 1}/{wordsList.length}</div>
      </div>

      {/* 진행 바 */}
      <div className="prog-track">
        <div className="prog-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* 카드 영역 */}
      <div className="card-area">
        {/* 카드 & 좌우 삼각형 내비게이션 */}
        <div className="card-nav-container">
          <button
            className="btn-card-nav prev"
            onClick={handlePrev}
            disabled={index === 0}
            aria-label="이전 단어"
          >
            <ChevronLeft size={24} />
          </button>

          {/* 종이 뒤집힘 애니메이션 플래시카드 */}
          <div
            key={current.id}
            className="fc-card"
            role="button"
            tabIndex={0}
            aria-label={`${current.en}, 탭하면 발음 듣기`}
            onClick={handleCardTap}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleCardTap()}
          >
            {isMemorized && <span className="fc-stamp">암기완료</span>}
            <span className="fc-word">{current.en}</span>
            <span className="fc-tap-hint">🔊 발음 듣기</span>
          </div>

          <button
            className="btn-card-nav next"
            onClick={handleNext}
            aria-label={index === wordsList.length - 1 ? "학습 완료" : "다음 단어"}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* 한국어 뜻 빈칸 (터치 시 해석 열림) */}
        <div
          className={`ko-box ${showKo ? 'visible' : ''}`}
          onClick={handleShowKo}
          role="button"
          tabIndex={0}
          aria-label={showKo ? `한국어 뜻: ${current.ko}` : "터치하여 한국어 뜻 보기"}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleShowKo()}
        >
          {showKo ? (
            <span className="ko-word" key={`ko-${current.id}`}>{current.ko}</span>
          ) : (
            <span className="ko-hint">💡 터치하면 한국어 뜻이 열립니다</span>
          )}
        </div>

        {/* 하단 암기완료 버튼 */}
        <div className="action-row">
          <button
            className={`btn-mem ${isMemorized ? 'memorized' : ''}`}
            onClick={handleToggleMem}
            aria-pressed={isMemorized}
            aria-label={isMemorized ? '암기 완료 (취소하려면 클릭)' : '암기완료 표시'}
          >
            {isMemorized ? (
              <>
                <CheckSquare size={18} className="mem-icon checked" />
                <span>암기완료</span>
              </>
            ) : (
              <>
                <Square size={18} className="mem-icon" />
                <span>암기완료</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
