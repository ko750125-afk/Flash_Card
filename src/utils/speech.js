/**
 * iOS Safari 호환 Web Speech API 유틸리티
 *
 * ⚠️ 중요: iOS Safari는 사용자 직접 제스처(탭) 없이는 음성 재생을 차단합니다.
 * 반드시 onClick / onTouchEnd 핸들러 안에서 직접 호출해야 합니다.
 * useEffect 또는 setTimeout 내부에서 호출하면 iOS에서 무음 처리됩니다.
 */
export function speak(text) {
  if (!window.speechSynthesis) return;
  // 이미 재생 중인 음성 즉시 중단
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.85;
  utter.pitch = 1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}
