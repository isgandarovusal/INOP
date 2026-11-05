import axios from "axios";
import toast from "react-hot-toast";
import { invalidateAggregates, isAggregateMutation } from "./aggregateCache";
import { clearClientSession } from "./clientSession";

declare module "axios" {
  interface AxiosRequestConfig { suppressErrorToast?: boolean }
}

const TOKEN_KEY = "inop_auth_token";


const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3001/api",
  timeout: 40000,
});

api.interceptors.request.use((config) => {
  if (isAggregateMutation(config.method, config.url)) invalidateAggregates();
  const token = localStorage.getItem(TOKEN_KEY);

  if (token && config.headers.Authorization === undefined) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (isAggregateMutation(response.config.method, response.config.url)) invalidateAggregates();
    return response;
  },
  (error) => {
    if (isAggregateMutation(error.config?.method, error.config?.url)) invalidateAggregates();
    if (axios.isCancel(error)) return Promise.reject(error);
    if ([401,403].includes(error.response?.status)) invalidateAggregates();
    if (error.response?.status === 401) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && error.config?.headers?.Authorization === `Bearer ${token}`) {
        localStorage.removeItem(TOKEN_KEY);
        clearClientSession();
        window.dispatchEvent(new CustomEvent("inop:auth-expired"));
      }

      return Promise.reject(error);
    }

    // HR pages classify errors locally in the active language; do not duplicate
    // their state with raw server/request messages. Other modules keep defaults.
    if (error.config?.suppressErrorToast || /^\/(?:jobs|candidates|applications|hr)(?:[/?]|$)/.test(error.config?.url || '')) return Promise.reject(error);

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
