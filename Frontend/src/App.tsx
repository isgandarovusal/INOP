import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { AuthProvider } from "./Context/AuthContext";
import ROUTES from "./Routes/Routes";

const router = createBrowserRouter(ROUTES);

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <Suspense
        fallback={
          <div className="route-loading" role="status" aria-live="polite">
            <div className="route-loading__shell">
              <div className="route-loading__sidebar" />
              <div className="route-loading__content">
                <div className="route-loading__line route-loading__line--wide" />
                <div className="route-loading__line route-loading__line--medium" />
                <div className="route-loading__card-grid">
                  <div />
                  <div />
                  <div />
                </div>
                <span className="route-loading__text">Yüklənir...</span>
              </div>
            </div>
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  );
}

export default App;