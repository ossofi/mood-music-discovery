// Data types mirror api/openapi.yaml (v1.0.0). Keep them in sync with the contract.

export type ProblemCode =
  | 'VALIDATION_ERROR'
  | 'QUIZ_INCOMPLETE'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'HISTORY_CONSENT_REQUIRED'
  | 'NOT_FOUND'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface FieldError {
  field: string;
  message: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  code: ProblemCode;
  detail?: string;
  traceId?: string;
  errors?: FieldError[];
}

export interface User {
  userId: number;
  email: string;
  displayName: string | null;
  historyConsent: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  historyConsent?: boolean;
}

export interface QuizOption {
  optionId: number;
  label: string;
}

export interface QuizQuestion {
  questionId: number;
  position: number;
  prompt: string;
  options: QuizOption[];
}

export interface Quiz {
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  questionId: number;
  optionId: number;
}

export interface CreateQuizSessionRequest {
  familiarWeight?: number;
  answers: QuizAnswer[];
}

export interface QuizSession {
  sessionId: number;
  quizDate: string;
  familiarWeight: number;
  answerCount: number;
}

export interface GeneratePlaylistRequest {
  limit?: number;
  familiarWeight?: number;
}

export interface ArtistRef {
  artistId: number;
  name: string;
}

export interface PlaylistItem {
  position: number;
  trackId: number;
  title: string;
  artist: ArtistRef;
  releaseYear?: number | null;
  score: number;
  isFamiliar: boolean;
  matchedTags: string[];
}

export interface Playlist {
  playlistId: number;
  sessionId: number;
  familiarWeight: number;
  generatedAt: string;
  requestedLimit: number;
  moodFitRating: number | null;
  limitationNotice: string | null;
  items: PlaylistItem[];
}

export interface PlaylistSummary {
  playlistId: number;
  sessionId: number;
  familiarWeight: number;
  generatedAt: string;
  trackCount: number;
  moodFitRating: number | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Rating {
  playlistId: number;
  moodFitRating: number;
  ratedAt: string;
}

export type FactType = 'history' | 'creation' | 'influence' | 'trivia';

export interface Source {
  name: string;
  url: string;
}

export interface Fact {
  factId: number;
  factType: FactType;
  text: string;
  source: Source;
}

export interface RelatedGenre {
  genre: string;
  relationType: 'root_of' | 'subgenre_of' | 'related_to';
  relatedGenre: string;
}

export interface Embed {
  provider: 'spotify' | 'deezer';
  id: string;
}

export interface TrackDetail {
  trackId: number;
  title: string;
  releaseYear?: number | null;
  artist: ArtistRef;
  genres: string[];
  tags: string[];
  facts: Fact[];
  relatedGenres: RelatedGenre[];
  embeds: Embed[];
  lyrics: { url: string; excerpt?: string | null } | null;
}

export interface ListeningEventRequest {
  trackId: number;
  playlistId?: number;
  listenedSeconds: number;
}

export interface ListeningEvent {
  eventId: number;
  trackId: number;
  playlistId?: number | null;
  startedAt: string;
  listenedSeconds: number;
}

export interface FeedItem {
  factId: number;
  factType: FactType;
  text: string;
  source: Source;
  lastListenedAt: string;
}
