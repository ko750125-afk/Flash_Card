import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, RotateCcw, Award, Sparkles, Timer } from 'lucide-react';
import { speak } from '../utils/speech';
import { playCorrectSound, playWrongSound, playJackpotSound } from '../utils/sound';

function shuffle(arr) {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

const SET_COUNT = 5;
const WORDS_PER_SET = 6;

export default function MatchGameView({ dayData, onBack }) {
  const allWords = useMemo(() => dayData.sets.flat(), [dayData]);

  // 30단어를 6단어씩 5개 세트로 분할
  const wordSets = useMemo(() => {
    const sets = [];
    for (let i = 0; i < SET_COUNT; i++) {
      const slice = allWords.slice(i * WORDS_PER_SET, (i + 1) * WORDS_PER_SET);
      sets.push(slice);
    }
    return sets;
  }, [allWords]);

  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [cards, setCards] = useState([]);
  const [firstSelected, setFirstSelected] = useState(null);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [failedIds, setFailedIds] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGameDone, setIsGameDone] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // 타이머 실행
  useEffect(() => {
    if (isGameDone) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameDone]);

  // 세트 변경 시 12장 카드 셔플 생성
  useEffect(() => {
    const currentWords = wordSets[currentSetIdx] || [];
    const newCards = [];

    currentWords.forEach(w => {
      newCards.push({
        id: `${w.id}_en`,
        wordId: w.id,
        type: 'en',
        text: w.en,
      });
      newCards.push({
        id: `${w.id}_ko`,
        wordId: w.id,
        type: 'ko',
        text: w.ko,
      });
    });

    setCards(shuffle(newCards));
    setFirstSelected(null);
    setMatchedIds(new Set());
    setFailedIds([]);
    setIsProcessing(false);
  }, [currentSetIdx, wordSets]);

  const handleCardClick = useCallback((card) => {
    if (isProcessing || matchedIds.has(card.id)) return;

    // 영단어 카드이면 발음 재생
    if (card.type === 'en') {
      speak(card.text);
    }

    // 첫 번째 선택
    if (!firstSelected) {
      setFirstSelected(card);
      return;
    }

    // 동일 카드 재클릭
    if (firstSelected.id === card.id) {
      setFirstSelected(null);
      return;
    }

    // 두 번째 선택 -> 매칭 검사
    setIsProcessing(true);

    const isMatch = firstSelected.wordId === card.wordId && firstSelected.type !== card.type;

    if (isMatch) {
      playCorrectSound();
      const nextMatched = new Set(matchedIds);
      nextMatched.add(firstSelected.id);
      nextMatched.add(card.id);
      setMatchedIds(nextMatched);
      setFirstSelected(null);
      setIsProcessing(false);

      // 현재 세트 6쌍(12장) 모두 맞췄는지 검사
      if (nextMatched.size === cards.length) {
        setTimeout(() => {
          if (currentSetIdx + 1 < SET_COUNT) {
            setCurrentSetIdx(prev => prev + 1);
          } else {
            setIsGameDone(true);
            playJackpotSound();
          }
        }, 650);
      }
    } else {
      playWrongSound();
      setFailedIds([firstSelected.id, card.id]);

      setTimeout(() => {
        setFailedIds([]);
        setFirstSelected(null);
        setIsProcessing(false);
      }, 700);
    }
  }, [isProcessing, matchedIds, firstSelected, cards.length, currentSetIdx]);

  const handleRestart = () => {
    setCurrentSetIdx(0);
    setTimerSeconds(0);
    setIsGameDone(false);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="view-container match-game-view">
      {/* ── 헤더 ── */}
      <div className="match-header">
        <button className="btn-icon" onClick={onBack} aria-label="뒤로가기">
          <ChevronLeft size={20} />
        </button>
        <div className="match-hdr-center">
          <div className="match-title">🧩 {dayData.label} 짝맞추기</div>
          <div className="match-sub">{dayData.topic}</div>
        </div>
        <div className="match-timer-chip">
          <Timer size={16} />
          <span>{formatTime(timerSeconds)}</span>
        </div>
      </div>

      {/* ── 세트 진행률 인디케이터 (1~5세트) ── */}
      <div className="match-prog-bar">
        <div className="match-set-chips">
          {Array.from({ length: SET_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`set-dot-chip ${i === currentSetIdx ? 'active' : ''} ${i < currentSetIdx ? 'done' : ''}`}
            >
              세트 {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* ── 게임 본문 (3×4 12장 카드 그리드) ── */}
      {!isGameDone ? (
        <div className="match-body">
          <div className="match-grid-3x4">
            {cards.map(card => {
              const isSelected = firstSelected && firstSelected.id === card.id;
              const isMatched = matchedIds.has(card.id);
              const isFailed = failedIds.includes(card.id);

              return (
                <div
                  key={card.id}
                  className={`match-card ${card.type} ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''} ${isFailed ? 'failed' : ''}`}
                  onClick={() => handleCardClick(card)}
                  role="button"
                  tabIndex={isMatched ? -1 : 0}
                  onKeyDown={e => e.key === 'Enter' && handleCardClick(card)}
                >
                  <div className="card-type-tag">{card.type === 'en' ? 'EN' : 'KO'}</div>
                  <div className="card-text">{card.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── 전체 5세트 완료 화면 ── */
        <div className="match-result-box">
          <div className="match-res-emoji">🎉 🏆 🎉</div>
          <div className="match-res-title">30단어 짝맞추기 완성!</div>
          <p className="match-res-desc">
            5세트 총 30쌍의 단어와 뜻을 완벽하게 매칭하셨습니다!
          </p>
          <div className="match-stat-row">
            <div className="stat-pill">
              <div className="lbl">완료 세트</div>
              <div className="val g">5 / 5</div>
            </div>
            <div className="stat-pill">
              <div className="lbl">총 소요 시간</div>
              <div className="val a">{formatTime(timerSeconds)}</div>
            </div>
          </div>
          <div className="res-actions">
            <button className="btn btn-primary" onClick={handleRestart}>
              <RotateCcw size={18} />
              <span>처음부터 다시하기</span>
            </button>
            <button className="btn btn-ghost" onClick={onBack}>
              세트 목록으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
