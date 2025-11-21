import { useState } from 'react';
import { Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'police' | 'citizen'>('citizen');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, signup } = useAuth();

  const isSignup = mode === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signup({
          fullName,
          phone,
          email,
          password,
          role,
          ...(role === 'police' && { badgeNumber, department })
        });
      } else {
        await login(email, password, role);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
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
            {isSignup && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1A1A2E] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1A1A2E] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                {role === 'police' && (
                  <>
                    <div>
                      <label htmlFor="badgeNumber" className="block text-sm font-medium text-gray-300 mb-2">
                        Badge Number
                      </label>
                      <input
                        id="badgeNumber"
                        type="text"
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value)}
                        className="w-full px-4 py-2 bg-[#1A1A2E] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
                        placeholder="Enter badge number"
                      />
                    </div>
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-300 mb-2">
                        Department
                      </label>
                      <input
                        id="department"
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-4 py-2 bg-[#1A1A2E] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
                        placeholder="Enter department"
                      />
                    </div>
                  </>
                )}
              </>
            )}

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
                placeholder={isSignup ? 'Create a password' : 'Enter your password'}
                required
              />
            </div>

            {isSignup && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1A1A2E] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
                  placeholder="Re-enter your password"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-[#1A1A2E] border border-red-500/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00BFFF] hover:bg-[#0099CC] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isSignup ? 'Signing up...' : 'Logging in...') : isSignup ? 'Sign Up' : 'Login'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4">
            <button
              type="button"
              className="w-full py-2 text-sm text-gray-300 hover:text-white transition-colors"
              onClick={() => {
                setMode(isSignup ? 'login' : 'signup');
                setError(null);
              }}
            >
              {isSignup ? 'Already have an account? Login' : 'First time user? Create an account'}
            </button>
            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                {isSignup
                  ? 'Fill in your details to access the smart city tools.'
                  : 'Please login with your registered account to continue.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}