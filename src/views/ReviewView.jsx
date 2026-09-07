import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Square, CheckSquare } from 'lucide-react';
import { speak } from '../utils/speech';
import { playMemorizedSound } from '../utils/sound';

/* ────────────────────────────────────────────────────
   ReviewView — DAY 완주 후 미암기 단어 복습 모드
   iOS 음성 정책: onClick 핸들러 내부에서만 speak() 호출
──────────────────────────────────────────────────── */
export default function ReviewView({
  reviewWords, memorized, toggleMemorized, onBack,
}) {
  const [words, setWords]   = useState(reviewWords);
  const [index, setIndex]   = useState(0);
  const [showKo, setShowKo] = useState(false);
  const [done, setDone]     = useState(false);

  const current     = words[index];
  const isMemorized = current ? memorized.has(current.id) : false;
  const progress    = words.length > 1 ? (index / (words.length - 1)) * 100 : 0;

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
      const prevWord = words[prevIndex];
      setShowKo(false);
      setIndex(prevIndex);
      if (prevWord) speak(prevWord.en);
    }
  }, [index, words]);

  /* ── 다음 단어 이동 (우측 삼각형) ── */
  const handleNext = useCallback(() => {
    if (index < words.length - 1) {
      const nextIndex = index + 1;
      const nextWord = words[nextIndex];
      setShowKo(false);
      setIndex(nextIndex);
      if (nextWord) {
        speak(nextWord.en);
      }
    } else {
      setDone(true);
    }
  }, [index, words]);

  /* ── 한국어 빈칸 클릭: 발음 재생 및 뜻 열기 ── */
  const handleShowKo = useCallback(() => {
    if (!current) return;
    speak(current.en); // ✅ iOS 호환
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

  /* ── 다시 복습 ── */
  const handleReshuffle = useCallback(() => {
    const remaining = reviewWords.filter(w => !memorized.has(w.id));
    if (remaining.length === 0) { onBack(); return; }
    if (remaining[0]) speak(remaining[0].en); // ✅ 다시 복습 시작 시 첫 단어 발음
    setWords(remaining);
    setIndex(0);
    setShowKo(false);
    setDone(false);
  }, [reviewWords, memorized, onBack]);

  /* ── 복습할 단어 없음 ── */
  if (reviewWords.length === 0) {
    return (
      <div className="view-container done-screen">
        <div className="done-emoji">🌟</div>
        <h2 className="done-title">복습할 단어가 없어요</h2>
        <p className="done-sub">DAY를 완주하면 미암기 단어가 여기 모입니다</p>
        <div className="done-actions">
          <button className="btn btn-primary" onClick={onBack}>홈으로</button>
        </div>
      </div>
    );
  }

  /* ── 복습 완료 화면 ── */
  if (done) {
    const memCount = words.filter(w => memorized.has(w.id)).length;
    return (
      <div className="view-container done-screen">
        <div className="done-emoji">🔥</div>
        <h2 className="done-title">복습 완료!</h2>
        <p className="done-sub">총 {words.length}개 단어를 복습했어요</p>
        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-num g">{memCount}</div>
            <div className="stat-lbl">암기 완료</div>
          </div>
          <div className="stat-box">
            <div className="stat-num a">{words.length - memCount}</div>
            <div className="stat-lbl">아직 남은 단어</div>
          </div>
        </div>
        <div className="done-actions">
          <button className="btn btn-primary" onClick={handleReshuffle}>다시 복습하기</button>
          <button className="btn btn-ghost"   onClick={onBack}>홈으로</button>
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
          <div className="study-label">📚 복습 모드 · {words.length}개 단어</div>
        </div>
        <div className="study-counter">{index + 1}/{words.length}</div>
      </div>

      {/* 진행 바 (초록색) */}
      <div className="prog-track">
        <div className="prog-fill green" style={{ width: `${progress}%` }} />
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
            aria-label={index === words.length - 1 ? "복습 완료" : "다음 단어"}
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
