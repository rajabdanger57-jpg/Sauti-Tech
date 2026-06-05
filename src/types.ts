export interface AudioHistoryItem {
  id: string;
  text: string;
  voice: string;
  timestamp: string;
  audioBase64: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: "Kike" | "Kiume"; // Swahili genders for clarity
  tag: string;
}
