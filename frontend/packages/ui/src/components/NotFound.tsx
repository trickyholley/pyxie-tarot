// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from "@ui/components/base-ui/button";
import { CardFooter } from "@ui/components/base-ui/card";
import { Home } from "lucide-react";
import LogoCard from "./LogoCard";

export interface NotFoundStrings {
  title: string;
  message: string;
  goHome: string;
}

interface NotFoundProps {
  strings: NotFoundStrings;
  homeHref: string;
}

export default function NotFound({ strings, homeHref }: NotFoundProps) {
  return (
    <LogoCard title={strings.title} description={strings.message}>
      <CardFooter className="justify-end">
        <Button nativeButton={false} render={<a href={homeHref} />}>
          <Home data-icon="inline-start" />
          {strings.goHome}
        </Button>
      </CardFooter>
    </LogoCard>
  );
}
