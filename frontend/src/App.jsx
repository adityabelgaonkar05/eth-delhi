import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import MultiplayerGame from './components/MultiplayerGame'
import Cinema from './components/Cinema'
import Library from './components/Library'
import './App.css'

const Navigation = () => {
  const location = useLocation()
  
  return (
    <nav style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      display: 'flex',
      gap: '10px'
    }}>
      <Link 
        to="/" 
        style={{
          padding: '8px 16px',
          backgroundColor: location.pathname === '/' ? '#4CAF50' : '#333',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      >
        🏠 Main Game
      </Link>
      <Link 
        to="/cinema" 
        style={{
          padding: '8px 16px',
          backgroundColor: location.pathname === '/cinema' ? '#4CAF50' : '#333',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      >
        🎬 Cinema
      </Link>
      <Link 
        to="/library" 
        style={{
          padding: '8px 16px',
          backgroundColor: location.pathname === '/library' ? '#4CAF50' : '#333',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      >
        📚 Library
      </Link>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<MultiplayerGame />} />
          <Route path="/cinema" element={<Cinema />} />
          <Route path="/library" element={<Library />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
