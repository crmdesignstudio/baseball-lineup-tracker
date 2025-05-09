import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Teams from './pages/Teams';
import ManageTeam from './pages/ManageTeam';
import GameManagement from './pages/GameManagement';
import Navigation from './components/Navigation';
import { useAuthStore } from './stores/authStore';
import Games from './pages/Games';
import ManageGame from './pages/ManageGame';

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Router>
      <div className="min-h-screen w-screen bg-gray-50">
        {isAuthenticated && <Navigation />}
        <main className="h-[calc(100vh-4rem)] w-screen">
          <div className="h-full w-full">
            <Routes>
              <Route
                path="/"
                element={isAuthenticated ? <Navigate to="/teams" replace /> : <Login />}
              />
              <Route
                path="/teams"
                element={isAuthenticated ? <Teams /> : <Navigate to="/" />}
              />
              <Route
                path="/teams/:teamId"
                element={isAuthenticated ? <ManageTeam /> : <Navigate to="/" />}
              />
              <Route
                path="/teams/:teamId/games"
                element={
                  isAuthenticated ? (
                    <Games />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/teams/:teamId/games/:gameId"
                element={
                  isAuthenticated ? (
                    <ManageGame />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/games"
                element={isAuthenticated ? <GameManagement /> : <Navigate to="/" />}
              />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
