import { useState, useCallback } from 'react';

/**
 * localStorage에 영속되는 Set 훅
 * @param {string} storageKey - localStorage 키
 */
export function useLocalSet(storageKey) {
  const [set, setSet] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  /** 항목 토글 (있으면 제거, 없으면 추가) */
  const toggle = useCallback((id) => {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }, [storageKey]);

  /** 여러 항목 일괄 추가 */
  const addMany = useCallback((ids) => {
    setSet(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }, [storageKey]);

  /** 전체 교체 (백업 복원용) */
  const replaceSet = useCallback((items) => {
    const next = new Set(items || []);
    setSet(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  }, [storageKey]);

  /** 전체 초기화 */
  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSet(new Set());
  }, [storageKey]);

  return { set, toggle, addMany, replaceSet, clear };
}
