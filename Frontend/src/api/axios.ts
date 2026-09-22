import axios from "axios";
import toast from "react-hot-toast";

const TOKEN_KEY = "inop_auth_token";


const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3001/api",
  timeout: 40000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
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
