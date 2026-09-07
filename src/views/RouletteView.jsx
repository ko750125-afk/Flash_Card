import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Sparkles, Award, RotateCcw } from 'lucide-react';
import { playTickSound, playJackpotSound, playFailSound } from '../utils/sound';

// 정확히 6개 슬롯: 꽝 4개, 10,000원 1개, 20,000원 1개
const ROULETTE_SLOTS = [
  { id: 0, label: '꽝', sub: '다음 기회에', color: '#1a3325', textColor: 'rgba(240,235,224,0.6)', isWin: false, amount: 0 },
  { id: 1, label: '10,000원', sub: '🎉 당첨!', color: '#2e7d32', textColor: '#ffffff', isWin: true, amount: 10000 },
  { id: 2, label: '꽝', sub: '다음 기회에', color: '#162b1f', textColor: 'rgba(240,235,224,0.6)', isWin: false, amount: 0 },
  { id: 3, label: '20,000원', sub: '💰 대박 당첨!', color: '#d97706', textColor: '#ffffff', isWin: true, amount: 20000 },
  { id: 4, label: '꽝', sub: '다음 기회에', color: '#1a3325', textColor: 'rgba(240,235,224,0.6)', isWin: false, amount: 0 },
  { id: 5, label: '꽝', sub: '다음 기회에', color: '#162b1f', textColor: 'rgba(240,235,224,0.6)', isWin: false, amount: 0 },
];

const SECTOR_ANGLE = 360 / ROULETTE_SLOTS.length; // 60도

export default function RouletteView({ dayData, rewardBalance = 0, onWinReward, onHome, onBack }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [result, setResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const tickIntervalRef = useRef(null);

  const handleSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResultModal(false);
    setResult(null);

    // 1/6 동일 확률로 무작위 슬롯 인덱스 선정 (0 ~ 5)
    const targetIdx = Math.floor(Math.random() * ROULETTE_SLOTS.length);
    const selectedSlot = ROULETTE_SLOTS[targetIdx];

    // 60도 섹터의 중앙 각도 계산 (상단 12시 방향 포인터 기준)
    // 12시 포인터에 오려면 각 슬롯의 회전 오프셋을 역방향 계산
    const targetCenterAngle = 360 - (targetIdx * SECTOR_ANGLE + SECTOR_ANGLE / 2);
    const totalExtraSpins = 360 * 6; // 6바퀴 회전
    const currentBase = Math.floor(rotationDeg / 360) * 360;
    const finalAngle = currentBase + totalExtraSpins + targetCenterAngle;

    setRotationDeg(finalAngle);

    // 회전 중 틱틱 사운드
    let tickCount = 0;
    const maxTicks = 28;
    tickIntervalRef.current = setInterval(() => {
      playTickSound();
      tickCount++;
      if (tickCount >= maxTicks) {
        clearInterval(tickIntervalRef.current);
      }
    }, 150);

    // 4.5초 회전 애니메이션 종료 후 결과 판정
    setTimeout(() => {
      clearInterval(tickIntervalRef.current);
      setIsSpinning(false);
      setResult(selectedSlot);
      setShowResultModal(true);

      if (selectedSlot.isWin) {
        playJackpotSound();
        if (onWinReward && selectedSlot.amount > 0) {
          onWinReward(selectedSlot.amount);
        }
      } else {
        playFailSound();
      }
    }, 4500);
  }, [isSpinning, rotationDeg, onWinReward]);

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
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
          <div className="roulette-sub">30단어 마스터 완료 특별 보상</div>
        </div>
      </div>

      {/* ── 룰렛 본문 ── */}
      <div className="roulette-body">
        {/* 상단 안내 배너 */}
        <div className="roulette-banner">
          <Sparkles size={20} className="sparkle-icon" />
          <span>총 6개 슬롯 (1/6 동일 확률) · 10,000원 / 20,000원 / 꽝</span>
        </div>

        {/* 룰렛 휠 컨테이너 */}
        <div className="wheel-wrapper">
          {/* 상단 지시 화살표 포인터 */}
          <div className="wheel-pointer" />

          {/* 회전판 SVG */}
          <div
            className="wheel-disc"
            style={{
              transform: `rotate(${rotationDeg}deg)`,
              transition: isSpinning
                ? 'transform 4.5s cubic-bezier(0.12, 0.85, 0.15, 1)'
                : 'none',
            }}
          >
            <svg viewBox="0 0 300 300" className="wheel-svg">
              <circle cx="150" cy="150" r="148" fill="#0d2218" stroke="#f0b93b" strokeWidth="4" />
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

                return (
                  <g key={slot.id}>
                    <path
                      d={pathData}
                      fill={slot.color}
                      stroke="#f0b93b"
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
                        {slot.label}
                      </text>
                      {slot.isWin && (
                        <text
                          x="150"
                          y="68"
                          fill="#ffd700"
                          fontSize="9"
                          fontWeight="700"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          ★보상★
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
              {/* 중앙 허브 핀 */}
              <circle cx="150" cy="150" r="24" fill="#0a1a12" stroke="#f0b93b" strokeWidth="3" />
              <circle cx="150" cy="150" r="12" fill="#f0b93b" />
            </svg>
          </div>
        </div>

        {/* 룰렛 돌리기 액션 버튼 */}
        <div className="roulette-action-area">
          <button
            className={`btn-spin-wheel ${isSpinning ? 'spinning' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning}
          >
            {isSpinning ? '두근두근 회전 중...' : '🎰 룰렛 START!'}
          </button>
        </div>
      </div>

      {/* ── 당첨 결과 모달 ── */}
      {showResultModal && result && (
        <div className="roulette-modal-overlay">
          <div className={`roulette-result-card ${result.isWin ? 'win' : 'lose'}`}>
            <div className="result-icon-anim">
              {result.isWin ? '🎉 💰 🎉' : '💨 ❌ 💨'}
            </div>
            <div className="result-title">
              {result.isWin ? '축하합니다! 당첨되었습니다!' : '아쉽게도 꽝입니다!'}
            </div>
            <div className={`result-prize-box ${result.isWin ? 'win' : ''}`}>
              <div className="prize-label">룰렛 결과</div>
              <div className="prize-val">{result.label}</div>
            </div>
            {result.isWin && (
              <div className="result-total-chip">
                💰 누적 총 보상금: <strong>{(rewardBalance + result.amount).toLocaleString()}원</strong>
              </div>
            )}
            <p className="result-desc">
              {result.isWin
                ? `${result.label} 보상에 당첨되었습니다! 메인 화면의 누적 보상금에 즉시 축적되었습니다.`
                : '비록 꽝이지만 30단어를 모두 완벽하게 정복하셨습니다! 다음 DAY에서 대박을 노려보세요!'}
            </p>
            <div className="result-actions">
              <button className="btn btn-primary" onClick={onHome}>
                🏠 메인 홈으로
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowResultModal(false)}
              >
                룰렛 다시 돌려보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
