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
        {/* 🎁 30단어 마스터 완료 시 퀴즈 & 룰렛 보상 도전 특별 배너 */}
        {isAllMastered && (
          <div
            className="speed-test-banner-card"
            onClick={onGoSpeedTest}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onGoSpeedTest && onGoSpeedTest()}
          >
            <div className="st-banner-badge">🎁 특별 보상 챌린지</div>
            <div className="st-banner-content">
              <div className="st-banner-icon">🎰</div>
              <div className="st-banner-text">
                <div className="st-banner-title">⚡ 스피드 퀴즈 & 룰렛 보상!</div>
                <div className="st-banner-desc">
                  타이머 내 4지선다 통과 시 <strong>최대 20,000원 룰렛</strong> 기회 획득!
                </div>
              </div>
              <ChevronRight size={20} color="#f0b93b" />
            </div>
          </div>
        )}
        {/* SET 1~3 */}
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

        {/* 전체 리스트 보기 */}
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

        {/* 짝맞추기 게임 */}
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
      </div>
    </div>
  );
}
