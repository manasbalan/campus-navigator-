
import { Location } from './types';

export const CAMPUS_LOCATIONS: Location[] = [
  {
    id: 'main-entrance',
    name: 'Main Campus Entrance',
    description: 'The grand gateway to Titan University. Features a historic archway and a 24/7 security kiosk.',
    type: 'gate',
    features: ['Visitor Parking', 'Welcome Kiosk', 'Security'],
    coordinates: { x: 360, y: 520, width: 80, height: 60 },
    color: 'fill-amber-100 stroke-amber-500',
    events: [
      { id: 'e1', title: 'Freshman Welcome Parade', time: '09:00 AM - Today', description: 'Annual welcome parade for new students.', category: 'social' }
    ]
  },
  {
    id: 'main-block',
    name: 'Academic Hall',
    description: 'A majestic building housing the central library and primary lecture theaters with classic architecture.',
    type: 'academic',
    features: ['Central Library', 'Main Hall', 'Faculty Offices'],
    rooms: ['Room 101: Calculus', 'Room 102: Physics Lab', 'Room 201: Literature', 'Room 205: Computer Science'],
    coordinates: { x: 300, y: 40, width: 200, height: 160 },
    color: 'fill-blue-100 stroke-blue-500',
    events: [
      { id: 'e2', title: 'Open Library Night', time: '07:00 PM - Mon', description: '24-hour study session with free coffee.', category: 'academic' },
      { id: 'e3', title: 'Guest Lecture: AI Ethics', time: '02:00 PM - Wed', description: 'Dr. Aris Thorne discusses the future of LLMs.', category: 'workshop' }
    ]
  },
  {
    id: 'cafeteria',
    name: 'The Commons Dining',
    description: 'Modern food court with a glass facade and an outdoor terrace overlooking the West Garden.',
    type: 'dining',
    features: ['Starbucks', 'International Cuisine', 'Free Wi-Fi'],
    coordinates: { x: 60, y: 180, width: 140, height: 110 },
    color: 'fill-orange-100 stroke-orange-500',
    events: [
      { id: 'e4', title: 'Live Jazz Brunch', time: '11:00 AM - Sat', description: 'Enjoy your meal with live music.', category: 'social' },
      { id: 'e5', title: 'Sustainable Cooking Workshop', time: '04:00 PM - Fri', description: 'Learn to cook with local campus produce.', category: 'workshop' }
    ]
  },
  {
    id: 'gym',
    name: 'Titan Fitness Center',
    description: 'State-of-the-art facility featuring three floors of equipment and an indoor aquatic center.',
    type: 'facility',
    features: ['Olympic Pool', 'Basketball Courts', 'Cardio Suite'],
    coordinates: { x: 600, y: 180, width: 140, height: 120 },
    color: 'fill-emerald-100 stroke-emerald-500',
    events: [
      { id: 'e6', title: 'Zumba Flash Mob', time: '05:00 PM - Today', description: 'High energy dance session for everyone.', category: 'social' },
      { id: 'e7', title: 'Swimming Gala Qualifiers', time: '08:00 AM - Sun', description: 'Selection trials for the varsity swim team.', category: 'sports' }
    ]
  },
  {
    id: 'stadium',
    name: 'Titans Arena',
    description: 'Our pride and joy. An 80,000-seat stadium hosting championship games and live concerts.',
    type: 'sports',
    features: ['Professional Turf', 'Jumbo Screen', 'Team Shop'],
    coordinates: { x: 220, y: 320, width: 360, height: 160 },
    color: 'fill-rose-100 stroke-rose-500',
    events: [
      { id: 'e8', title: 'Titans vs. Knights', time: '06:00 PM - Sat', description: 'The biggest football game of the season.', category: 'sports' },
      { id: 'e9', title: 'Spring Concert: Neon Nights', time: '08:00 PM - Next Fri', description: 'Outdoor music festival featuring local bands.', category: 'social' }
    ]
  }
];
