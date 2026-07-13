import {NotFound} from "@pyxie/ui";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Home from "@/Home.tsx";
import Login from "./Login.tsx";
import Users from "./Users.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/users",
    element: <Users />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
