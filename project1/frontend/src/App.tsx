import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { PoliceDashboard } from './components/Police/PoliceDashboard';
import { CitizenDashboard } from './components/Citizen/CitizenDashboard';
import { ChatWidget } from './components/Chat/ChatWidget';

function App() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      {user?.role === 'police' ? <PoliceDashboard /> : <CitizenDashboard />}
      <ChatWidget />
    </>
  );
}

export default App;
