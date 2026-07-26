import { Button, Card, CardContent } from "@pyxie/ui";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center px-4 mt-32">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4">
          <Button size="lg" className="h-12 px-6 text-lg" render={<Link to="/spread?type=daily" />}>
            Daily Spread
          </Button>
          <Button size="lg" className="h-12 px-6 text-lg" render={<Link to="/spread?type=free" />}>
            Free Spread
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
