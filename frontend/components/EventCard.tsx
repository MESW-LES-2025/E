import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type EventCardProps = {
  id: number;
  name: string;
  date: string;
  location?: string;
};

export default function EventCard({
  id,
  name,
  date,
  location,
}: EventCardProps) {
  return (
    <Card
      key={id}
      className="shadow hover:shadow-lg transition w-full max-w-sm"
    >
      <CardContent>
        <h3 className="text-xl font-semibold">{name}</h3>
        <p className="text-sm text-gray-600">
          {new Date(date).toLocaleString()}
        </p>
        {location && (
          <p className="text-sm text-gray-700 mt-1">📍 {location}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline">View Details</Button>
      </CardFooter>
    </Card>
  );
}
