import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EventCardProps {
  event: {
    id: number;
    name: string;
    date: string;
    location?: string;
    status?: string;
    category: string;
    interest_count?: number;
    participant_count?: number;
  };
  onViewDetails: (eventId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  SOCIAL: "bg-blue-500 text-white",
  ACADEMIC: "bg-green-500 text-white",
  TRAVEL: "bg-yellow-500 text-black",
  SPORTS: "bg-red-500 text-white",
  CULTURAL: "bg-purple-500 text-white",
  VOLUNTEERING: "bg-teal-500 text-white",
  NIGHTLIFE: "bg-pink-500 text-white",
};

export default function EventCard({ event, onViewDetails }: EventCardProps) {
  return (
    <Card className="shadow transition relative hover:shadow-lg">
      {event.status === "Canceled" && (
        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md">
          Canceled
        </span>
      )}

      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">{event.name}</h3>
          <Badge
            className={
              CATEGORY_COLORS[event.category] || "bg-gray-500 text-white"
            }
          >
            {event.category}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          {new Date(event.date).toLocaleString()}
        </p>
        {event.location && (
          <p className="text-sm text-gray-700 mt-1">📍 {event.location}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {event.participant_count !== undefined && (
            <span>👥 {event.participant_count} participants</span>
          )}
          {event.interest_count !== undefined && (
            <span>❤️ {event.interest_count} interested</span>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          onClick={() => onViewDetails(String(event.id))}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
