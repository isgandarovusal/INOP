import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import RouteLoading from "./Components/RouteLoading";
import { AuthProvider } from "./Context/AuthContext";
import ROUTES from "./Routes/Routes";

const router = createBrowserRouter(ROUTES);

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <Suspense fallback={<RouteLoading />}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  );
}

export default App;