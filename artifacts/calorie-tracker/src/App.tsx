function App() {
  console.log('App rendered');
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Трекер здоровья 360</h1>
      <p>React работает!</p>
      <button onClick={() => alert('Клик!')}>Тестовая кнопка</button>
    </div>
  );
}

export default App;