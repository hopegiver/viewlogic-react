// import 없이 전역 React 사용
export default function useLogic() {
    const { useState, useMemo, useCallback } = React;
  
    const [items, setItems] = useState([
      { id: "1", text: "예제 읽기", done: true },
      { id: "2", text: "할 일 추가", done: false },
    ]);
    const [input, setInput] = useState("");
  
    const onChange = useCallback((v) => setInput(v), []);
    const onAdd = useCallback(() => {
      const text = input.trim();
      if (!text) return;
      setItems((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
      setInput("");
    }, [input]);
  
    const onToggle = useCallback((id) => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    }, []);
  
    const onRemove = useCallback((id) => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, []);
  
    const doneCount = useMemo(() => items.filter((t) => t.done).length, [items]);
  
    return { items, input, onChange, onAdd, onToggle, onRemove, doneCount };
  }
  