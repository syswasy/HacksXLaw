import { useState } from 'react';

interface VoiceRecorderProps {
  onTranscriptionDone: (text: string) => void;
}

export function VoiceRecorder({ onTranscriptionDone }: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fr-CA'; // Français québécois

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscriptionDone(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  }

  const toggleListen = () => {
    if (!recognition) return alert("Navigateur non compatible");
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <button
      onClick={toggleListen}
      type="button"
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        border: '1px solid #dcdde1',
        backgroundColor: isListening ? '#ff4757' : '#f1f2f6',
        color: isListening ? 'white' : '#2f3542',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: 'bold',
        marginBottom: '10px',
        transition: 'all 0.2s'
      }}
    >
      {isListening ? '🛑 Stop' : '🎤 Utiliser ma voix'}
    </button>
  );
}