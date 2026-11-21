export const HOTEL_INFO = {
  name: 'Mahadev Residency',
  tagline: 'Coastal Stay & Kitchen in Honnavar',
  addressLine1: 'NH-66 Sharavathi Bridge Road, Kasarkod Junction',
  addressLine2: 'Honnavar, Uttara Kannada, Karnataka 581334',
  coordinates: '14.2798° N, 74.4439° E',
  phone: '+91 8387 224 910',
  mobile: '+91 94480 61910',
  email: 'reservations@mahadevresidency.in',
  upiId: 'akash2070@ybl',
  upiMerchantName: 'Mahadev Residency Honnavar',
  upiBankLabel: 'State Bank of India · 4854',
  upiQrImage: '/assets/aistudio/Screenshot_20261122-030340_34bce4b5.png',
  checkInTime: '12:00 PM',
  checkOutTime: '11:00 AM',
  totalRooms: 49,
  singleRoomsCount: 14,
  doubleRoomsCount: 35,
};

export const ROOM_CATALOG = {
  Single: {
    title: 'Single Room',
    subtitle: '14 Units · Floor 1 · Attached Bathroom & Toilet',
    unitsCount: 14,
    ratePerNight: 1450,
    areaSqFt: 180,
    maxGuests: 1,
    bedConfig: '1 Teakwood Single Bed',
    bathroomSpec: 'Private Attached Bathroom & Western Toilet (24h Hot/Cold Water)',
    image: '/src/assets/images/room_single_coastal_1795294406531.jpg',
    description:
      'Tailored for solo travelers, coastal highway drivers, and visiting professionals. Features a solid teakwood single bed, work desk, split AC, and a spotless private attached bathroom and toilet.',
    amenities: [
      'Attached Bathroom & Toilet',
      '24-Hour Solar & Geyser Hot Water',
      'Split Air Conditioning',
      'High-Speed Fiber Wi-Fi',
      'Teakwood Study Desk',
      'Complimentary Mineral Water',
    ],
  },
  Double: {
    title: 'Double Bed Room',
    subtitle: '35 Units · Floors 2 & 3 · Attached Bathroom & Toilet',
    unitsCount: 35,
    ratePerNight: 2350,
    areaSqFt: 275,
    maxGuests: 3,
    bedConfig: '1 King / Queen Teakwood Double Bed',
    bathroomSpec: 'Private Attached Bathroom, Rain Shower & Western Toilet',
    image: '/src/assets/images/room_double_deluxe_1795294406406.jpg',
    description:
      'Spacious double bed accommodation ideal for couples and families exploring Honnavar beaches and temples. Includes palm-facing daylight windows, wardrobe, seating area, and a generous attached en-suite bathroom.',
    amenities: [
      'Attached Bathroom & Toilet',
      '24-Hour Hot/Cold Rain Shower',
      'Split AC & Ceiling Fan',
      '32-Inch Smart TV',
      'Palm Garden View Windows',
      'In-Room Dining Service',
    ],
  },
} as const;

export interface DiningDish {
  id: string;
  name: string;
  category: 'Breakfast' | 'Coastal Thali & Mains' | 'Beverages';
  dietary: 'Veg' | 'Coastal Seafood' | 'Non-Veg';
  price: number;
  description: string;
}

export const DINING_MENU: DiningDish[] = [
  {
    id: 'd-1',
    name: 'Neer Dosa with Coconut Milk Chutney',
    category: 'Breakfast',
    dietary: 'Veg',
    price: 110,
    description: 'Lacy rice crepes served warm with roasted red-chilli coconut chutney and jaggery syrup.',
  },
  {
    id: 'd-2',
    name: 'Honnavar Mangalore Buns & Kurma',
    category: 'Breakfast',
    dietary: 'Veg',
    price: 95,
    description: 'Fluffy sweet banana puris paired with mild coastal vegetable kurma.',
  },
  {
    id: 'd-3',
    name: 'Goli Baje & Filter Kaapi Combo',
    category: 'Breakfast',
    dietary: 'Veg',
    price: 120,
    description: 'Crisp spiced flour fritters served fresh with brass-tumbler Chikmagalur filter coffee.',
  },
  {
    id: 'd-4',
    name: 'Karavali Coastal Fish Thali',
    category: 'Coastal Thali & Mains',
    dietary: 'Coastal Seafood',
    price: 290,
    description: 'Red boiled rice, Bangude coconut curry, crispy rava-fried fish, sol kadhi, and coastal pickle on banana leaf.',
  },
  {
    id: 'd-5',
    name: 'Uttara Kannada Pure Veg Banana Leaf Thali',
    category: 'Coastal Thali & Mains',
    dietary: 'Veg',
    price: 210,
    description: 'Steamed sona masoori, sambar, rasam, two seasonal coastal palyas, kosambari, papad, and payasa.',
  },
  {
    id: 'd-6',
    name: 'Kundapur Chicken Ghee Roast & Neer Dosa',
    category: 'Coastal Thali & Mains',
    dietary: 'Non-Veg',
    price: 340,
    description: 'Slow-roasted Byadagi chilli and clarified butter masala served with four soft neer dosas.',
  },
  {
    id: 'd-7',
    name: 'Kokum Sol Kadhi (Chilled)',
    category: 'Beverages',
    dietary: 'Veg',
    price: 65,
    description: 'Digestive coastal kokum extract blended with fresh coconut milk, garlic, and coriander.',
  },
  {
    id: 'd-8',
    name: 'Chikmagalur Brass Filter Coffee',
    category: 'Beverages',
    dietary: 'Veg',
    price: 55,
    description: 'Slow-dripped peaberry decoction frothed with farm milk in a traditional davara tumbler.',
  },
];

export interface GalleryPhoto {
  id: string;
  title: string;
  caption: string;
  category: 'Exterior & Lobby' | 'Rooms' | 'Attached Bathroom' | 'Coastal Dining';
  src: string;
}

export const GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'g-1',
    title: 'Mahadev Residency Courtyard Entrance',
    caption: 'Laterite stone porch and palm-lined courtyard just off NH-66 in Kasarkod, Honnavar.',
    category: 'Exterior & Lobby',
    src: '/src/assets/images/hero_mahadev_residency_1795294407530.jpg',
  },
  {
    id: 'g-2',
    title: 'Double Bed Room (35 Units)',
    caption: 'King teakwood bed, natural daylight windows, and attached en-suite doorway.',
    category: 'Rooms',
    src: '/src/assets/images/room_double_deluxe_1795294406406.jpg',
  },
  {
    id: 'g-3',
    title: 'Single Room (14 Units)',
    caption: 'Dedicated solo room with study desk, crisp cotton linens, and private attached bath.',
    category: 'Rooms',
    src: '/src/assets/images/room_single_coastal_1795294406531.jpg',
  },
  {
    id: 'g-4',
    title: 'Attached En-Suite Bathroom & Toilet',
    caption: 'Every single one of our 49 rooms includes a private tiled bathroom with western WC and hot shower.',
    category: 'Attached Bathroom',
    src: '/src/assets/images/ensuite_attached_bathroom_1795294406644.jpg',
  },
  {
    id: 'g-5',
    title: 'Karavali Dining Hall & Coastal Thali',
    caption: 'Freshly prepared neer dosa, coastal curries, and brass-tumbler filter coffee served daily.',
    category: 'Coastal Dining',
    src: '/src/assets/images/coastal_karnataka_dining_1795294406385.jpg',
  },
];

export interface HonnavarLandmark {
  id: string;
  name: string;
  distance: string;
  driveTime: string;
  category: 'Transit' | 'Beach & Nature' | 'Heritage';
  description: string;
  mapX: number;
  mapY: number;
}

export const HONNAVAR_LANDMARKS: HonnavarLandmark[] = [
  {
    id: 'lm-1',
    name: 'Sharavathi River Bridge',
    distance: '0.9 km',
    driveTime: '3 mins',
    category: 'Transit',
    description: 'Panoramic coastal river crossing connecting Honnavar town and Kasarkod.',
    mapX: 52,
    mapY: 38,
  },
  {
    id: 'lm-2',
    name: 'Honnavar Railway Station',
    distance: '2.4 km',
    driveTime: '7 mins',
    category: 'Transit',
    description: 'Konkan Railway station with complimentary pickup available on pre-booking.',
    mapX: 73,
    mapY: 27,
  },
  {
    id: 'lm-3',
    name: 'Kasarkod Blue Flag Eco Beach',
    distance: '4.1 km',
    driveTime: '9 mins',
    category: 'Beach & Nature',
    description: 'Certified Blue Flag shoreline with casuarina groves and clean sunset boardwalks.',
    mapX: 22,
    mapY: 64,
  },
  {
    id: 'lm-4',
    name: 'Basavaraja Durga Island Ferry',
    distance: '3.8 km',
    driveTime: '10 mins',
    category: 'Heritage',
    description: '16th-century coastal sea fort reachable by local fishing boat from Honnavar jetty.',
    mapX: 29,
    mapY: 32,
  },
  {
    id: 'lm-5',
    name: 'Apsarakonda Beach & Waterfalls',
    distance: '6.5 km',
    driveTime: '14 mins',
    category: 'Beach & Nature',
    description: 'Cliffside garden, Pandava caves, and freshwater waterfall overlooking the Arabian Sea.',
    mapX: 34,
    mapY: 82,
  },
  {
    id: 'lm-6',
    name: 'Murdeshwar Temple & Coast',
    distance: '21 km',
    driveTime: '28 mins',
    category: 'Heritage',
    description: 'Iconic seaside Raja Gopura temple and coastal drive south along NH-66.',
    mapX: 66,
    mapY: 86,
  },
];
