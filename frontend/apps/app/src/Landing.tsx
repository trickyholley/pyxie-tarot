// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card, CardContent, Logo } from "@ui/components";

export default function Landing() {
  return (
    <>
      <div className="h-12 bg-white border border-b-accent-ring"></div>
      <div className="max-w-2xl mx-auto my-8">
        <div className="m-4">
          <Logo className="size-20 mb-8" />
          <h1 className="text-3xl font-bold italic">Welcome to Pyxie!</h1>
          <h2 className="text-xl italic">Your personal diary companion to tarot readings!</h2>
        </div>
        <Card className="m-4 p-4">
          <CardContent className="flex flex-col gap-4 text-lg">
            <p>
              Pyxie is a pretty small app. Just a daily spread, that's it! Well, there is some customization like making
              your own color theme and creating spread templates. The idea is simple: make <i>your</i> daily reading
              actually <i>yours</i>!
            </p>
            <p>
              If customizing isn't your thing, that's cool too! Use our ready-made spreads and decks for no-pressure
              readings anytime. If later you decide you want to track or personalize your entries, you can create a free
              account then.
            </p>
            <p>
              We hope to keep Pyxie free for as long as it lives. No ads, no subscription for the core features, the
              only thing we charge for is completely optional image hosting (if you want to attach pics to your entries
              or use your own tarot decks, for instance). Finances shouldn't be a barrier to your well-being.
            </p>
            <p>If Pyxie speaks to you, we hope you'll stay for as long as it enriches you. Thank you!</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
