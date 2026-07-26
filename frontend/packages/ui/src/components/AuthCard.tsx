import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "./base-ui";

interface AuthCardProps {
  title: string;
  description?: string;
  logoSrc?: string;
  logoAlt?: string;
  children: ReactNode;
}

export default function AuthCard({ title, description, logoSrc, logoAlt, children }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm gap-4 sm:max-w-md">
        {logoSrc && (
          <div className="flex justify-center">
            <img src={logoSrc} alt={logoAlt ?? "Logo"} className="size-18" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children}
      </Card>
    </div>
  );
}
