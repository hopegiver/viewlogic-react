<div className="todo-container fade-in">
  <div className="todo-header">
    <h2>Todos <small>({doneCount}/{items.length})</small></h2>
  </div>

  <form className="todo-form" onSubmit={(e) => { e.preventDefault(); onAdd(); }}>
    <input
      className="todo-input"
      value={input}
      onChange={(e) => onChange(e.target.value)}
      placeholder="할 일을 입력"
    />
    <button className="todo-button" type="submit">추가</button>
  </form>

  {items.length === 0 ? (
    <div className="todo-empty">할 일이 없습니다. 새로운 할 일을 추가해보세요!</div>
  ) : (
    <ul className="todo-list">
      {items.map((t) => (
        <li key={t.id} className="todo-item slide-up">
          <input 
            type="checkbox" 
            className="todo-checkbox"
            checked={t.done} 
            onChange={() => onToggle(t.id)} 
          />
          <span className={`todo-text ${t.done ? 'completed' : ''}`}>
            {t.text}
          </span>
          <button className="todo-delete" onClick={() => onRemove(t.id)}>삭제</button>
        </li>
      ))}
    </ul>
  )}
</div>
