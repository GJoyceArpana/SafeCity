import { useState, useEffect, useRef, useCallback } from 'react';

interface SmartSOSOptions {
  enabled: boolean;
  onSOSDetected: () => void;
}

interface DetectionState {
  isCountingDown: boolean;
  countdown: number;
  detectionType: 'shake' | 'audio' | null;
}

export function useSmartSOS({ enabled, onSOSDetected }: SmartSOSOptions) {
  const [state, setState] = useState<DetectionState>({
    isCountingDown: false,
    countdown: 10,
    detectionType: null,
  });

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastShakeTimeRef = useRef<number>(0);

  // Cancel countdown
  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setState({
      isCountingDown: false,
      countdown: 10,
      detectionType: null,
    });
  };

  // Start countdown
  const startCountdown = useCallback((type: 'shake' | 'audio') => {
    // Prevent multiple countdowns
    if (state.isCountingDown) return;

    setState({
      isCountingDown: true,
      countdown: 10,
      detectionType: type,
    });

    let count = 10;
    countdownIntervalRef.current = setInterval(() => {
      count--;
      setState((prev) => ({ ...prev, countdown: count }));

      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        onSOSDetected();
        setState({
          isCountingDown: false,
          countdown: 10,
          detectionType: null,
        });
      }
    }, 1000);
  }, [state.isCountingDown, onSOSDetected]);

  // Shake detection
  useEffect(() => {
    if (!enabled) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const { x = 0, y = 0, z = 0 } = acceleration;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Detect significant shake (threshold: 20)
      if (magnitude > 20) {
        const now = Date.now();
        // Debounce: only trigger once per 2 seconds
        if (now - lastShakeTimeRef.current > 2000) {
          lastShakeTimeRef.current = now;
          console.log('🔴 Shake detected! Magnitude:', magnitude);
          startCountdown('shake');
        }
      }
    };

    // Request permission for iOS 13+
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, startCountdown]);

  // Audio spike detection
  useEffect(() => {
    if (!enabled) return;

    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let animationId: number;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        const checkAudioLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

          // Detect loud sound (threshold: 150)
          if (average > 150) {
            console.log('🔴 Loud audio detected! Level:', average);
            startCountdown('audio');
          }

          animationId = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      } catch (error) {
        console.warn('Microphone access denied or not supported:', error);
      }
    };

    initAudio();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled, startCountdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    cancelCountdown,
  };
}
