
import { useState, useEffect } from 'react';

const getStorageKey = (baseKey: string): string => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${baseKey}_${today}`;
};

function getValueFromStorage<T>(key: string, initialValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return initialValue;
  }
}

export function useDailyResetLocalStorage<T>(baseKey: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storageKey, setStorageKey] = useState(() => getStorageKey(baseKey));
  const [storedValue, setStoredValue] = useState<T>(() => getValueFromStorage(storageKey, initialValue));

  // Efeito para verificar se o dia mudou
  useEffect(() => {
    const interval = setInterval(() => {
      const newKey = getStorageKey(baseKey);
      if (newKey !== storageKey) {
        setStorageKey(newKey);
        setStoredValue(getValueFromStorage(newKey, initialValue));
      }
    }, 60000); // Verifica a cada minuto

    return () => clearInterval(interval);
  }, [baseKey, storageKey, initialValue]);


  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${storageKey}”:`, error);
    }
  };

  return [storedValue, setValue];
}
