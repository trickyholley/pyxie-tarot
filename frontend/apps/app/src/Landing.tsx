// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, Card, CardContent, Logo } from "@ui/components";
import { Link } from "react-router-dom";
import screenshot from "@/assets/pyxie-screenshot.jpg";
import { AppRoute } from "@/lib/routes.ts";

export default function Landing() {
  return (
    <div className="max-w-2xl mx-auto my-8 text-center">
      <div className="m-4 flex flex-col items-center">
        <Logo className="size-20 mb-8" />
        <h1 className="text-3xl font-bold italic">Welcome to Pyxie!</h1>
        <h2 className="text-xl italic">Your personal diary companion to tarot readings!</h2>
      </div>
      <Card className="m-4 p-4">
        <CardContent className="flex flex-col items-center gap-4 text-lg">
          <p>
            Pyxie is a pretty small app. Just a daily spread, that's it! Well, there is some personalizing like color
            themes and spread templates. The idea is simple: make <i>your</i> daily reading actually <i>yours</i>!
          </p>
          <Button
            className="w-64"
            disabled
            variant="secondary"
            nativeButton={false}
            render={<Link to={AppRoute.Root} />}
          >
            <span className="line-through">Try a quick spread</span> Coming soon!
          </Button>
          <Button className="w-64" nativeButton={false} render={<Link to={AppRoute.Login} />}>
            Login or make an account
          </Button>
          <hr className="w-full" />
          <img
            alt="A screenshot of a 3-card spread in the Pyxie app"
            className="rounded-lg h-110 w-54 border border-primary"
            src={screenshot}
          />
        </CardContent>
      </Card>
    </div>
  );
}
