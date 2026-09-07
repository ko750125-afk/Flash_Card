/* ────────────────────────────────────────────────────
   sound.js — Web Audio API 기반 청량한 효과음
   - 외부 파일 다운로드 딜레이 없이 0ms 즉시 재생
   - iOS Safari / Android / PC 완벽 호환
──────────────────────────────────────────────────── */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 암기완료 시 재생되는 맑고 청량한 3단 실로폰 차임벨 사운드 (도-미-솔)
 */
export function playMemorizedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 밝고 맑은 3단 상승 멜로디 주파수 (G5 -> C6 -> E6)
    const notes = [
      { freq: 783.99, delay: 0.0,  duration: 0.18 }, // Sol
      { freq: 1046.50, delay: 0.08, duration: 0.22 }, // Do
      { freq: 1318.51, delay: 0.16, duration: 0.35 }, // Mi
    ];

    notes.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine'; // 부드러운 사인파 톤
      osc.frequency.setValueAtTime(freq, now + delay);

      // 청량하고 자연스러운 어택과 지수 감쇠(Decay)
      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
  } catch (e) {
    console.warn('Sound play failed:', e);
  }
}
