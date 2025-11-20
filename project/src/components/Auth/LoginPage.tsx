import { useState } from 'react';
import { Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'police' | 'citizen'>('citizen');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, role);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#1B263B] to-[#0F1419] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00BFFF] rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Crime Prediction System</h1>
          <p className="text-gray-400">Smart City AI for Safer Communities</p>
        </div>

        <div className="bg-[#1B263B] rounded-lg shadow-2xl p-8 border border-gray-700">
          <div className="flex mb-6 bg-[#1A1A2E] rounded-lg p-1">
            <button
              type="button"
              onClick={() => setRole('citizen')}
              className={`flex-1 py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 ${
                role === 'citizen'
                  ? 'bg-[#00BFFF] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              Citizen
            </button>
            <button
              type="button"
              onClick={() => setRole('police')}
              className={`flex-1 py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 ${
                role === 'police'
                  ? 'bg-[#00BFFF] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              Police
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#1A1A2E] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#1A1A2E] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00BFFF] hover:bg-[#0099CC] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              Demo Mode: Use any email/password to login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
