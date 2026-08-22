import { AuthProvider, LoadingProvider, ThemeProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Landing from "@/Landing.tsx";
import AndroidSettings from "./AndroidSettings.tsx";
import Changelog from "./Changelog.tsx";
import FontLoader from "./components/FontLoader.tsx";
import NativeVersionGate from "./components/NativeVersionGate.tsx";
import ConfirmEmail from "./ConfirmEmail.tsx";
import ContactForm from "./ContactForm.tsx";
import CreateEntryPage from "./create-entry/CreateEntryPage.tsx";
import DeckPicker from "./decks/DeckPicker.tsx";
import DeckViewer from "./decks/DeckViewer.tsx";
import DiaryPage from "./diary/DiaryPage.tsx";
import EntryDetail from "./diary/EntryDetail.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Home from "./Home.tsx";
import Layout from "./Layout.tsx";
import { useNativeBackButton } from "./lib/nativeBackButton.ts";
import { AppRoute } from "./lib/routes.ts";
import Login from "./Login.tsx";
import PrivacyPolicy from "./marketing/PrivacyPolicy.tsx";
import NoAuthLayout from "./NoAuthLayout.tsx";
import Profile from "./Profile.tsx";
import RedirectIfAuthed from "./RedirectIfAuthed.tsx";
import ResendConfirmation from "./ResendConfirmation.tsx";
import ResetPassword from "./ResetPassword.tsx";
import Settings from "./Settings.tsx";
import SpreadEditor from "./SpreadEditor.tsx";
import SpreadsSettings from "./SpreadsSettings.tsx";
import ThemeEditor from "./ThemeEditor.tsx";
import ThemeSettings from "./ThemeSettings.tsx";

function NotFoundPage() {
  const { t } = useTranslation("common");
  return <NotFound strings={{ title: t("notFound.title"), message: t("notFound.message") }} />;
}

// Thin wrapper to ensure Android back gesture works
// Also handles app version block
function Root() {
  useNativeBackButton();
  return (
    <NativeVersionGate>
      <Outlet />
    </NativeVersionGate>
  );
}

// Wraps every route that needs a session
// Excludes marketing pages such as Landing and PrivacyPolicy
// Separate from theme strictly for Login
function AuthedApp() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

// Wraps the no-auth pages: AuthProvider here is optional-hydration only (e.g. Contact pre-fills the
// account email when one exists), never a login requirement - LoadingProvider backs Contact's submit spinner
function PublicApp() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <NoAuthLayout />
      </LoadingProvider>
    </AuthProvider>
  );
}

// Wraps the routes that render the current user's chosen look
function ThemedApp() {
  return (
    <LoadingProvider>
      <ThemeProvider>
        <FontLoader />
        <Layout />
      </ThemeProvider>
    </LoadingProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        // No-auth pages
        element: <PublicApp />,
        children: [
          { path: AppRoute.Root, element: <Landing /> },
          { path: AppRoute.PrivacyPolicy, element: <PrivacyPolicy /> },
          { path: AppRoute.ForgotPassword, element: <ForgotPassword /> },
          { path: AppRoute.ResetPassword, element: <ResetPassword /> },
          { path: AppRoute.ConfirmEmail, element: <ConfirmEmail /> },
          { path: AppRoute.ResendConfirmation, element: <ResendConfirmation /> },
          { path: AppRoute.Contact, element: <ContactForm /> },
          { path: AppRoute.Changelog, element: <Changelog /> },
        ],
      },
      {
        // Authed pages
        element: <AuthedApp />,
        children: [
          {
            element: <RedirectIfAuthed />,
            children: [{ path: AppRoute.Login, element: <Login /> }],
          },
          {
            element: <ThemedApp />,
            children: [
              { path: AppRoute.Home, element: <Home /> },
              { path: AppRoute.Reading, element: <CreateEntryPage /> },
              { path: AppRoute.Diary, element: <DiaryPage /> },
              { path: AppRoute.DiaryEntry, element: <EntryDetail /> },
              { path: AppRoute.Decks, element: <DeckPicker /> },
              { path: AppRoute.DeckViewer, element: <DeckViewer /> },
              { path: AppRoute.Settings, element: <Settings /> },
              { path: AppRoute.Profile, element: <Profile /> },
              { path: AppRoute.Appearance, element: <ThemeSettings /> },
              { path: AppRoute.AppearanceCreate, element: <ThemeEditor /> },
              { path: AppRoute.Spreads, element: <SpreadsSettings /> },
              { path: AppRoute.SpreadsCreate, element: <SpreadEditor /> },
              { path: AppRoute.SpreadEdit, element: <SpreadEditor /> },
              { path: AppRoute.AndroidApp, element: <AndroidSettings /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
