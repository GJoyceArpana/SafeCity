import { useState, useEffect } from 'react';
import { X, AlertTriangle, MapPin, User, Phone, Battery, Shield } from 'lucide-react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { useAuth } from '../../context/AuthContext';
import { useSmartSOS } from '../../hooks/useSmartSOS';

interface SOSModalProps {
  onClose: () => void;
}

interface Guardian {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const mockGuardians: Guardian[] = [
  { id: '1', name: 'John Doe', phone: '+91 98765 43210', relationship: 'Father' },
  { id: '2', name: 'Jane Smith', phone: '+91 98765 43211', relationship: 'Mother' },
  { id: '3', name: 'Emergency Contact', phone: '100', relationship: 'Police' },
];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '12px',
};

export function SOSModal({ onClose }: SOSModalProps) {
  const { user } = useAuth();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [smartSOSEnabled, setSmartSOSEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Handle SOS Send
  const handleSendSOS = async () => {
    if (!location) {
      alert('Unable to get your location. Please enable location services.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const sosData = {
        userId: user?.id || 'anonymous',
        userEmail: user?.email,
        userName: user?.fullName,
        lat: location.lat,
        lng: location.lng,
        batteryLevel,
        timestamp: new Date().toISOString(),
        nearbyHotspots: [],
        riskIndex: 0,
      };

      const response = await fetch('http://localhost:8000/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sosData),
      });

      if (!response.ok) {
        throw new Error('Failed to send SOS');
      }

      await response.json();
      setMessage('✅ SOS sent successfully! Help is on the way.');
      
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('SOS Error:', error);
      setMessage('❌ Failed to send SOS. Please try again or call emergency services directly.');
    } finally {
      setLoading(false);
    }
  };

  // Smart SOS Detection
  const smartSOS = useSmartSOS({
    enabled: smartSOSEnabled,
    onSOSDetected: handleSendSOS,
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback to Bangalore
          setLocation({ lat: 12.9716, lng: 77.5946 });
        }
      );
    } else {
      setLocation({ lat: 12.9716, lng: 77.5946 });
    }

    // Get battery level if supported
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Smart SOS Countdown Warning */}
      {smartSOS.isCountingDown && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-[70] bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl border-2 border-white animate-pulse">
          <div className="text-center">
            <p className="text-lg font-bold">⚠️ Emergency Detected!</p>
            <p className="text-sm">
              {smartSOS.detectionType === 'shake' ? 'Shake detected' : 'Loud sound detected'}
            </p>
            <p className="text-3xl font-bold my-2">{smartSOS.countdown}</p>
            <p className="text-xs mb-3">SOS will be sent automatically</p>
            <button
              onClick={smartSOS.cancelCountdown}
              className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#1B263B] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border border-red-500/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Emergency SOS</h2>
              <p className="text-red-100 text-sm">Help will be dispatched immediately</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
              <p className="text-white text-sm">{message}</p>
            </div>
          )}

          {/* Location Map */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              Your Current Location
            </h3>
            <div className="bg-[#1A1A2E] rounded-xl overflow-hidden">
              {isLoaded && location ? (
                <GoogleMap
                  zoom={15}
                  center={location}
                  mapContainerStyle={mapContainerStyle}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                  }}
                >
                  <Marker position={location} />
                </GoogleMap>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  Loading map...
                </div>
              )}
            </div>
            {location && (
              <p className="text-gray-400 text-sm mt-2">
                📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Battery Status */}
          <div className="flex items-center gap-3 p-3 bg-[#1A1A2E] rounded-lg">
            <Battery className={`w-5 h-5 ${batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-gray-300 text-sm">Battery: {batteryLevel}%</span>
          </div>

          {/* Emergency Contacts */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Emergency Contacts
            </h3>
            <div className="space-y-2">
              {mockGuardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="flex items-center justify-between p-3 bg-[#1A1A2E] rounded-lg hover:bg-[#1A1A2E]/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{guardian.name}</p>
                      <p className="text-gray-400 text-xs">{guardian.relationship}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Phone className="w-4 h-4" />
                    {guardian.phone}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart SOS Detection Toggle */}
          <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-white font-medium text-sm">Smart SOS Detection</p>
                  <p className="text-gray-400 text-xs">Auto-trigger on shake or loud sound</p>
                </div>
              </div>
              <button
                onClick={() => setSmartSOSEnabled(!smartSOSEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  smartSOSEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    smartSOSEnabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Send SOS Button */}
          <button
            onClick={handleSendSOS}
            disabled={loading || !location}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending SOS...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Send SOS Now
              </span>
            )}
          </button>

          <p className="text-center text-gray-400 text-xs">
            By sending SOS, you agree to share your location with emergency services and registered contacts.
          </p>
        </div>
      </div>
    </div>
  );
}
