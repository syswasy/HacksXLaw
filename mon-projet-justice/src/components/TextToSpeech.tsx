import { useState, useRef } from 'react';

interface TextToSpeechProps {
  text: string;
  language?: string;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  disabled?: boolean;
}

export function TextToSpeech({ 
  text, 
  language = 'fr-CA',
  onSpeakStart,
  onSpeakEnd,
  disabled = false 
}: TextToSpeechProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cleanText = (str: string) => {
    return str.replace(/[#*_\[\]()]/g, '');
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText(text));
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      onSpeakStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      onSpeakEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    onSpeakEnd?.();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
      <button
        onClick={handleSpeak}
        disabled={disabled || !text}
        title={isSpeaking ? (isPaused ? 'Reprendre' : 'Mettre en pause') : 'Lire à voix haute'}
        style={{
          padding: '10px 20px',
          backgroundColor: isSpeaking ? '#f59e0b' : '#3182ce',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: disabled || !text ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '0.95rem',
          opacity: disabled || !text ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
      >
        {isSpeaking ? (isPaused ? '> Reprendre' : '|| Pause') : '[LISTEN] Ecouter'}
      </button>

      {isSpeaking && (
        <button
          onClick={handleStop}
          title="Arrêter la lecture"
          style={{
            padding: '10px 20px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.95rem',
          }}
        >
          [STOP] Arrêter
        </button>
      )}

      <div style={{ fontSize: '0.85rem', color: '#718096', padding: '10px 15px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
        {isSpeaking ? (isPaused ? '|| En pause...' : '[LISTEN] Lecture en cours...') : 'Cliquez sur "Ecouter" pour entendre les recommandations'}
      </div>
    </div>
  );
}

export function TextWithHighlight({ 
  text, 
  isSpeaking 
}: { 
  text: string;
  isSpeaking: boolean;
}) {
  const lines = text.split('\n');

  return (
    <div style={{ 
      lineHeight: '1.8',
      whiteSpace: 'pre-wrap',
      color: '#2d3748',
      fontSize: '1rem',
    }}>
      {lines.map((line, idx) => (
        <div
          key={idx}
          style={{
            padding: '4px 8px',
            marginBottom: '4px',
            backgroundColor: isSpeaking ? 'rgba(241, 196, 15, 0.2)' : 'transparent',
            borderLeft: isSpeaking ? '3px solid #f1c40f' : 'none',
            transition: 'all 0.1s ease-out',
          }}
        >
          {line || ' '}
        </div>
      ))}
    </div>
  );
}
