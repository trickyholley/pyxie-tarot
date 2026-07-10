import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { NotFound } from "@/ui";

const router = createBrowserRouter([
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
