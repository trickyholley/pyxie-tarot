import { Logo, Toaster } from "@pyxie/ui";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav.tsx";

export default function Layout() {
  return (
    <>
      <div className="pb-16">
        <Logo className="mt-6 mb-6 ml-4" />
        <Outlet />
      </div>
      <BottomNav />
      <Toaster />
    </>
  );
}
