import { ChevronLeft, ChevronRight, Zap, Gift } from 'lucide-react';
import { speak } from '../utils/speech';

const SET_META = [
  { icon: '1️⃣', label: 'SET 1', range: '1번 ~ 10번 단어' },
  { icon: '2️⃣', label: 'SET 2', range: '11번 ~ 20번 단어' },
  { icon: '3️⃣', label: 'SET 3', range: '21번 ~ 30번 단어' },
];

export default function SetSelectView({
  dayData, memorized, seenWords, onSelectSet, onSelectAllWords, onSelectMatchGame, onGoSpeedTest, onBack,
}) {
  const allWords   = dayData.sets.flat();
  const totalMem   = allWords.filter(w => memorized.has(w.id)).length;
  const isAllMastered = totalMem === allWords.length && allWords.length > 0;

  const getSetInfo = (setIdx) => {
    const words    = dayData.sets[setIdx];
    const memCount = words.filter(w => memorized.has(w.id)).length;
    const seenCount= words.filter(w => seenWords.has(w.id)).length;
    const isDone   = memCount === words.length;
    const isStarted= seenCount > 0;
    const remain   = words.length - memCount;
    const statusTxt= isDone
      ? '🎉 세트 정복 완료'
      : isStarted
        ? `🔥 남은 단어 ${remain}개`
        : '○ 미시작';
    return { memCount, seenCount, isDone, statusTxt, total: words.length, remain };
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="btn-icon" onClick={onBack} aria-label="뒤로">
          <ChevronLeft size={20} />
        </button>
        <div className="view-hdr-info">
          <div className="view-hdr-title">{dayData.label}</div>
          <div className="view-hdr-sub">{dayData.topic} · {totalMem}/30 암기 완료</div>
        </div>
      </div>

      <div className="set-list">
        {/* 1. 암기 미완료 시에만 SET 1, 2, 3 표시 */}
        {!isAllMastered && (
          <>
            {SET_META.map((meta, i) => {
              const info = getSetInfo(i);
              const handleSelect = () => {
                const words = dayData.sets[i];
                const unmemorized = words.filter(w => !memorized.has(w.id));
                const firstWord = unmemorized.length > 0 ? unmemorized[0] : words[0];
                if (firstWord) speak(firstWord.en);
                onSelectSet(i);
              };
              return (
                <div
                  key={i}
                  className={`set-card ${info.isDone ? 'completed-card' : ''}`}
                  onClick={handleSelect}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleSelect()}
                >
                  <div className="sc-icon">{info.isDone ? '👑' : meta.icon}</div>
                  <div className="sc-body">
                    <div className="sc-status">{info.statusTxt}</div>
                    <div className="sc-name">{meta.label}</div>
                    <div className="sc-range">{meta.range}</div>
                  </div>
                  <div className="sc-stat">
                    <div className="sc-mem">{info.memCount}</div>
                    <div className="sc-tot">/ {info.total} 암기</div>
                  </div>
                  <ChevronRight size={16} color="rgba(240,235,224,0.25)" />
                </div>
              );
            })}
          </>
        )}

        {/* 2. 전체 리스트 보기 카드 (공통 첫 번째/네 번째) */}
        <div
          className="set-card all-set"
          onClick={() => {
            if (onSelectAllWords) {
              onSelectAllWords();
            } else {
              onSelectSet('all');
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (onSelectAllWords) onSelectAllWords();
              else onSelectSet('all');
            }
          }}
        >
          <div className="sc-icon">📋</div>
          <div className="sc-body">
            <div className="sc-status">
              {totalMem === 30 ? '🎁 30단어 정복 완료' : `전체 단어장 보기 · 남은 단어 ${30 - totalMem}개`}
            </div>
            <div className="sc-name">전체 리스트 보기</div>
            <div className="sc-range">한눈에 전체 보기 · 터치 시 발음 & 즉시 암기 체크</div>
          </div>
          <div className="sc-stat">
            <div className="sc-mem">{totalMem}</div>
            <div className="sc-tot">/ 30 암기</div>
          </div>
          <ChevronRight size={16} color="rgba(240,185,59,0.5)" />
        </div>

        {/* 3. 짝맞추기 게임 카드 (공통) */}
        <div
          className="set-card match-set-card"
          onClick={() => {
            if (onSelectMatchGame) onSelectMatchGame();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' && onSelectMatchGame) onSelectMatchGame();
          }}
        >
          <div className="sc-icon">🧩</div>
          <div className="sc-body">
            <div className="sc-status">단어와 뜻 매칭 게임</div>
            <div className="sc-name">짝맞추기 게임</div>
            <div className="sc-range">6단어 12장 카드 (3×4 배치) · 총 5세트 클리어</div>
          </div>
          <div className="sc-stat">
            <div className="sc-mem" style={{ color: 'var(--accent)' }}>5세트</div>
            <div className="sc-tot">30단어</div>
          </div>
          <ChevronRight size={16} color="#fb923c" />
        </div>

        {/* 4. 암기 완료 시에만 노출되는 룰렛 보상 카드 */}
        {isAllMastered && (() => {
          let isDouble = false;
          let isRouletteDone = false;
          try {
            const hasFlag = localStorage.getItem(`fc_double_reward_${dayData.key}`) === 'true';
            const bestScore = localStorage.getItem(`fc_best_match_${dayData.key}`);
            isDouble = hasFlag || (bestScore ? Number(bestScore) < 60000 : false);
            isRouletteDone = localStorage.getItem(`fc_roulette_done_${dayData.key}`) === 'true';
          } catch {}

          if (isRouletteDone) {
            return (
              <div
                className="set-card roulette-set-card done-locked"
                role="button"
                tabIndex={-1}
                title="해당 DAY의 룰렛 보상(1회 한정)이 완료되었습니다"
              >
                <div className="sc-icon">✅</div>
                <div className="sc-body">
                  <div className="sc-status" style={{ color: 'var(--text-dim)', fontWeight: 700 }}>
                    보상 기회 종료
                  </div>
                  <div className="sc-name" style={{ color: 'rgba(240, 235, 224, 0.5)' }}>
                    룰렛 보상 완료 (1회 한정)
                  </div>
                  <div className="sc-range" style={{ color: 'var(--text-dim2)' }}>
                    보상 룰렛 참여가 완료되었습니다. (짝맞추기 복습은 계속 가능!)
                  </div>
                </div>
                <div className="sc-stat">
                  <div className="sc-mem" style={{ color: 'var(--text-dim)' }}>완료</div>
                  <div className="sc-tot">수령 완료</div>
                </div>
              </div>
            );
          }

          return (
            <div
              className={`set-card roulette-set-card ${isDouble ? 'double-glow' : ''}`}
              onClick={onGoSpeedTest}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onGoSpeedTest && onGoSpeedTest()}
            >
              <div className="sc-icon">{isDouble ? '🔥' : '🎰'}</div>
              <div className="sc-body">
                <div className="sc-status" style={{ color: isDouble ? '#ff9800' : '#ffd700', fontWeight: 800 }}>
                  {isDouble ? '🔥 짝맞추기 59초대 클리어! [2배 찬스 발동]' : '🎁 30단어 정복 특별 보상'}
                </div>
                <div className="sc-name" style={{ color: '#fff' }}>
                  룰렛 보상 {isDouble && <span className="double-tag-pill">2배 찬스!</span>}
                </div>
                <div className="sc-range">
                  스피드 퀴즈 통과 시 <strong>{isDouble ? '최대 40,000원 (2배!) 룰렛' : '최대 20,000원 룰렛'}</strong> 도전!
                </div>
              </div>
              <div className="sc-stat">
                <div className="sc-mem" style={{ color: isDouble ? '#ffeb3b' : '#ffd700' }}>
                  {isDouble ? '최대 4만원' : '최대 2만원'}
                </div>
                <div className="sc-tot">{isDouble ? '2배 룰렛' : '룰렛 돌리기 (1회)'}</div>
              </div>
              <ChevronRight size={18} color={isDouble ? '#ff9800' : '#f0b93b'} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
