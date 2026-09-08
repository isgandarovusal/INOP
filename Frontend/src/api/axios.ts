import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 40000,
});

let toastId: string | null = null;

api.interceptors.request.use((config) => {
  const timer = setTimeout(() => {
    toastId = toast.loading('Server oyandırılır, lütfən gözləyin (~20-30 san)...');
  }, 3000);

  (config as any).timer = timer;
  return config;
});

api.interceptors.response.use(
  (response) => {
    clearTimeout((response.config as any).timer);
    if (toastId) toast.dismiss(toastId);
    return response;
  },
  (error) => {
    if (error.config) clearTimeout((error.config as any).timer);
    if (toastId) toast.dismiss(toastId);

    if (error.code === 'ECONNABORTED') {
      toast.error('Server cavab vermədi. Yenidən cəhd edin.');
    } else {
      toast.error(error.response?.data?.message || 'Xəta baş verdi!');
    }
    return Promise.reject(error);
  }
);

export default api;