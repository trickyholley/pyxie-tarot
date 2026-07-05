import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { getDBBrowserRoutes } from "./db-browser-router.tsx";

function NotFound() {
  return <h1>404 — Page Not Found</h1>;
}

const router = createBrowserRouter([
  {
    path: "/",
    children: [getDBBrowserRoutes(), { path: "*", element: <NotFound /> }],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
