
export interface CampusEvent {
  id: string;
  title: string;
  time: string;
  description: string;
  category: 'academic' | 'social' | 'sports' | 'workshop';
}

export interface NarrationStep {
  text: string;
  audioBase64: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  type: 'academic' | 'facility' | 'sports' | 'dining' | 'gate';
  features: string[];
  coordinates: { x: number; y: number; width: number; height: number };
  color: string;
  rooms?: string[];
  events?: CampusEvent[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  navigationId?: string;
  eventId?: string;
}

export enum BuildingId {
  MAIN_BLOCK = 'main-block',
  CAFETERIA = 'cafeteria',
  GYM = 'gym',
  STADIUM = 'stadium',
  ENTRANCE = 'main-entrance'
}
