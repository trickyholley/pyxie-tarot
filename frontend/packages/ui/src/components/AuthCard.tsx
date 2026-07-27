// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "./base-ui";
import Logo from "./Logo";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm gap-4 sm:max-w-md">
        <div className="flex justify-center">
          <Logo className="size-18" />
        </div>
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children}
      </Card>
    </div>
  );
}
