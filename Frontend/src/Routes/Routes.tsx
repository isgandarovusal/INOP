import Add from "../Pages/Admin/Add/Add";
import AdminRoot from "../Pages/Admin/AdminRoot";
import Dashboard from "../Pages/Admin/Dashboard/Dashboard";
import Edit from "../Pages/Admin/Edit/Edit";
import Products from "../Pages/Admin/Products/Products";
import Home from "../Pages/Site/Home/Home";
import Shop from "../Pages/Site/Shop/Shop";
import SiteRoot from "../Pages/Site/SiteRoot";
import type { RouteObject } from "react-router-dom";

const ROUTES: RouteObject[] = [
  {
    path: "/",
    element: <SiteRoot />,
    children: [
      {
        path: "",
        element: <Home />,
      },
      {
        path: "shop",
        element: <Shop />,
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminRoot />,
    children: [
      {
        path:"",
        element:<Dashboard/>
      },
      {
        path: "products",
        element: <Products />,
      },
      {
        path: "add",
        element: <Add />,
      },
      {
        path: "edit/:id",
        element: <Edit />,
      },
    ],
  },
];
export default ROUTES;
