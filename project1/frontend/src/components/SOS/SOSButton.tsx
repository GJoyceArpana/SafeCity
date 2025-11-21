import { useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import { SOSModal } from './SOSModal';

export function SOSButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Floating SOS Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full shadow-2xl flex items-center justify-center group transition-all duration-300 animate-pulse hover:animate-none"
        title="Emergency SOS"
      >
        <AlertOctagon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
        
        {/* Ripple Effect */}
        <span className="absolute w-full h-full rounded-full bg-red-600 opacity-75 animate-ping"></span>
      </button>

      {/* SOS Modal */}
      {isModalOpen && (
        <SOSModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
