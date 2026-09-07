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
    const notes = [
      { freq: 783.99, delay: 0.0,  duration: 0.18 }, // Sol
      { freq: 1046.50, delay: 0.08, duration: 0.22 }, // Do
      { freq: 1318.51, delay: 0.16, duration: 0.35 }, // Mi
    ];

    notes.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

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

/**
 * 퀴즈 정답 시 재생되는 경쾌하고 시원한 딩동댕 차임 사운드
 */
export function playCorrectSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 도(523.25) -> 솔(783.99) -> 높은도(1046.50) 빠른 3단 경쾌음
    const notes = [
      { freq: 523.25, delay: 0.0,  duration: 0.12 },
      { freq: 783.99, delay: 0.07, duration: 0.14 },
      { freq: 1046.50, delay: 0.14, duration: 0.28 },
    ];

    notes.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // 맑고 통통 튀는 음색
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.22, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
  } catch (e) {
    console.warn('Correct sound failed:', e);
  }
}

/**
 * 퀴즈 오답 시 재생되는 둔탁하고 낮은 부저 사운드 (띡-띡)
 */
export function playWrongSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth'; // 거칠고 직관적인 부저음
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('Wrong sound failed:', e);
  }
}

/**
 * 룰렛 돌아갈 때 찰칵거리는 래칫 틱 사운드
 */
export function playTickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {
    console.warn('Tick sound failed:', e);
  }
}

/**
 * 룰렛 상금 당첨 시 팡파레 사운드
 */
export function playJackpotSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const fanfare = [
      { freq: 523.25, delay: 0.0,  dur: 0.12 }, // C5
      { freq: 659.25, delay: 0.12, dur: 0.12 }, // E5
      { freq: 783.99, delay: 0.24, dur: 0.12 }, // G5
      { freq: 1046.50, delay: 0.36, dur: 0.45 }, // C6
      { freq: 1318.51, delay: 0.50, dur: 0.60 }, // E6
    ];

    fanfare.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  } catch (e) {
    console.warn('Jackpot sound failed:', e);
  }
}

/**
 * 룰렛 꽝 나왔을 때 사운드
 */
export function playFailSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 440.00, delay: 0.0,  dur: 0.2 }, // A4
      { freq: 415.30, delay: 0.18, dur: 0.2 }, // G#4
      { freq: 392.00, delay: 0.36, dur: 0.4 }, // G4
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.15, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  } catch (e) {
    console.warn('Fail sound failed:', e);
  }
}
