// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from "@ui/components/base-ui/button";
import { CardFooter } from "@ui/components/base-ui/card";
import { Home, RotateCw } from "lucide-react";
import LogoCard from "./LogoCard";

export interface RouteErrorStrings {
  title: string;
  message: string;
  retry: string;
  goHome: string;
}

interface RouteErrorProps {
  strings: RouteErrorStrings;
  homeHref: string;
}

export default function RouteError({ strings, homeHref }: RouteErrorProps) {
  return (
    <LogoCard title={strings.title} description={strings.message}>
      <CardFooter className="flex-wrap justify-end gap-2">
        <Button variant="outline" nativeButton={false} render={<a href={homeHref} />}>
          <Home data-icon="inline-start" />
          {strings.goHome}
        </Button>
        <Button type="button" onClick={() => window.location.reload()}>
          <RotateCw data-icon="inline-start" />
          {strings.retry}
        </Button>
      </CardFooter>
    </LogoCard>
  );
}
