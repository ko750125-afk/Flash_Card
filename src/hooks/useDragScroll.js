import { useRef, useCallback, useState } from 'react';

/**
 * 마우스 드래그로 컨테이너를 스크롤할 수 있도록 지원하는 커스텀 훅
 * - 모바일 터치 스크롤 느낌을 PC 마우스 드래그로 구현
 * - 5px 이상 드래그 이동 시 자식 요소의 클릭 이벤트 방어
 */
export function useDragScroll() {
  const containerRef = useRef(null);
  const isDownRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const onMouseDown = useCallback((e) => {
    // 우클릭 또는 대화형 폼/버튼 클릭 제외
    if (e.button !== 0) return;
    if (e.target.closest('button, a, input, textarea, select')) return;

    const container = containerRef.current;
    if (!container) return;

    isDownRef.current = true;
    hasDraggedRef.current = false;
    startYRef.current = e.pageY - container.offsetTop;
    scrollTopRef.current = container.scrollTop;
    setIsGrabbing(true);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDownRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();
    const y = e.pageY - container.offsetTop;
    const walk = (y - startYRef.current) * 1.5; // 스크롤 민감도 배수

    if (Math.abs(y - startYRef.current) > 5) {
      hasDraggedRef.current = true;
    }

    container.scrollTop = scrollTopRef.current - walk;
  }, []);

  const onMouseUp = useCallback(() => {
    isDownRef.current = false;
    setIsGrabbing(false);
    // 약간의 딜레이 후 hasDragged 초기화하여 클릭 캡처 방어 유지
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (isDownRef.current) {
      isDownRef.current = false;
      setIsGrabbing(false);
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 50);
    }
  }, []);

  // 드래그 후 발생하는 클릭 이벤트 차단 핸들러
  const onClickCapture = useCallback((e) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return {
    containerRef,
    isGrabbing,
    events: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onClickCapture,
    },
    hasDraggedRef,
  };
}
