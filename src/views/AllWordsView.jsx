import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, Volume2, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { speak } from '../utils/speech';
import { useDragScroll } from '../hooks/useDragScroll';

export default function AllWordsView({
  dayData,
  memorized,
  toggleMemorized,
  onWordSeen,
  onBack,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unmemorized' | 'memorized'
  const [hideMeaning, setHideMeaning] = useState(false); // 뜻 가리기 모드 (셀프 테스트용)
  const [playingId, setPlayingId] = useState(null);

  const { containerRef, isGrabbing, events, hasDraggedRef } = useDragScroll();

  const allWords = useMemo(() => dayData.sets.flat(), [dayData]);
  const totalCount = allWords.length;
  const memCount = allWords.filter(w => memorized.has(w.id)).length;
  const unmemCount = totalCount - memCount;

  const filteredWords = useMemo(() => {
    if (filter === 'unmemorized') return allWords.filter(w => !memorized.has(w.id));
    if (filter === 'memorized') return allWords.filter(w => memorized.has(w.id));
    return allWords;
  }, [allWords, filter, memorized]);

  const handlePlayAudio = useCallback((e, word) => {
    e.stopPropagation();
    setPlayingId(word.id);
    speak(word.en);
    onWordSeen(word.id);
    setTimeout(() => setPlayingId(null), 1200);
  }, [onWordSeen]);

  const handleToggleMem = useCallback((e, wordId) => {
    e.stopPropagation();
    toggleMemorized(wordId);
    onWordSeen(wordId);
  }, [toggleMemorized, onWordSeen]);

  const handleRowClick = useCallback((word) => {
    if (hasDraggedRef.current) return;
    setPlayingId(word.id);
    speak(word.en);
    onWordSeen(word.id);
    setTimeout(() => setPlayingId(null), 1200);
  }, [hasDraggedRef, onWordSeen]);

  return (
    <div
      className={`view-container all-words-view ${isGrabbing ? 'grabbing' : ''}`}
      ref={containerRef}
      {...events}
    >
      {/* ── 스티키 상단 헤더 ── */}
      <div className="aw-header-sticky">
        <div className="aw-header-top">
          <button className="btn-icon" onClick={onBack} aria-label="뒤로가기">
            <ChevronLeft size={20} />
          </button>
          <div className="aw-header-info">
            <div className="aw-header-title">
              {dayData.label} 전체 단어
            </div>
            <div className="aw-header-topic">{dayData.topic}</div>
          </div>
          <div className="aw-header-stat">
            <span className="aw-mem-num">{memCount}</span>
            <span className="aw-tot-num">/{totalCount}</span>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="aw-progress-track">
          <div
            className={`aw-progress-fill ${memCount === totalCount ? 'golden' : ''}`}
            style={{ width: `${(memCount / totalCount) * 100}%` }}
          />
        </div>

        {/* 필터 및 뜻 가리기 툴바 */}
        <div className="aw-toolbar">
          <div className="aw-filter-group">
            <button
              className={`aw-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              전체 ({totalCount})
            </button>
            <button
              className={`aw-filter-btn ${filter === 'unmemorized' ? 'active' : ''}`}
              onClick={() => setFilter('unmemorized')}
            >
              미암기 ({unmemCount})
            </button>
            <button
              className={`aw-filter-btn ${filter === 'memorized' ? 'active' : ''}`}
              onClick={() => setFilter('memorized')}
            >
              암기완료 ({memCount})
            </button>
          </div>

          <button
            className={`aw-btn-toggle-meaning ${hideMeaning ? 'active' : ''}`}
            onClick={() => setHideMeaning(!hideMeaning)}
            title={hideMeaning ? '뜻 보이기' : '뜻 가리기(테스트)'}
          >
            {hideMeaning ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{hideMeaning ? '뜻 가림' : '뜻 가리기'}</span>
          </button>
        </div>
      </div>

      {/* ── 30단어 리스트 본문 ── */}
      <div className="aw-list-body">
        {filteredWords.length === 0 ? (
          <div className="aw-empty-msg">
            {filter === 'unmemorized'
              ? '🎉 축하합니다! 모든 단어를 암기했습니다.'
              : '해당하는 단어가 없습니다.'}
          </div>
        ) : (
          <div className="aw-list">
            {filteredWords.map((word, idx) => {
              const isMem = memorized.has(word.id);
              const isPlaying = playingId === word.id;
              // 전체 목록에서의 실제 인덱스 번호 (1~30)
              const originalIndex = allWords.findIndex(w => w.id === word.id) + 1;

              return (
                <div
                  key={word.id}
                  className={`aw-card-row ${isMem ? 'is-memorized' : ''} ${isPlaying ? 'is-playing' : ''}`}
                  onClick={() => handleRowClick(word)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleRowClick(word)}
                >
                  {/* 순번 */}
                  <div className="aw-row-num">{String(originalIndex).padStart(2, '0')}</div>

                  {/* 단어 및 뜻 */}
                  <div className="aw-row-content">
                    <div className="aw-word-en">
                      {word.en}
                      <button
                        className="aw-btn-sound"
                        onClick={(e) => handlePlayAudio(e, word)}
                        aria-label={`${word.en} 발음 듣기`}
                      >
                        <Volume2 size={16} className={isPlaying ? 'sound-pulse' : ''} />
                      </button>
                    </div>
                    <div className={`aw-word-ko ${hideMeaning ? 'meaning-hidden' : ''}`}>
                      {word.ko}
                    </div>
                  </div>

                  {/* 암기 체크 토글 버튼 */}
                  <button
                    className={`aw-btn-check ${isMem ? 'checked' : ''}`}
                    onClick={(e) => handleToggleMem(e, word.id)}
                    aria-label={isMem ? '암기 해제' : '암기 완료'}
                    title={isMem ? '암기 해제' : '암기 완료 체크'}
                  >
                    {isMem ? (
                      <CheckCircle2 size={24} className="icon-checked" />
                    ) : (
                      <Circle size={24} className="icon-unchecked" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
