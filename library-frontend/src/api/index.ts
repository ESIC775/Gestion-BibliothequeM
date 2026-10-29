import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Session expirée ou compte supprimé : retour à l'écran de connexion
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error?.config?.url ?? '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (error?.response?.status === 401 && !isAuthCall && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export default api;
