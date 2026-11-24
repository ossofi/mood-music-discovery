// Seed data for the mock server. It mirrors database/004_reference_data.sql and 005_test_data.sql
// (same ids, quiz, tags and demo tracks) so the mock behaves like the real database would.
import type { FactType } from '@/api/types';

export const TAG_LABELS: Record<string, string> = {
  calm: 'Calm',
  relaxed: 'Relaxed',
  energetic: 'Energetic',
  focused: 'Focused',
  melancholic: 'Melancholic',
  uplifting: 'Uplifting',
  hopeful: 'Hopeful',
  nostalgic: 'Nostalgic',
  dark: 'Dark',
  angry: 'Angry',
  rebellious: 'Rebellious',
};

export const QUESTIONS = [
  {
    questionId: 1,
    position: 1,
    prompt: 'How is your energy right now?',
    options: ['Low and tired', 'Steady', 'Up for it', 'Wired and restless'],
  },
  {
    questionId: 2,
    position: 2,
    prompt: 'How do you want to feel?',
    options: ['Comforted', 'Lifted', 'Challenged', 'Let it all out'],
  },
  {
    questionId: 3,
    position: 3,
    prompt: 'What are you doing?',
    options: ['Winding down', 'Working or studying', 'Driving or moving', 'Late at night'],
  },
  {
    questionId: 4,
    position: 4,
    prompt: 'What pace suits you?',
    options: ['Slow burn', 'Mid-tempo', 'Driving', 'Pounding'],
  },
];

/** optionId (1..16) -> [tag code, weight][] */
export const OPTION_TAGS: Record<number, [string, number][]> = {
  1: [
    ['calm', 0.8],
    ['melancholic', 0.4],
  ],
  2: [
    ['focused', 0.6],
    ['relaxed', 0.5],
  ],
  3: [
    ['energetic', 0.8],
    ['uplifting', 0.4],
  ],
  4: [
    ['energetic', 0.9],
    ['rebellious', 0.5],
  ],
  5: [
    ['nostalgic', 0.7],
    ['relaxed', 0.5],
  ],
  6: [
    ['uplifting', 0.8],
    ['hopeful', 0.5],
  ],
  7: [
    ['rebellious', 0.7],
    ['dark', 0.4],
  ],
  8: [
    ['angry', 0.8],
    ['dark', 0.5],
  ],
  9: [
    ['relaxed', 0.7],
    ['calm', 0.6],
  ],
  10: [
    ['focused', 0.8],
    ['calm', 0.4],
  ],
  11: [
    ['energetic', 0.6],
    ['hopeful', 0.4],
  ],
  12: [
    ['dark', 0.6],
    ['melancholic', 0.6],
  ],
  13: [
    ['calm', 0.5],
    ['melancholic', 0.5],
  ],
  14: [
    ['relaxed', 0.4],
    ['nostalgic', 0.4],
  ],
  15: [
    ['energetic', 0.6],
    ['rebellious', 0.3],
  ],
  16: [
    ['angry', 0.5],
    ['dark', 0.5],
  ],
};

export interface SeedTrack {
  trackId: number;
  title: string;
  artistId: number;
  artist: string;
  year: number;
  genres: string[];
  tags: [string, number][];
}

export const TRACKS: SeedTrack[] = [
  {
    trackId: 1,
    title: 'Hoochie Coochie Man',
    artistId: 1,
    artist: 'Muddy Waters',
    year: 1954,
    genres: ['Blues'],
    tags: [
      ['dark', 0.7],
      ['rebellious', 0.5],
      ['nostalgic', 0.6],
    ],
  },
  {
    trackId: 2,
    title: 'Folsom Prison Blues',
    artistId: 2,
    artist: 'Johnny Cash',
    year: 1955,
    genres: ['Country', 'Rock'],
    tags: [
      ['rebellious', 0.7],
      ['nostalgic', 0.6],
      ['dark', 0.4],
    ],
  },
  {
    trackId: 3,
    title: 'So What',
    artistId: 3,
    artist: 'Miles Davis',
    year: 1959,
    genres: ['Jazz'],
    tags: [
      ['calm', 0.8],
      ['focused', 0.8],
      ['relaxed', 0.6],
    ],
  },
  {
    trackId: 4,
    title: 'Whole Lotta Love',
    artistId: 4,
    artist: 'Led Zeppelin',
    year: 1969,
    genres: ['Rock', 'Blues'],
    tags: [
      ['energetic', 0.9],
      ['rebellious', 0.6],
    ],
  },
  {
    trackId: 5,
    title: 'Paranoid',
    artistId: 5,
    artist: 'Black Sabbath',
    year: 1970,
    genres: ['Metal', 'Rock'],
    tags: [
      ['angry', 0.7],
      ['energetic', 0.8],
      ['dark', 0.5],
    ],
  },
  {
    trackId: 6,
    title: 'Master of Puppets',
    artistId: 6,
    artist: 'Metallica',
    year: 1986,
    genres: ['Metal'],
    tags: [
      ['angry', 0.9],
      ['dark', 0.7],
      ['energetic', 0.8],
    ],
  },
  {
    trackId: 7,
    title: 'Smells Like Teen Spirit',
    artistId: 7,
    artist: 'Nirvana',
    year: 1991,
    genres: ['Rock'],
    tags: [
      ['angry', 0.7],
      ['rebellious', 0.9],
      ['energetic', 0.8],
    ],
  },
  {
    trackId: 8,
    title: 'The Thrill Is Gone',
    artistId: 8,
    artist: 'B.B. King',
    year: 1969,
    genres: ['Blues'],
    tags: [
      ['melancholic', 0.9],
      ['dark', 0.4],
      ['calm', 0.4],
    ],
  },
  {
    trackId: 9,
    title: 'Take Five',
    artistId: 9,
    artist: 'The Dave Brubeck Quartet',
    year: 1959,
    genres: ['Jazz'],
    tags: [
      ['relaxed', 0.8],
      ['focused', 0.7],
      ['calm', 0.6],
    ],
  },
  {
    trackId: 10,
    title: 'Paint It Black',
    artistId: 10,
    artist: 'The Rolling Stones',
    year: 1966,
    genres: ['Rock', 'Blues'],
    tags: [
      ['dark', 0.8],
      ['angry', 0.5],
      ['melancholic', 0.4],
    ],
  },
  {
    trackId: 11,
    title: 'On the Road Again',
    artistId: 11,
    artist: 'Willie Nelson',
    year: 1980,
    genres: ['Country'],
    tags: [
      ['uplifting', 0.8],
      ['hopeful', 0.7],
      ['energetic', 0.4],
    ],
  },
  {
    trackId: 12,
    title: 'Wish You Were Here',
    artistId: 12,
    artist: 'Pink Floyd',
    year: 1975,
    genres: ['Rock'],
    tags: [
      ['melancholic', 0.8],
      ['nostalgic', 0.8],
      ['calm', 0.6],
    ],
  },
  {
    trackId: 13,
    title: 'The Trooper',
    artistId: 13,
    artist: 'Iron Maiden',
    year: 1983,
    genres: ['Metal'],
    tags: [
      ['energetic', 0.9],
      ['rebellious', 0.4],
    ],
  },
  {
    trackId: 14,
    title: "I'm So Lonesome I Could Cry",
    artistId: 14,
    artist: 'Hank Williams',
    year: 1949,
    genres: ['Country'],
    tags: [
      ['melancholic', 0.9],
      ['nostalgic', 0.6],
      ['dark', 0.3],
    ],
  },
  {
    trackId: 15,
    title: 'Fortunate Son',
    artistId: 15,
    artist: 'Creedence Clearwater Revival',
    year: 1969,
    genres: ['Rock'],
    tags: [
      ['angry', 0.6],
      ['rebellious', 0.8],
      ['energetic', 0.7],
    ],
  },
  {
    trackId: 16,
    title: 'Naima',
    artistId: 16,
    artist: 'John Coltrane',
    year: 1960,
    genres: ['Jazz'],
    tags: [
      ['calm', 0.8],
      ['focused', 0.6],
      ['melancholic', 0.5],
    ],
  },
  {
    trackId: 17,
    title: 'Smoke on the Water',
    artistId: 17,
    artist: 'Deep Purple',
    year: 1972,
    genres: ['Rock', 'Metal'],
    tags: [
      ['energetic', 0.7],
      ['rebellious', 0.5],
    ],
  },
  {
    trackId: 18,
    title: 'Time',
    artistId: 12,
    artist: 'Pink Floyd',
    year: 1973,
    genres: ['Rock'],
    tags: [],
  }, // edge case: untagged
];

export interface SeedFact {
  factId: number;
  trackId?: number;
  artistId?: number;
  factType: FactType;
  text: string;
  url: string;
}

export const FACTS: SeedFact[] = [
  {
    factId: 1,
    trackId: 17,
    factType: 'history',
    text: 'Inspired by a 1971 fire at the Montreux Casino during a Frank Zappa concert.',
    url: 'https://en.wikipedia.org/wiki/Smoke_on_the_Water',
  },
  {
    factId: 2,
    trackId: 9,
    factType: 'creation',
    text: 'Composed by saxophonist Paul Desmond and written in 5/4 time.',
    url: 'https://en.wikipedia.org/wiki/Take_Five',
  },
  {
    factId: 3,
    trackId: 3,
    factType: 'history',
    text: 'Opens the 1959 album Kind of Blue.',
    url: 'https://en.wikipedia.org/wiki/So_What_(Miles_Davis_composition)',
  },
  {
    factId: 4,
    trackId: 1,
    factType: 'creation',
    text: 'Written by Willie Dixon for Muddy Waters.',
    url: 'https://en.wikipedia.org/wiki/Hoochie_Coochie_Man',
  },
  {
    factId: 5,
    trackId: 13,
    factType: 'influence',
    text: 'Inspired by the Charge of the Light Brigade in the Crimean War.',
    url: 'https://en.wikipedia.org/wiki/The_Trooper',
  },
  {
    factId: 6,
    artistId: 6,
    factType: 'history',
    text: 'Formed in Los Angeles in 1981.',
    url: 'https://en.wikipedia.org/wiki/Metallica',
  },
  {
    factId: 7,
    artistId: 5,
    factType: 'history',
    text: 'Formed in Birmingham, England, in 1968.',
    url: 'https://en.wikipedia.org/wiki/Black_Sabbath',
  },
];

export const RELATED_GENRES: Record<
  string,
  { relationType: 'root_of' | 'subgenre_of' | 'related_to'; relatedGenre: string }[]
> = {
  Blues: [
    { relationType: 'root_of', relatedGenre: 'Rock' },
    { relationType: 'root_of', relatedGenre: 'Jazz' },
  ],
  Rock: [
    { relationType: 'subgenre_of', relatedGenre: 'Metal' },
    { relationType: 'related_to', relatedGenre: 'Country' },
  ],
  Jazz: [{ relationType: 'related_to', relatedGenre: 'Blues' }],
  Country: [{ relationType: 'related_to', relatedGenre: 'Rock' }],
  Metal: [],
};

/** Tracks with a lyrics link (no lyrics text is stored). */
export const LYRICS_TRACKS = new Set([5, 12]);

/** Tracks Alice has already heard (drives the familiar/discovery balance and her feed). */
export const ALICE_HEARD = [3, 12, 9, 17, 13, 1, 6, 5];
