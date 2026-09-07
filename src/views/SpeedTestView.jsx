import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, Timer, Zap, RotateCcw, Award, Volume2 } from 'lucide-react';
import { speak } from '../utils/speech';
import { playCorrectSound, playWrongSound } from '../utils/sound';

const TOTAL_TIME_LIMIT = 90; // 30문제 총 90초 (1.5분)

function shuffle(arr) {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

export default function SpeedTestView({
  dayData,
  allWordsData,
  onCompleteSuccess,
  onBack,
}) {
  const allPool = useMemo(() => {
    return allWordsData.flatMap(d => d.sets.flat());
  }, [allWordsData]);

  const questions = useMemo(() => {
    const dayWords = dayData.sets.flat();
    const shuffledWords = shuffle(dayWords);

    return shuffledWords.map(word => {
      // 다른 단어들의 뜻에서 오답 3개 추출
      const otherMeanings = allPool
        .filter(w => w.id !== word.id && w.ko !== word.ko)
        .map(w => w.ko);
      const shuffledOthers = shuffle(otherMeanings).slice(0, 3);
      const choices = shuffle([
        { text: word.ko, isCorrect: true },
        ...shuffledOthers.map(ko => ({ text: ko, isCorrect: false })),
      ]);

      return {
        id: word.id,
        en: word.en,
        ko: word.ko,
        choices,
      };
    });
  }, [dayData, allPool]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_LIMIT);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongWords, setWrongWords] = useState([]);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'timeout' | 'finished'

  const timerRef = useRef(null);

  // 타이머 실행
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameState('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState]);

  const currentQ = questions[currentIndex];

  const handleSelectChoice = useCallback((choiceIdx) => {
    if (isAnswerLocked || gameState !== 'playing' || !currentQ) return;

    setIsAnswerLocked(true);
    setSelectedChoiceIdx(choiceIdx);

    const chosen = currentQ.choices[choiceIdx];

    if (chosen.isCorrect) {
      playCorrectSound();
      speak(currentQ.en);
      setScore(prev => prev + 1);

      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(prev => prev + 1);
          setSelectedChoiceIdx(null);
          setIsAnswerLocked(false);
        } else {
          setGameState('finished');
        }
      }, 450);
    } else {
      playWrongSound();
      setWrongWords(prev => [...prev, currentQ]);

      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(prev => prev + 1);
          setSelectedChoiceIdx(null);
          setIsAnswerLocked(false);
        } else {
          setGameState('finished');
        }
      }, 850);
    }
  }, [isAnswerLocked, gameState, currentQ, currentIndex, questions.length]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setTimeLeft(TOTAL_TIME_LIMIT);
    setSelectedChoiceIdx(null);
    setIsAnswerLocked(false);
    setScore(0);
    setWrongWords([]);
    setGameState('playing');
  };

  const isPassed = gameState === 'finished' && score >= 24; // 30문제 중 24개 이상 정답 시 룰렛 자격 획득

  return (
    <div className="view-container speed-test-view">
      {/* ── 헤더 ── */}
      <div className="test-header">
        <button className="btn-icon" onClick={onBack} aria-label="뒤로가기">
          <ChevronLeft size={20} />
        </button>
        <div className="test-hdr-center">
          <div className="test-title">⚡ {dayData.label} 스피드 퀴즈</div>
          <div className="test-sub">{dayData.topic}</div>
        </div>
        <div className="test-timer-chip">
          <Timer size={16} className={timeLeft <= 15 ? 'timer-danger-icon' : ''} />
          <span className={`timer-sec ${timeLeft <= 15 ? 'timer-danger' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* ── 상단 진행 바 & 타이머 바 ── */}
      <div className="test-bars-wrap">
        <div className="test-time-track">
          <div
            className={`test-time-fill ${timeLeft <= 15 ? 'danger' : ''}`}
            style={{ width: `${(timeLeft / TOTAL_TIME_LIMIT) * 100}%` }}
          />
        </div>
        <div className="test-prog-info">
          <span>문제 {currentIndex + 1} / {questions.length}</span>
          <span className="test-score-chip">정답 {score}개</span>
        </div>
      </div>

      {/* ── 퀴즈 게임 본문 ── */}
      {gameState === 'playing' && currentQ && (
        <div className="test-card-body">
          {/* 영단어 문제 박스 */}
          <div className="test-question-box">
            <div className="test-word-en">{currentQ.en}</div>
            <button
              className="test-btn-tts"
              onClick={() => speak(currentQ.en)}
              aria-label="발음 다시듣기"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {/* 4지선다 답지 그리드 */}
          <div className="test-choices-grid">
            {currentQ.choices.map((choice, cIdx) => {
              let choiceCls = 'test-choice-btn';
              if (isAnswerLocked) {
                if (choice.isCorrect) {
                  choiceCls += ' correct';
                } else if (selectedChoiceIdx === cIdx) {
                  choiceCls += ' wrong';
                }
              }

              return (
                <button
                  key={cIdx}
                  className={choiceCls}
                  onClick={() => handleSelectChoice(cIdx)}
                  disabled={isAnswerLocked}
                >
                  <span className="choice-badge">{cIdx + 1}</span>
                  <span className="choice-text">{choice.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 타임오버 화면 ── */}
      {gameState === 'timeout' && (
        <div className="test-result-box timeout">
          <div className="res-emoji">⏰</div>
          <div className="res-title">시간이 초과되었습니다!</div>
          <p className="res-desc">
            제한 시간({TOTAL_TIME_LIMIT}초) 내에 30문제를 빠르게 풀어야 룰렛에 도전할 수 있습니다.
          </p>
          <div className="res-stat-row">
            <div className="stat-pill">
              <div className="lbl">푼 문제</div>
              <div className="val">{currentIndex} / 30</div>
            </div>
            <div className="stat-pill">
              <div className="lbl">맞힌 정답</div>
              <div className="val g">{score}개</div>
            </div>
          </div>
          <div className="res-actions">
            <button className="btn btn-primary btn-retry" onClick={handleRestart}>
              <RotateCcw size={18} />
              <span>다시 도전하기</span>
            </button>
            <button className="btn btn-ghost" onClick={onBack}>
              세트 목록으로
            </button>
          </div>
        </div>
      )}

      {/* ── 퀴즈 완료 화면 ── */}
      {gameState === 'finished' && (
        <div className="test-result-box">
          <div className="res-emoji">{isPassed ? '🎁' : '💪'}</div>
          <div className="res-title">
            {isPassed ? '🎉 마스터 퀴즈 통과!' : '아쉽습니다!'}
          </div>
          <p className="res-desc">
            {isPassed
              ? `축하합니다! 30문제 중 ${score}문제를 맞혀 행운의 룰렛 보상 기회를 획득했습니다!`
              : `정답 24개 이상이어야 룰렛에 도전할 수 있습니다. (현재 ${score}개)`}
          </p>
          <div className="res-stat-row">
            <div className="stat-pill">
              <div className="lbl">최종 점수</div>
              <div className={`val ${isPassed ? 'g' : 'a'}`}>{score} / 30</div>
            </div>
            <div className="stat-pill">
              <div className="lbl">남은 시간</div>
              <div className="val">{timeLeft}초</div>
            </div>
          </div>

          <div className="res-actions">
            {isPassed ? (
              <button
                className="btn btn-primary btn-roulette-enter"
                onClick={onCompleteSuccess}
              >
                <Award size={20} />
                <span>🎁 행운의 룰렛 돌리러 가기!</span>
              </button>
            ) : (
              <button className="btn btn-primary btn-retry" onClick={handleRestart}>
                <RotateCcw size={18} />
                <span>다시 도전하기</span>
              </button>
            )}
            <button className="btn btn-ghost" onClick={onBack}>
              세트 목록으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
