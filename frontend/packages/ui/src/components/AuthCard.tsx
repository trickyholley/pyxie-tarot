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
    <div className="max-w-lg mx-auto mt-32">
      {logoSrc && (
        <div className="flex justify-center mb-6">
          <img src={logoSrc} alt={logoAlt ?? "Logo"} className="size-24" />
        </div>
      )}
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children}
      </Card>
    </div>
  );
}
