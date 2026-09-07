import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Sparkles, Award, RotateCcw } from 'lucide-react';
import { playTickSound, playJackpotSound, playFailSound } from '../utils/sound';

// 정확히 6개 슬롯: 1천원 / 만원 / 꽝 / 2만원 / 꽝 / 2천원
const ROULETTE_SLOTS = [
  { id: 0, label: '1,000원', sub: '🎉 당첨!', color: '#164e33', textColor: '#ffffff', isWin: true, amount: 1000 },
  { id: 1, label: '10,000원', sub: '🎉 대박 당첨!', color: '#2d6a4f', textColor: '#ffffff', isWin: true, amount: 10000 },
  { id: 2, label: '꽝', sub: '다음 기회에', color: '#14261c', textColor: 'rgba(240,235,224,0.6)', isWin: false, amount: 0 },
  { id: 3, label: '20,000원', sub: '💰 잭팟 당첨!', color: '#d97706', textColor: '#ffffff', isWin: true, amount: 20000 },
  { id: 4, label: '꽝', sub: '다음 기회에', color: '#14261c', textColor: 'rgba(240,235,224,0.6)', isWin: false, amount: 0 },
  { id: 5, label: '2,000원', sub: '🎉 당첨!', color: '#1e5438', textColor: '#ffffff', isWin: true, amount: 2000 },
];

const SECTOR_ANGLE = 360 / ROULETTE_SLOTS.length; // 60도
const SPIN_DURATION_MS = 7500; // 7.5초 (충분히 길고 실감나는 감속)

export default function RouletteView({ dayData, rewardBalance = 0, onWinReward, onHome, onBack }) {
  // 짝맞추기 1분 미만(59.9초 이하) 달성으로 인한 2배 찬스 여부 확인
  const isDoubleChance = useMemo(() => {
    try {
      const hasDoubleFlag = localStorage.getItem(`fc_double_reward_${dayData.key}`) === 'true';
      const bestScore = localStorage.getItem(`fc_best_match_${dayData.key}`);
      const isFastRecord = bestScore ? Number(bestScore) < 60000 : false;
      return hasDoubleFlag || isFastRecord;
    } catch {
      return false;
    }
  }, [dayData.key]);

  // 룰렛 1회 완료 여부 확인 (테스트 모드: 무제한 허용)
  const isRouletteUsed = false; // [테스트 모드] 대표님 테스트를 위해 무제한 허용

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [result, setResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const soundTimerRef = useRef(null);

  const handleSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResultModal(false);
    setResult(null);

    // 1/6 동일 확률로 무작위 슬롯 인덱스 선정 (0 ~ 5)
    const targetIdx = Math.floor(Math.random() * ROULETTE_SLOTS.length);
    const selectedSlot = ROULETTE_SLOTS[targetIdx];

    // 60도 섹터의 중앙 각도 계산 (상단 12시 방향 포인터 기준)
    const targetCenterAngle = 360 - (targetIdx * SECTOR_ANGLE + SECTOR_ANGLE / 2);
    const totalExtraSpins = 360 * 10; // 10바퀴 시원하고 긴 회전
    const currentBase = Math.floor(rotationDeg / 360) * 360;
    const finalAngle = currentBase + totalExtraSpins + targetCenterAngle;

    setRotationDeg(finalAngle);

    // 가속 -> 고속 -> 서서히 감속(Deceleration)하는 실감나는 틱 사운드 시뮬레이션
    const spinStartTime = Date.now();
    const scheduleNextTick = () => {
      const elapsed = Date.now() - spinStartTime;
      if (elapsed >= SPIN_DURATION_MS - 200) return;

      playTickSound();

      // 경과 시간(0 ~ 7.5초)에 따라 틱 간격을 80ms에서 650ms까지 지수/점진적으로 증가
      const progress = elapsed / SPIN_DURATION_MS; // 0.0 ~ 1.0
      let nextDelay;
      if (progress < 0.4) {
        nextDelay = 75 + progress * 80; // 75ms ~ 107ms (초고속 틱틱틱)
      } else if (progress < 0.7) {
        nextDelay = 110 + Math.pow(progress - 0.4, 1.8) * 600; // 110ms ~ 230ms (점진 감속)
      } else if (progress < 0.9) {
        nextDelay = 240 + Math.pow(progress - 0.7, 1.5) * 1200; // 240ms ~ 450ms (느려짐)
      } else {
        nextDelay = 460 + Math.pow(progress - 0.9, 1.2) * 2000; // 460ms ~ 650ms (마지막 틱... 틱.....)
      }

      soundTimerRef.current = setTimeout(scheduleNextTick, Math.min(nextDelay, 680));
    };

    scheduleNextTick();

    // 7.5초 회전 애니메이션 종료 후 결과 판정
    setTimeout(() => {
      if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
      setIsSpinning(false);
      setResult(selectedSlot);
      setShowResultModal(true);

      if (selectedSlot.isWin) {
        playJackpotSound();
        if (onWinReward && selectedSlot.amount > 0) {
          const payoutAmount = isDoubleChance ? selectedSlot.amount * 2 : selectedSlot.amount;
          onWinReward(payoutAmount);
        }
      } else {
        playFailSound();
      }
    }, SPIN_DURATION_MS);
  }, [isSpinning, rotationDeg, onWinReward, isDoubleChance]);

  useEffect(() => {
    return () => {
      if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
    };
  }, []);

  return (
    <div className="view-container roulette-view">
      {/* ── 헤더 ── */}
      <div className="roulette-header">
        <button className="btn-icon" onClick={onBack} aria-label="뒤로가기" disabled={isSpinning}>
          <ChevronLeft size={20} />
        </button>
        <div className="roulette-hdr-info">
          <div className="roulette-title">🎁 {dayData.label} 행운의 룰렛</div>
          <div className="roulette-sub">30단어 마스터 완료 특별 보상 (DAY당 1회 한정)</div>
        </div>
      </div>

      {/* ── 룰렛 본문 ── */}
      <div className="roulette-body">
        {/* 상단 안내 배너 (2배 찬스 발동 시 불꽃 강조) */}
        {isRouletteUsed && !isSpinning ? (
          <div className="roulette-banner" style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }}>
            <span>✅ {dayData.label} 보상 룰렛 참여가 완료되었습니다 (기회 종료)</span>
          </div>
        ) : isDoubleChance ? (
          <div className="roulette-banner double-active">
            <span className="flame-icon">🔥</span>
            <span><strong>[보상금 2배 찬스 발동]</strong> 짝맞추기 59초대 클리어 특전! (1만→2만 / 2만→4만)</span>
            <span className="flame-icon">🔥</span>
          </div>
        ) : (
          <div className="roulette-banner">
            <Sparkles size={20} className="sparkle-icon" />
            <span>총 6개 슬롯 · 1천원/만원/2만원/2천원/꽝 (1회 한정 기회!)</span>
          </div>
        )}

        {/* 룰렛 휠 컨테이너 */}
        <div className={`wheel-wrapper ${isDoubleChance && !isRouletteUsed ? 'double-glow' : ''}`}>
          {/* 상단 지시 화살표 포인터 */}
          <div className="wheel-pointer" />

          {/* 회전판 SVG */}
          <div
            className="wheel-disc"
            style={{
              transform: `rotate(${rotationDeg}deg)`,
              transition: isSpinning
                ? 'transform 7.5s cubic-bezier(0.12, 0.98, 0.22, 1)'
                : 'none',
            }}
          >
            <svg viewBox="0 0 300 300" className="wheel-svg">
              <circle cx="150" cy="150" r="148" fill="#0d2218" stroke={isDoubleChance ? "#ff9800" : "#f0b93b"} strokeWidth="4" />
              {ROULETTE_SLOTS.map((slot, i) => {
                const angle = i * 60;
                const startAngle = (angle - 90) * (Math.PI / 180);
                const endAngle = (angle + 60 - 90) * (Math.PI / 180);

                const x1 = 150 + 144 * Math.cos(startAngle);
                const y1 = 150 + 144 * Math.sin(startAngle);
                const x2 = 150 + 144 * Math.cos(endAngle);
                const y2 = 150 + 144 * Math.sin(endAngle);

                const pathData = `M 150 150 L ${x1} ${y1} A 144 144 0 0 1 ${x2} ${y2} Z`;

                // 텍스트 위치 (섹터 중앙)
                const textAngle = angle + 30;

                // 2배 찬스 적용 시 슬롯 표기 금액 2배로 표시
                const displayLabel = slot.isWin && isDoubleChance
                  ? `${(slot.amount * 2).toLocaleString()}원`
                  : slot.label;

                return (
                  <g key={slot.id}>
                    <path
                      d={pathData}
                      fill={slot.color}
                      stroke={isDoubleChance ? "#ff9800" : "#f0b93b"}
                      strokeWidth="1.5"
                    />
                    <g transform={`rotate(${textAngle}, 150, 150)`}>
                      <text
                        x="150"
                        y="48"
                        fill={slot.textColor}
                        fontSize={slot.isWin ? "14" : "16"}
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {displayLabel}
                      </text>
                      {slot.isWin && (
                        <text
                          x="150"
                          y="68"
                          fill={isDoubleChance ? "#ffeb3b" : "#ffd700"}
                          fontSize="9"
                          fontWeight="800"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {isDoubleChance ? "★2배대박★" : "★보상★"}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
              {/* 중앙 허브 핀 */}
              <circle cx="150" cy="150" r="24" fill="#0a1a12" stroke={isDoubleChance ? "#ff9800" : "#f0b93b"} strokeWidth="3" />
              <circle cx="150" cy="150" r="12" fill={isDoubleChance ? "#ff9800" : "#f0b93b"} />
            </svg>
          </div>
        </div>

        {/* 룰렛 돌리기 액션 버튼 */}
        <div className="roulette-action-area">
          <button
            className={`btn-spin-wheel ${isSpinning ? 'spinning' : ''} ${isDoubleChance && !isRouletteUsed ? 'double-btn' : ''} ${isRouletteUsed ? 'disabled' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning || isRouletteUsed}
          >
            {isSpinning
              ? '두근두근 회전 중...'
              : isRouletteUsed
                ? '✅ 룰렛 보상 참여 완료 (종료)'
                : isDoubleChance
                  ? '🔥 2배 찬스 룰렛 START!'
                  : '🎰 룰렛 START! (1회 한정)'}
          </button>
        </div>
      </div>

      {/* ── 당첨 결과 모달 ── */}
      {showResultModal && result && (
        <div className="roulette-modal-overlay">
          <div className={`roulette-result-card ${result.isWin ? 'win' : 'lose'}`}>
            <div className="result-icon-anim">
              {result.isWin ? (isDoubleChance ? '🔥 👑 💰 👑 🔥' : '🎉 💰 🎉') : '💨 ❌ 💨'}
            </div>

            {result.isWin && isDoubleChance && (
              <div className="double-win-badge">
                🔥 짝맞추기 59초대 클리어 2배 보너스 적용! 🔥
              </div>
            )}

            <div className="result-title">
              {result.isWin ? '축하합니다! 당첨되었습니다!' : '아쉽게도 꽝입니다!'}
            </div>

            <div className={`result-prize-box ${result.isWin ? 'win' : ''}`}>
              <div className="prize-label">룰렛 결과 (1회 완료)</div>
              <div className="prize-val">
                {result.isWin && isDoubleChance
                  ? `${(result.amount * 2).toLocaleString()}원 (2배!)`
                  : result.label}
              </div>
            </div>

            {result.isWin && (
              <div className="result-total-chip">
                💰 누적 총 보상금: <strong>{(rewardBalance + (isDoubleChance ? result.amount * 2 : result.amount)).toLocaleString()}원</strong>
              </div>
            )}

            <p className="result-desc">
              {result.isWin
                ? isDoubleChance
                  ? `59초대 클리어 특전으로 2배인 ${(result.amount * 2).toLocaleString()}원이 메인 누적 보상금에 즉시 적립되었습니다!`
                  : `${result.label} 보상에 당첨되었습니다! 메인 화면의 누적 보상금에 즉시 축적되었습니다.`
                : '비록 꽝이지만 30단어를 모두 완벽하게 정복하셨습니다! 다음 DAY에서 대박을 노려보세요!'}
            </p>
            <div className="result-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowResultModal(false)}
              >
                🎰 룰렛 다시 돌려보기
              </button>
              <button className="btn btn-ghost" onClick={onHome}>
                🏠 메인 홈으로
              </button>
              <button
                className="btn btn-ghost"
                onClick={onBack}
              >
                세트 목록으로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
