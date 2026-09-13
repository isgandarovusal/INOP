import axios from "axios";
import toast from "react-hot-toast";

const TOKEN_KEY = "inop_auth_token";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3001/api",
  timeout: 40000,
});

let toastId: string | null = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const timer = setTimeout(() => {
    toastId = toast.loading(
      "Server oyandırılır, lütfən gözləyin (~20-30 san)...",
    );
  }, 3000);

  (config as any).timer = timer;

  return config;
});

api.interceptors.response.use(
  (response) => {
    clearTimeout((response.config as any).timer);

    if (toastId) {
      toast.dismiss(toastId);
      toastId = null;
    }

    return response;
  },
  (error) => {
    if (error.config) {
      clearTimeout((error.config as any).timer);
    }

    if (toastId) {
      toast.dismiss(toastId);
      toastId = null;
    }

    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);

      window.dispatchEvent(
        new CustomEvent("inop:auth-expired"),
      );

      return Promise.reject(error);
    }

    if (error.code === "ECONNABORTED") {
      toast.error("Server cavab vermədi. Yenidən cəhd edin.");
    } else {
      toast.error(
        error.response?.data?.message || "Xəta baş verdi!",
      );
    }

    return Promise.reject(error);
  },
);

export default api;
