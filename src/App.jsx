import { useState, useMemo, useCallback } from 'react';
import WORDS_DATA from './data/words.json';
import { useLocalSet } from './hooks/useLocalSet';
import HomeView from './views/HomeView';
import SetSelectView from './views/SetSelectView';
import StudyView from './views/StudyView';
import ReviewView from './views/ReviewView';
import AllWordsView from './views/AllWordsView';
import SpeedTestView from './views/SpeedTestView';
import RouletteView from './views/RouletteView';
import MatchGameView from './views/MatchGameView';
import './index.css';

export default function App() {
  /* ── 영속 상태 ── */
  const memorized = useLocalSet('fc_memorized'); // 암기한 단어 ID Set
  const seenWords  = useLocalSet('fc_seen');     // 학습 완료(본) 단어 ID Set

  // 룰렛 누적 보상금 상태 (기본 0원)
  const [rewardBalance, setRewardBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('fc_reward_balance');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const handleAddReward = useCallback((amount) => {
    if (!amount || amount <= 0) return;
    setRewardBalance(prev => {
      const next = prev + amount;
      try {
        localStorage.setItem('fc_reward_balance', String(next));
      } catch (e) {
        console.warn('Failed to save reward balance:', e);
      }
      return next;
    });
  }, []);

  const handleResetReward = useCallback(() => {
    setRewardBalance(0);
    try {
      localStorage.setItem('fc_reward_balance', '0');
    } catch (e) {
      console.warn('Failed to reset reward balance:', e);
    }
  }, []);

  /* ── 내비게이션 상태 ── */
  const [view, setView]               = useState('home');     // 'home' | 'setSelect' | 'study' | 'review' | 'allWords' | 'speedTest' | 'roulette' | 'matchGame'
  const [currentDayKey, setCurrentDayKey]   = useState(null); // 'DAY01' ...
  const [currentSetIdx, setCurrentSetIdx]   = useState(null); // 0 | 1 | 2 | 'all'

  /* ── 파생 상태 ── */

  /** 30단어를 전부 본 DAY = '완주' */
  const completedDays = useMemo(() => {
    const s = new Set();
    WORDS_DATA.forEach(day => {
      const allIds = day.sets.flat().map(w => w.id);
      if (allIds.every(id => seenWords.set.has(id))) s.add(day.key);
    });
    return s;
  }, [seenWords.set]);

  /** 복습 풀 = 한 번이라도 학습을 진행(본) 단어 중 아직 미암기 단어 */
  const reviewWords = useMemo(() => {
    const words = [];
    WORDS_DATA.forEach(day => {
      day.sets.flat().forEach(w => {
        if (seenWords.set.has(w.id) && !memorized.set.has(w.id)) {
          words.push(w);
        }
      });
    });
    return words;
  }, [seenWords.set, memorized.set]);

  /* ── 내비게이션 핸들러 ── */
  const goHome = useCallback(() => {
    setView('home');
    setCurrentDayKey(null);
    setCurrentSetIdx(null);
  }, []);

  const goSetSelect = useCallback((dayKey) => {
    if (dayKey) setCurrentDayKey(dayKey);
    setCurrentSetIdx(null);
    setView('setSelect');
  }, []);

  const goStudy = useCallback((setIdx) => {
    setCurrentSetIdx(setIdx);
    setView('study');
  }, []);

  const goReview = useCallback(() => setView('review'), []);

  const goAllWords = useCallback(() => setView('allWords'), []);

  const goSpeedTest = useCallback(() => setView('speedTest'), []);

  const goRoulette = useCallback(() => setView('roulette'), []);

  const goMatchGame = useCallback(() => setView('matchGame'), []);

  /** 학습 완료 시 해당 단어들을 "본 것"으로 기록 */
  const handleStudyComplete = useCallback((wordIds) => {
    seenWords.addMany(wordIds);
  }, [seenWords]);

  const handleWordSeen = useCallback((wordId) => {
    seenWords.add(wordId);
  }, [seenWords]);

  /* ── 현재 학습 단어 목록 ── */
  const currentDayData = currentDayKey
    ? WORDS_DATA.find(d => d.key === currentDayKey)
    : null;

  const rawWords = useMemo(() => {
    if (!currentDayData) return [];
    if (currentSetIdx === 'all') return currentDayData.sets.flat();
    if (typeof currentSetIdx === 'number') return currentDayData.sets[currentSetIdx];
    return [];
  }, [currentDayData, currentSetIdx]);

  const studyWords = useMemo(() => {
    if (rawWords.length === 0) return [];
    const unmemorized = rawWords.filter(w => !memorized.set.has(w.id));
    // 아직 외우지 못한 단어가 있으면 그것만, 모두 외웠으면 전체 복습
    return unmemorized.length > 0 ? unmemorized : rawWords;
  }, [rawWords, memorized.set]);

  const setLabel = currentSetIdx === 'all'
    ? '전체 30단어'
    : typeof currentSetIdx === 'number'
      ? `SET ${currentSetIdx + 1}`
      : '';

  /** 백업 데이터 복원 */
  const handleRestore = useCallback(({ memorized: memList, seen: seenList }) => {
    memorized.replaceSet(memList);
    seenWords.replaceSet(seenList);
  }, [memorized, seenWords]);

  /** 학습 기록 전체 초기화 */
  const handleClearAll = useCallback(() => {
    memorized.clear();
    seenWords.clear();
    handleResetReward();
  }, [memorized, seenWords, handleResetReward]);

  /* ── 렌더 ── */
  return (
    <>
      {view === 'home' && (
        <HomeView
          wordsData={WORDS_DATA}
          memorized={memorized.set}
          seenWords={seenWords.set}
          completedDays={completedDays}
          reviewWords={reviewWords}
          rewardBalance={rewardBalance}
          onResetReward={handleResetReward}
          onSelectDay={goSetSelect}
          onGoReview={goReview}
          onRestore={handleRestore}
          onClearAll={handleClearAll}
        />
      )}

      {view === 'setSelect' && currentDayData && (
        <SetSelectView
          dayData={currentDayData}
          memorized={memorized.set}
          seenWords={seenWords.set}
          onSelectSet={goStudy}
          onSelectAllWords={goAllWords}
          onSelectMatchGame={goMatchGame}
          onGoSpeedTest={goSpeedTest}
          onBack={goHome}
        />
      )}

      {view === 'allWords' && currentDayData && (
        <AllWordsView
          dayData={currentDayData}
          memorized={memorized.set}
          toggleMemorized={memorized.toggle}
          onWordSeen={handleWordSeen}
          onBack={() => goSetSelect(currentDayKey)}
        />
      )}

      {view === 'matchGame' && currentDayData && (
        <MatchGameView
          dayData={currentDayData}
          onBack={() => goSetSelect(currentDayKey)}
        />
      )}

      {view === 'speedTest' && currentDayData && (
        <SpeedTestView
          dayData={currentDayData}
          allWordsData={WORDS_DATA}
          onCompleteSuccess={goRoulette}
          onBack={() => goSetSelect(currentDayKey)}
        />
      )}

      {view === 'roulette' && currentDayData && (
        <RouletteView
          dayData={currentDayData}
          rewardBalance={rewardBalance}
          onWinReward={handleAddReward}
          onHome={goHome}
          onBack={() => goSetSelect(currentDayKey)}
        />
      )}

      {view === 'study' && studyWords.length > 0 && (
        <StudyView
          key={`${currentDayKey}-${currentSetIdx}`} // 세트 변경 시 완전 리마운트
          words={studyWords}
          rawWords={rawWords}
          dayKey={currentDayKey}
          setLabel={setLabel}
          memorized={memorized.set}
          toggleMemorized={memorized.toggle}
          onComplete={handleStudyComplete}
          onBack={() => goSetSelect()}
          onHome={goHome}
        />
      )}

      {view === 'review' && (
        <ReviewView
          key="review"
          reviewWords={reviewWords}
          memorized={memorized.set}
          toggleMemorized={memorized.toggle}
          onBack={goHome}
        />
      )}
    </>
  );
}
