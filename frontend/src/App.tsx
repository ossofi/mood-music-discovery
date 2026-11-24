import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createQueryClient } from '@/api/globalErrorHandler';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { FeedPage } from '@/pages/FeedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaylistPage } from '@/pages/PlaylistPage';
import { PlaylistsPage } from '@/pages/PlaylistsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { QuizPage } from '@/pages/QuizPage';
import { TrackPage } from '@/pages/TrackPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/quiz" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="quiz" element={<QuizPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="playlists/:playlistId" element={<PlaylistPage />} />
          <Route path="tracks/:trackId" element={<TrackPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
