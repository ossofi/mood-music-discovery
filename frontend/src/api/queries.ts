import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import type {
  AuthResponse,
  CreateQuizSessionRequest,
  FeedItem,
  GeneratePlaylistRequest,
  ListeningEvent,
  ListeningEventRequest,
  LoginRequest,
  Page,
  Playlist,
  PlaylistSummary,
  Quiz,
  QuizSession,
  Rating,
  RegisterRequest,
  TrackDetail,
  UpdateUserRequest,
  User,
} from './types';
import { useAuthStore } from '@/stores/authStore';

export const keys = {
  quiz: ['quiz'] as const,
  playlists: ['playlists'] as const,
  playlist: (id: number) => ['playlist', id] as const,
  track: (id: number) => ['track', id] as const,
  feed: ['feed'] as const,
};

const PAGE_SIZE = 20;

// ---------- Auth and profile ----------

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body, auth: false }),
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (body: RegisterRequest) =>
      request<AuthResponse>('/auth/register', { method: 'POST', body, auth: false }),
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request<void>('/auth/logout', { method: 'POST' }),
    meta: { silent: true },
    onSettled: () => {
      clear(); // sign out locally even if the server call failed
      queryClient.clear();
    },
  });
}

export function useUpdateMe() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (body: UpdateUserRequest) => request<User>('/users/me', { method: 'PATCH', body }),
    onSuccess: (user) => setUser(user),
  });
}

export function useDeleteHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request<void>('/users/me/history', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.feed }),
  });
}

export function useDeleteAccount() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request<void>('/users/me', { method: 'DELETE' }),
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}

// ---------- Quiz and playlists ----------

export function useQuiz() {
  return useQuery({
    queryKey: keys.quiz,
    queryFn: () => request<Quiz>('/quiz'),
    staleTime: 5 * 60_000,
  });
}

export function useCreateQuizSession() {
  return useMutation({
    mutationFn: (body: CreateQuizSessionRequest) =>
      request<QuizSession>('/quiz-sessions', { method: 'POST', body }),
  });
}

export function useGeneratePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, ...body }: GeneratePlaylistRequest & { sessionId: number }) =>
      request<Playlist>(`/quiz-sessions/${sessionId}/playlists`, { method: 'POST', body }),
    onSuccess: (playlist) => {
      queryClient.setQueryData(keys.playlist(playlist.playlistId), playlist);
      void queryClient.invalidateQueries({ queryKey: keys.playlists });
    },
  });
}

export function usePlaylist(id: number) {
  return useQuery({
    queryKey: keys.playlist(id),
    queryFn: () => request<Playlist>(`/playlists/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function usePlaylists() {
  return useInfiniteQuery({
    queryKey: keys.playlists,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      request<Page<PlaylistSummary>>(
        `/playlists?limit=${PAGE_SIZE}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useRatePlaylist(playlistId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moodFitRating: number) =>
      request<Rating>(`/playlists/${playlistId}/rating`, {
        method: 'PUT',
        body: { moodFitRating },
      }),
    onSuccess: (rating) => {
      queryClient.setQueryData<Playlist>(keys.playlist(playlistId), (old) =>
        old ? { ...old, moodFitRating: rating.moodFitRating } : old,
      );
      void queryClient.invalidateQueries({ queryKey: keys.playlists });
    },
  });
}

// ---------- Catalogue and activity ----------

export function useTrack(id: number) {
  return useQuery({
    queryKey: keys.track(id),
    queryFn: () => request<TrackDetail>(`/tracks/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useRecordListening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey, ...body }: ListeningEventRequest & { idempotencyKey: string }) =>
      request<ListeningEvent>('/listening-events', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.feed }),
  });
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: keys.feed,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      request<Page<FeedItem>>(
        `/feed?limit=${PAGE_SIZE}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
