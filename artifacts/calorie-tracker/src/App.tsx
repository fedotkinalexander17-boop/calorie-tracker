function App() {
  console.log('App rendering');
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Трекер здоровья 360</h1>
      <p>React работает! Clerk временно отключён.</p>
      <button onClick={() => alert('Тестовая кнопка')} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Нажми меня
      </button>
    </div>
  );
}

export default App;