import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  Volume1,
  VolumeX,
  Download,
  Play,
  Pause,
  Clock,
  Trash2,
  Sparkles,
  Layers,
  FileAudio,
  AlertCircle,
  RefreshCw,
  Info
} from "lucide-react";
import { AudioHistoryItem, VoiceOption } from "./types";

const VOICES: VoiceOption[] = [
  {
    id: "Kore",
    name: "Kore",
    description: "Sauti safi, changamfu na ya kusisimua. Ni nzuri kwa maangazio na ujumbe wa kijamii.",
    gender: "Kike",
    tag: "Mchangamfu",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    description: "Sauti tulivu, yenye ufasaha mwingi na inayovutia kusikiliza. Inafaa sana kwa mafunzo.",
    gender: "Kiume",
    tag: "Tulivu",
  },
  {
    id: "Puck",
    name: "Puck",
    description: "Sauti nyepesi, ya kitoto au ya ucheshi inayoleta hisia ya hadithi na michezo.",
    gender: "Kike",
    tag: "Playful",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    description: "Sauti thabiti, ya kiume na yenye mamlaka. Inafaa sana kwa hotuba au matangazo rasmi.",
    gender: "Kiume",
    tag: "Nguvu/Nzito",
  },
  {
    id: "Charon",
    name: "Charon",
    description: "Sauti nzito, yenye umakini wa hali ya juu na inayojaza chumba kwa sauti yenye mamlaka makubwa.",
    gender: "Kiume",
    tag: "Nzito Zaidi",
  },
];

const PRESETS = [
  {
    label: "Karibu",
    text: "Jambo! Karibu kwenye mtafsiri wako wa maandishi kuwa sauti ya MP3. Andika neno lolote hapa na nitakusomea kwa ufasaha.",
  },
  {
    label: "Kuhusu Kiswahili",
    text: "Lugha ya Kiswahili ni tamu sana inaponenwa kwa ufasaha. Ni lugha inayowaunganisha watu kwa upendo, mshikamano, na udugu mkuu.",
  },
  {
    label: "Akili Mnemba (AI)",
    text: "Sauti hii inazalishwa kwa kutumia teknolojia ya kisasa kabisa ya akili mnemba ya Gemini ya Google, kisha inabadilishwa kuwa faili la MP3.",
  },
  {
    label: "Hadithi Fupi",
    text: "Hapo zamani za kale, sungura mwerevu aliamua kufanya urafiki na simba mwenye nguvu ili kulinda familia yake. Hata hivyo, mambo hayakuwa rahisi kama alivyofikiria.",
  },
];

export default function App() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Audio Player State
  const [currentAudio, setCurrentAudio] = useState<{
    base64: string;
    text: string;
    voiceName: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tts_player_volume");
      return saved ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tts_player_muted");
      return saved === "true";
    } catch {
      return false;
    }
  });
  
  // History State
  const [history, setHistory] = useState<AudioHistoryItem[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tts_mp3_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load local history", e);
    }
  }, []);

  // Sync history to localStorage
  const saveHistory = (newHistory: AudioHistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("tts_mp3_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save local history", e);
    }
  };

  // Setup Audio Handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setCurrentTime(0);
      setProgress(0);
      audio.playbackRate = playbackSpeed;
      audio.volume = isMuted ? 0 : volume;
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress(0);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentAudio, volume, isMuted, playbackSpeed]);

  // Sync playback speed, volume & mute states
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    try {
      localStorage.setItem("tts_player_volume", volume.toString());
      localStorage.setItem("tts_player_muted", isMuted.toString());
    } catch (e) {
      console.error("Failed to save volume settings to localStorage", e);
    }
  }, [playbackSpeed, volume, isMuted, currentAudio]);

  // Handle Play/Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error("Failed to play audio", err);
      });
    }
  };

  // Seeker change
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const seekPercent = parseFloat(e.target.value);
    const newTime = (seekPercent / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(seekPercent);
  };

  // Generate TTS
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!text.trim()) {
      setError("Tafadhali weka maandishi hapa kabla ya kugeuza.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // If currently playing, pause it
    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: selectedVoice,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Mchakato wa kutengeneza sauti umefeli.");
      }

      const base64Audio = data.audioBase64;
      
      // Update running active audio
      setCurrentAudio({
        base64: base64Audio,
        text: text.trim(),
        voiceName: selectedVoice,
      });

      // Save to History
      const historyItem: AudioHistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        text: text.trim(),
        voice: selectedVoice,
        timestamp: new Date().toLocaleTimeString("sw-TZ", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
        audioBase64: base64Audio,
      };

      saveHistory([historyItem, ...history]);

      // Auto-start playing the new audio
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((err) => console.log("Auto-play blocked", err));
        }
      }, 150);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Imefeli kuungana na seva. Thibitisha kuwa GEMINI_API_KEY imewekwa.");
    } finally {
      setIsLoading(false);
    }
  };

  // Play history item
  const handlePlayHistory = (item: AudioHistoryItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentAudio({
      base64: item.audioBase64,
      text: item.text,
      voiceName: item.voice,
    });
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.log("Play failed", err));
      }
    }, 150);
  };

  // Delete history item
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
  };

  // Clear all history
  const handleClearHistory = () => {
    if (confirm("Je, una uhakika unataka kufuta historia yote ya sauti zilizorekodiwa?")) {
      saveHistory([]);
    }
  };

  // Trigger download of standard base64 MP3
  const downloadAudio = (audioBase64: string, customText: string) => {
    const sliceText = customText.slice(0, 20).replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "sauti";
    const link = document.createElement("a");
    link.href = `data:audio/mp3;base64,${audioBase64}`;
    link.download = `${sliceText}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preset click
  const handlePresetClick = (presetText: string) => {
    setText(presetText);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const textCount = text.length;
  const maxChars = 1000;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans pb-16 selection:bg-[#d4af37] selection:text-black">
      {/* Invisible Audio Element */}
      {currentAudio && (
        <audio
          ref={audioRef}
          src={`data:audio/mp3;base64,${currentAudio.base64}`}
          preload="auto"
        />
      )}

      {/* Header Banner */}
      <header className="sticky top-0 z-40 bg-[#050505]/85 backdrop-blur-md border-b border-zinc-900">
        <div className="w-full max-w-5xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#d4af37] to-[#f7df93] rounded-xl text-black shadow-lg shadow-amber-500/10">
              <Volume2 className="h-6 w-6" id="header-logo-icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-serif italic text-white tracking-tight" id="header-title">
                  Sauti-Tech
                </h1>
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-[#d4af37] px-2 py-0.5 rounded font-mono">v3.1</span>
              </div>
              <p className="text-xs text-zinc-500 font-sans tracking-wide mt-0.5" id="header-subtitle">
                Mfumo wa siri na wa kifahari wa kugeuza maandishi kuwa sauti ya MP3
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[11px] bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-400 font-mono">
            <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Ubora wa Sauti ya MP3</span>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="w-full max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Section: Creation and Custom Controls (7 Cols) */}
        <div className="md:col-span-7 flex flex-col gap-8">
          
          {/* Main Interface Box */}
          <div className="glass rounded-2xl p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden">
            <label className="absolute -top-3 left-6 px-2.5 bg-[#050505] text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Andika Maandishi Yako
            </label>
            
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5 mt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <FileAudio className="h-4 w-4 text-[#d4af37]" />
                Kiswahili Sanifu
              </h2>
              <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                Letas: {textCount}/{maxChars}
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-950/45 border border-rose-900/60 text-rose-300 text-xs p-4 rounded-xl flex items-start gap-2.5"
                id="error-banner"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-200">Hitilafu imetokea</p>
                  <p className="text-rose-450 mt-0.5 font-sans leading-normal">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Custom Interactive Text Form */}
            <form onSubmit={handleGenerate} className="flex flex-col gap-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                placeholder="Anza kuandika hapa ili kugeuza kuwa sauti ya kusisimua... (Mfano: Karibu kwenye mfumo wetu wa Sauti-Tech. Tuna uwezo wa kugeuza maneno kuwa sauti ya asili kabisa!)"
                className="w-full min-h-[180px] max-h-[300px] p-4 text-[16px] leading-relaxed bg-zinc-900/40 border border-zinc-800/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d4af37]/35 focus:border-[#d4af37] transition-all placeholder:text-zinc-700 text-zinc-200 font-sans"
                maxLength={maxChars}
                disabled={isLoading}
                id="text-input"
              />

              {/* Quick Swahili Presets */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 select-none">
                  <Layers className="h-3.5 w-3.5 text-[#d4af37]" />
                  Mifano ya haraka ya kubofya:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handlePresetClick(preset.text)}
                      className="text-xs bg-zinc-900/60 hover:bg-[#d4af37]/10 hover:text-white border border-zinc-800 hover:border-[#d4af37]/40 px-3 py-1.5 rounded-lg text-zinc-400 transition-all cursor-pointer font-sans"
                      id={`preset-btn-${index}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Execution Trigger */}
              <div className="flex pt-4 border-t border-zinc-900 mt-2">
                <button
                  type="submit"
                  disabled={isLoading || !text.trim()}
                  className={`w-full py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl transition-all ${
                    isLoading
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
                      : !text.trim()
                      ? "bg-zinc-900 text-zinc-650 border border-zinc-800 text-zinc-600 shadow-none cursor-not-allowed"
                      : "accent-gradient text-black hover:brightness-110 shadow-amber-500/5 active:scale-[0.98] cursor-pointer"
                  }`}
                  id="action-generate-btn"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Kugeuza kuwa sauti...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Volume2 className="h-4 w-4 stroke-[2.5]" />
                      <span>Tengeneza Sauti & MP3</span>
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Premium Audio Player Control Center */}
          <AnimatePresence mode="wait">
            {currentAudio ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                className="glass-premium rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-[#d4af37]/35 relative overflow-hidden"
                id="active-player-card"
              >
                {/* Glowing light ornament */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <Volume2 className="h-5 w-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-950/80 px-2 py-0.5 rounded-full border border-zinc-850 inline-block mb-1">
                        Inacheza
                      </span>
                      <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                        <span>Mtindo wa sasa: <span className="text-[#d4af37]">{currentAudio.voiceName}</span></span>
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadAudio(currentAudio.base64, currentAudio.text)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl text-white transition-all flex items-center justify-center gap-1.5 text-xs font-semibold border border-zinc-800"
                    title="Pakua MP3"
                    id="player-download-btn"
                  >
                    <Download className="h-4 w-4 text-[#d4af37]" />
                    <span>Pakua MP3</span>
                  </button>
                </div>

                {/* Subtitle preview of text read */}
                <div className="p-3.5 bg-zinc-950/70 rounded-xl border border-zinc-900 text-sm leading-relaxed max-h-[110px] overflow-y-auto text-zinc-300 font-sans italic">
                  &ldquo;{currentAudio.text}&rdquo;
                </div>

                {/* Seeker slider */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={handleSeekChange}
                      className="w-full h-1 bg-zinc-800 rounded-lg cursor-pointer transition-all accent-[#d4af37]"
                      id="player-seekbar"
                    />
                  </div>
                </div>

                {/* Control Action block: Play/Pause na Kasi ya sauti / Volume slider */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-zinc-800/80">
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    {/* Playback Speed option Buttons */}
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kasi ya Sauti:</span>
                      <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                        {[0.5, 1.0, 1.5].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                              playbackSpeed === speed
                                ? "bg-gradient-to-r from-[#d4af37] to-[#f9e39e] text-black shadow-sm"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            }`}
                            id={`speed-btn-${speed}`}
                          >
                            {speed === 1.0 ? "1.0x" : `${speed}x`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volume Slider element */}
                    <div className="flex items-center justify-between sm:justify-start gap-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kiasi cha Sauti:</span>
                      <div className="flex items-center gap-2 bg-zinc-950 p-1 px-2.5 py-1.5 rounded-lg border border-zinc-850 w-[172px]">
                        <button
                          type="button"
                          onClick={() => setIsMuted(prev => !prev)}
                          className="text-zinc-400 hover:text-[#d4af37] transition-all cursor-pointer flex items-center justify-center shrink-0"
                          id="player-volume-mute-btn"
                          title={isMuted ? "Washa sauti (Unmute)" : "Zima sauti (Mute)"}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-4 w-4 text-rose-500" />
                          ) : volume < 0.4 ? (
                            <Volume1 className="h-4 w-4 text-[#d4af37]" />
                          ) : (
                            <Volume2 className="h-4 w-4 text-[#d4af37]" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            if (val > 0) {
                              setIsMuted(false);
                            }
                          }}
                          className="w-18 h-1 bg-zinc-805 bg-zinc-800 rounded-lg cursor-pointer transition-all accent-[#d4af37]"
                          id="player-volume-slider"
                        />
                        <span className="text-[10px] font-mono text-zinc-400 w-8 text-right shrink-0">
                          {Math.round((isMuted ? 0 : volume) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={togglePlay}
                    className="h-14 w-14 bg-gradient-to-r from-[#d4af37] to-[#f9e39e] text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer shrink-0"
                    id="player-play-toggle"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 fill-black stroke-none" />
                    ) : (
                      <Play className="h-6 w-6 fill-black stroke-none ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Active audio visualizer animation (Golden style) */}
                {isPlaying && (
                  <div className="flex items-center justify-center gap-[4px] h-4 mt-2 select-none pointer-events-none">
                    {[...Array(14)].map((_, i) => (
                      <span
                        key={i}
                        className="w-[3px] bg-[#d4af37] rounded-full animate-pulse"
                        style={{
                          height: `${Math.floor(Math.random() * 100) + 20}%`,
                          animationDuration: `${0.6 + i * 0.08}s`
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-zinc-900/10 border border-dashed border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 py-12 flex flex-col items-center justify-center gap-3">
                <Volume2 className="h-10 w-10 text-zinc-800 animate-pulse" />
                <div className="max-w-xs">
                  <p className="font-semibold text-zinc-400 text-sm">Hakuna Sauti Inayocheza</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Bofya kitufe cha <strong>&quot;Tengeneza Sauti & MP3&quot;</strong> hapo juu ili kuanza kusikiliza sauti safi!
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar: Voice Config & Library History (5 Cols) */}
        <div className="md:col-span-5 flex flex-col gap-6">
          
          {/* Voice Models List (Gilded Profiles) */}
          <div className="glass rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            <label className="absolute -top-3 left-6 px-2.5 bg-[#050505] text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Chagua Sauti
            </label>
            
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-950 pb-3 mt-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#d4af37]" />
              Mitungi ya Sauti
            </h2>

            <div className="flex flex-col gap-3">
              {VOICES.map((voice) => {
                const isSelected = selectedVoice === voice.id;
                return (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-zinc-900/90 border-[#d4af37]/70 ring-1 ring-[#d4af37]/20"
                        : "bg-zinc-950/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/30"
                    }`}
                    id={`voice-card-${voice.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white tracking-tight">
                          {voice.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wide ${
                          voice.gender === "Kike" 
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        }`}>
                          {voice.gender}
                        </span>
                      </div>
                      <span className="text-[10px] bg-zinc-900 border border-zinc-850 text-zinc-450 text-zinc-400 px-2 py-0.5 rounded font-mono">
                        {voice.tag}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-normal font-sans">
                      {voice.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Local Library / History */}
          <div className="glass rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            <label className="absolute -top-3 left-6 px-2.5 bg-[#050505] text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Maktaba Yako
            </label>

            <div className="flex items-center justify-between border-b border-zinc-950 pb-3 mt-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#d4af37]" />
                Sauti Zilizohifadhiwa ({history.length})
              </h2>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-rose-450 hover:text-rose-400 bg-rose-950/25 border border-rose-900/30 hover:bg-rose-950/50 px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer font-bold font-mono"
                  id="clear-all-history-btn"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  SOMA
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-650 italic">
                  Hakuna historia ya sauti zilizoundwa hivi karibuni.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handlePlayHistory(item)}
                      className="group p-3.5 rounded-xl bg-zinc-900/35 hover:bg-zinc-900/80 border border-zinc-900 hover:border-zinc-800 transition-all flex flex-col gap-2.5 cursor-pointer relative"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <p className="text-xs font-medium text-zinc-300 line-clamp-2 leading-relaxed flex-1">
                          &ldquo;{item.text}&rdquo;
                        </p>
                        <span className="text-[9px] text-zinc-650 font-mono mt-0.5 shrink-0 block text-zinc-550">
                          {item.timestamp}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-zinc-950 pt-2 mt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-zinc-950 border border-zinc-850 text-[#d4af37] px-2 py-0.5 rounded font-mono font-bold">
                            {item.voice}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Play button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayHistory(item);
                            }}
                            className="bg-gradient-to-r from-[#d4af37] to-[#f9e39e] p-1.5 rounded-lg text-black transition hover:brightness-110"
                            title="Sikiliza"
                            id={`history-play-${item.id}`}
                          >
                            <Play className="h-3 w-3 fill-black stroke-none" />
                          </button>
                          
                          {/* Download Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAudio(item.audioBase64, item.text);
                            }}
                            className="bg-zinc-800 p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-750 transition border border-zinc-700/60"
                            title="Pakua kama MP3"
                            id={`history-download-${item.id}`}
                          >
                            <Download className="h-3 w-3" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={(e) => handleDeleteHistory(item.id, e)}
                            className="bg-rose-950/40 p-1.5 rounded-lg text-rose-400 border border-rose-900/30 hover:bg-rose-900/30 transition"
                            title="Futa"
                            id={`history-delete-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Secure System Tip Box */}
          <div className="bg-zinc-900/60 rounded-2xl border border-[#d4af37]/20 p-5 shadow-sm text-sm text-zinc-400 leading-normal flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-[#d4af37]" />
            <div>
              <p className="font-bold text-white border-none pb-0 text-xs">
                Siri za Programu & Ulinzi
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-sans">
                Kitufe cha kugeuza maandishi kinahitaji ufunguo wa siri wa <strong className="text-zinc-350">GEMINI_API_KEY</strong> uwe umewekewa ulinzi salama kwenye sanduku la <strong className="text-zinc-350">Secrets</strong>. Kila mchakato uko salama server-side!
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer bar */}
      <footer className="w-full max-w-5xl mx-auto px-4 mt-20 border-t border-zinc-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center text-xs text-zinc-600">
        <p>&copy; 2026 Mtafsiri wa Maandishi kuwa Sauti (MP3) &bull; Kiswahili Sanifu &bull; Gemini TTS Server</p>
        <div className="flex gap-4">
          <span className="hover:text-zinc-400 transition cursor-default">Msaada</span>
          <span className="hover:text-zinc-400 transition cursor-default">Sheria na Masharti</span>
        </div>
      </footer>
    </div>
  );
}
