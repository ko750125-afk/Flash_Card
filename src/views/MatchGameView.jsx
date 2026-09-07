import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, RotateCcw, Award, Sparkles, Timer, Trophy } from 'lucide-react';
import { speak } from '../utils/speech';
import { playCorrectSound, playWrongSound, playJackpotSound, playCardClickSound } from '../utils/sound';

function shuffle(arr) {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

const SET_COUNT = 1; // [테스트 모드] 빠른 검증을 위해 1세트(6단어)로 단축
const WORDS_PER_SET = 6;

// 밀리초를 0.1초 단위(MM:SS.s)로 변환
function formatTime01(ms) {
  if (ms === null || ms === undefined) return '--:--.-';
  const totalTenths = Math.floor(ms / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

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

  const storageKey = `fc_best_match_${dayData.key}`;

  // 최고 기록(Best Record) 로드
  const [bestTimeMs, setBestTimeMs] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [cards, setCards] = useState([]);
  const [firstSelected, setFirstSelected] = useState(null);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [failedIds, setFailedIds] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGameDone, setIsGameDone] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // 3개 선물상자 (1배 1개, 2배 2개) 뽑기 상태
  const [showBoxPick, setShowBoxPick] = useState(false);
  const [giftBoxes, setGiftBoxes] = useState([]);
  const [selectedBoxIdx, setSelectedBoxIdx] = useState(null);
  const [isBoxesRevealed, setIsBoxesRevealed] = useState(false);
  const [wonDoubleChance, setWonDoubleChance] = useState(false);

  const startTimeRef = useRef(null);
  const timerRafRef = useRef(null);

  // 0.1초 정밀 스톱워치 실행
  useEffect(() => {
    if (isGameDone) return;

    startTimeRef.current = Date.now() - elapsedMs;

    const tick = () => {
      setElapsedMs(Date.now() - startTimeRef.current);
      timerRafRef.current = requestAnimationFrame(tick);
    };

    timerRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
    };
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

    // 영단어 카드이면 발음 재생, 한글 카드이면 경쾌한 팝 클릭 사운드 재생
    if (card.type === 'en') {
      speak(card.text);
    } else {
      playCardClickSound();
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
            // 5세트 완료 처리
            const finalTime = Date.now() - startTimeRef.current;
            setElapsedMs(finalTime);
            setIsGameDone(true);
            playJackpotSound();

            // 신기록 판별 및 갱신 저장
            setBestTimeMs(prevBest => {
              const isRecord = prevBest === null || finalTime < prevBest;
              if (isRecord) {
                setIsNewRecord(true);
                try {
                  localStorage.setItem(storageKey, String(finalTime));
                } catch (e) {
                  console.warn('Failed to save best score:', e);
                }
                return finalTime;
              } else {
                setIsNewRecord(false);
                return prevBest;
              }
            });

            // 1분 미만(59.9초 이하) 완주 시 3개 선물상자 뽑기 모드 진입
            if (finalTime < 60000) {
              const boxes = shuffle([
                { id: 'b1', mult: 1, label: '1배 (기본)', emoji: '🙂', desc: '아쉽지만 기본 보상' },
                { id: 'b2', mult: 2, label: '🔥 2배 찬스!', emoji: '🎉', desc: '룰렛 보상금 2배 획득!' },
                { id: 'b3', mult: 2, label: '🔥 2배 찬스!', emoji: '🎉', desc: '룰렛 보상금 2배 획득!' },
              ]);
              setGiftBoxes(boxes);
              setSelectedBoxIdx(null);
              setIsBoxesRevealed(false);
              setWonDoubleChance(false);
              setShowBoxPick(true);
            } else {
              setShowBoxPick(false);
            }
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
  }, [isProcessing, matchedIds, firstSelected, cards.length, currentSetIdx, storageKey, dayData.key]);

  // 선물상자 1개 선택 처리
  const handleSelectBox = (idx) => {
    if (isBoxesRevealed) return;

    setSelectedBoxIdx(idx);
    setIsBoxesRevealed(true);

    const picked = giftBoxes[idx];
    if (picked.mult === 2) {
      setWonDoubleChance(true);
      playJackpotSound();
      try {
        localStorage.setItem(`fc_double_reward_${dayData.key}`, 'true');
      } catch (e) {
        console.warn('Failed to save double reward chance:', e);
      }
    } else {
      setWonDoubleChance(false);
      playCorrectSound();
    }
  };

  const handleRestart = () => {
    setCurrentSetIdx(0);
    setElapsedMs(0);
    setIsGameDone(false);
    setIsNewRecord(false);
    setShowBoxPick(false);
    setSelectedBoxIdx(null);
    setIsBoxesRevealed(false);
    setWonDoubleChance(false);
    startTimeRef.current = Date.now();
  };

  return (
    <div className="view-container match-game-view">
      {/* ── 헤더 ── */}
      <div className="match-header">
        <button className="btn-icon" onClick={onBack} aria-label="뒤로가기">
          <ChevronLeft size={20} />
        </button>
        <div className="match-hdr-center">
          <div className="match-title">🧩 {dayData.label} 짝맞추기 (2배 찬스 도전!)</div>
          <div className="match-sub">{dayData.topic}</div>
        </div>
        <div className="match-stats-header">
          {/* 실시간 0.1초 정밀 스톱워치 */}
          <div className="match-timer-chip">
            <Timer size={15} />
            <span>{formatTime01(elapsedMs)}</span>
          </div>
          {/* 최고 기록 칩 */}
          <div className="match-best-chip" title="내 최고 기록">
            <Trophy size={13} color="#ffd700" />
            <span>{bestTimeMs ? formatTime01(bestTimeMs) : '--:--.-'}</span>
          </div>
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
      ) : showBoxPick ? (
        /* ── 1분 미만 완주 특전: 3개 선물상자 (1배, 2배, 2배) 선택 미니게임 ── */
        <div className="match-result-box box-pick-box">
          <div className="box-pick-header">
            <div className="box-pick-badge">
              🔥 59초대 클리어 성공! (기록: {formatTime01(elapsedMs)})
            </div>
            <h2 className="box-pick-title">선물상자를 하나 골라주세요!</h2>
            <p className="box-pick-desc">
              3개의 상자 중 <strong>2개는 2배 찬스</strong>, <strong>1개는 1배</strong>입니다!
            </p>
          </div>

          <div className="gift-box-pick-grid">
            {giftBoxes.map((box, idx) => {
              const isSelected = selectedBoxIdx === idx;
              return (
                <div
                  key={box.id}
                  className={`gift-box-card ${isSelected ? 'selected' : ''} ${isBoxesRevealed ? 'revealed' : ''} ${isBoxesRevealed && box.mult === 2 ? 'is-double' : ''}`}
                  onClick={() => !isBoxesRevealed && handleSelectBox(idx)}
                  role="button"
                  tabIndex={isBoxesRevealed ? -1 : 0}
                >
                  {!isBoxesRevealed ? (
                    <div className="box-closed-view">
                      <div className="box-emoji-anim">🎁</div>
                      <div className="box-num-tag">{idx + 1}번 상자</div>
                      <div className="box-tap-hint">터치하여 열기</div>
                    </div>
                  ) : (
                    <div className="box-opened-view">
                      <div className="box-res-emoji">{box.emoji}</div>
                      <div className="box-res-mult">{box.mult}배</div>
                      <div className="box-res-lbl">{box.label}</div>
                      {isSelected && <div className="box-my-pick">내 선택</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isBoxesRevealed && (
            <div className="box-reveal-result-area">
              <div className={`box-result-banner ${wonDoubleChance ? 'win-double' : 'win-single'}`}>
                {wonDoubleChance ? (
                  <>
                    <Sparkles size={18} />
                    <span>🎉 축하합니다! <strong>보상금 2배 찬스</strong>에 당첨되었습니다!</span>
                    <Sparkles size={18} />
                  </>
                ) : (
                  <span>🙂 아쉽게도 1배가 나왔습니다. 다음 판에 다시 2배에 도전해 보세요!</span>
                )}
              </div>

              <div className="res-actions" style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowBoxPick(false)}
                >
                  기록 확인 및 완료 →
                </button>
                <button className="btn btn-ghost" onClick={handleRestart}>
                  <RotateCcw size={16} />
                  <span>2배 찬스 다시 도전!</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── 전체 5세트 완료 및 기록 갱신 결과 화면 ── */
        <div className="match-result-box">
          <div className="match-res-emoji">
            {isNewRecord ? '👑 🏆 👑' : '🎉 👏 🎉'}
          </div>

          {wonDoubleChance ? (
            <div className="double-chance-earned-banner">
              <span className="flame-icon">🔥</span>
              <span><strong>선물상자 2배 당첨!</strong> 룰렛 보상금 2배 찬스 발동!</span>
              <span className="flame-icon">🔥</span>
            </div>
          ) : elapsedMs < 60000 ? (
            <div className="double-chance-earned-banner" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}>
              <span>59초대 클리어 완주 (상자 선택: 1배)</span>
            </div>
          ) : null}

          {isNewRecord && (
            <div className="new-record-banner">
              <Sparkles size={16} />
              <span>NEW RECORD! 신기록 달성!</span>
              <Sparkles size={16} />
            </div>
          )}

          <div className="match-res-title">30단어 매칭 완주 성공!</div>
          <p className="match-res-desc">
            {isNewRecord
              ? '축하합니다! 새로운 최고 기록을 세우셨습니다!'
              : '수고하셨습니다! 계속해서 신기록 및 2배 찬스에 도전해 보세요!'}
          </p>

          <div className="match-stat-row">
            <div className={`stat-pill ${isNewRecord ? 'highlight-gold' : ''}`}>
              <div className="lbl">이번 기록</div>
              <div className="val a">{formatTime01(elapsedMs)}</div>
            </div>
            <div className="stat-pill highlight-gold">
              <div className="lbl">최고 기록</div>
              <div className="val g">{formatTime01(bestTimeMs)}</div>
            </div>
          </div>

          <div className="res-actions">
            <button className="btn btn-primary" onClick={handleRestart}>
              <RotateCcw size={18} />
              <span>2배 찬스 재도전!</span>
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
