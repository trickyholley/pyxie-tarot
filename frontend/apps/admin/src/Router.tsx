import {Login} from "@pyxie/providers";
import {NotFound} from "@pyxie/ui";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Users from "./Users.tsx";

const router = createBrowserRouter([
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
