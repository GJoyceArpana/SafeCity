import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { PoliceDashboard } from './components/Police/PoliceDashboard';
import { CitizenDashboard } from './components/Citizen/CitizenDashboard';

function App() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (user?.role === 'police') {
    return <PoliceDashboard />;
  }

  return <CitizenDashboard />;
}

export default App;
