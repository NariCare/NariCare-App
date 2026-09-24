import { EventType, FeedItem } from '../../../admin.models';

// Labels, icons and tints shared by the profile tabs.
export const FEED_META: Record<FeedItem['type'], { label: string; img: string; tone: string; color: string }> = {
  direct: { label: 'Direct feed', img: 'assets/Fed directly.svg', tone: 'pink', color: '#d9487f' },
  expressed: { label: 'Expressed milk', img: 'assets/Pump.svg', tone: 'lavender', color: '#6464d3' },
  formula: { label: 'Formula', img: 'assets/Formula.svg', tone: 'orange', color: '#e0a526' }
};

const EVENT_ICON: Record<EventType, { icon: string; tone: string }> = {
  feed: { icon: 'restaurant-outline', tone: 'pink' },
  pump: { icon: 'water-outline', tone: 'lavender' },
  diaper: { icon: 'layers-outline', tone: 'orange' },
  growth: { icon: 'trending-up-outline', tone: 'green' },
  mood: { icon: 'happy-outline', tone: 'lavender' },
  ai_question: { icon: 'chatbubble-ellipses-outline', tone: 'lavender' },
  baby_added: { icon: 'person-add-outline', tone: 'pink' },
  signup: { icon: 'sparkles-outline', tone: 'green' }
};

export function eventIcon(t: string): { icon: string; tone: string } {
  return EVENT_ICON[t as EventType] || { icon: 'ellipse-outline', tone: '' };
}

/** "15 min · Both sides" style detail for a feed row; '-' parts dropped. */
export function feedDetail(f: FeedItem): string {
  return [f.durationMin != null ? `${f.durationMin} min` : '', f.ml != null ? `${f.ml} mL` : '', sideLabel(f.side)].filter(Boolean).join(' · ') || '-';
}

export function sideLabel(side: string | null | undefined): string {
  if (!side) return '';
  const s = side.toLowerCase();
  return s === 'both' ? 'Both sides' : s === 'left' ? 'Left side' : s === 'right' ? 'Right side' : side;
}
