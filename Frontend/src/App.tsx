import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./Context/AuthContext";
import ROUTES from "./Routes/Routes";

const router = createBrowserRouter(ROUTES);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
