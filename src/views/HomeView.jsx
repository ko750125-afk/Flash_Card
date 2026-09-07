import { ChevronRight, BookOpen } from 'lucide-react';
import { speak } from '../utils/speech';

// DAY01~DAY40 전체 슬롯 생성
const ALL_DAY_KEYS = Array.from({ length: 40 }, (_, i) =>
  `DAY${String(i + 1).padStart(2, '0')}`
);

export default function HomeView({
  wordsData, memorized, seenWords, completedDays, reviewWords,
  onSelectDay, onGoReview,
}) {
  // 빠른 접근을 위한 맵
  const dataMap = Object.fromEntries(wordsData.map(d => [d.key, d]));

  // 전체 통계
  const totalWords    = wordsData.reduce((s, d) => s + d.sets.flat().length, 0);
  const totalMemorized = wordsData.reduce(
    (s, d) => s + d.sets.flat().filter(w => memorized.has(w.id)).length, 0
  );

  const getDayStatus = (dayKey) => {
    const data = dataMap[dayKey];
    if (!data) return 'locked';
    if (completedDays.has(dayKey)) return 'completed';
    const seenCount = data.sets.flat().filter(w => seenWords.has(w.id)).length;
    if (seenCount > 0) return 'in-progress';
    return 'not-started';
  };

  const getDayProgress = (dayKey) => {
    const data = dataMap[dayKey];
    if (!data) return { mem: 0, total: 30 };
    const all = data.sets.flat();
    return { mem: all.filter(w => memorized.has(w.id)).length, total: all.length };
  };

  const BADGE = {
    'not-started': { cls: 'ns', txt: '시작' },
    'in-progress': { cls: 'ip', txt: '진행중' },
    completed:     { cls: 'done', txt: '완주' },
    locked:        { cls: 'lock', txt: '준비중' },
  };

  return (
    <div className="home-view">
      {/* ── 스티키 헤더 ── */}
      <div className="home-sticky">
        <div>
          <h1 className="home-title">📚 영단어 마스터</h1>
          <p className="home-subtitle">DAY01 ~ DAY40 (총 1,200단어)</p>
        </div>
        <div className="total-chip">
          <div className="num">{totalMemorized}</div>
          <div className="lbl">/ {totalWords} 암기</div>
        </div>
      </div>

      {/* ── 복습 배너 ── */}
      {reviewWords.length > 0 && (
        <div className="review-banner">
          <p className="rb-text">
            복습할 단어 <strong>{reviewWords.length}개</strong>가 쌓였어요
          </p>
          <button
            className="btn-review"
            onClick={() => {
              if (reviewWords[0]) speak(reviewWords[0].en);
              onGoReview();
            }}
          >
            복습하기 →
          </button>
        </div>
      )}

      {/* ── DAY 그리드 ── */}
      <div className="day-section">
        <p className="day-section-label">학습 목록</p>
        <div className="day-grid">
          {ALL_DAY_KEYS.map(dayKey => {
            const status = getDayStatus(dayKey);
            const { mem, total } = getDayProgress(dayKey);
            const data = dataMap[dayKey];
            const locked = status === 'locked';
            const badge = BADGE[status];

            return (
              <div
                key={dayKey}
                className={`day-card ${locked ? 'locked' : ''} ${status === 'completed' ? 'completed' : ''}`}
                onClick={() => !locked && onSelectDay(dayKey)}
                role={locked ? undefined : 'button'}
                tabIndex={locked ? -1 : 0}
                onKeyDown={e => !locked && e.key === 'Enter' && onSelectDay(dayKey)}
                aria-label={locked ? `${dayKey} 준비중` : `${dayKey} 학습하기`}
              >
                <div className="dc-day">DAY</div>
                <div className="dc-num">{dayKey.slice(3)}</div>
                {data ? (
                  <>
                    <div className="dc-topic">{data.topic}</div>
                    <div className="dc-bar">
                      <div className="dc-bar-fill" style={{ width: `${(mem / total) * 100}%` }} />
                    </div>
                    <div className="dc-footer">
                      <span className="dc-count">{mem}/{total}</span>
                      <span className={`dc-badge ${badge.cls}`}>{badge.txt}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dc-topic" style={{ fontSize: '0.6rem' }}>준비중</div>
                    <div style={{ flex: 1 }} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
