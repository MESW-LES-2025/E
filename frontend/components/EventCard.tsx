import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Heart } from "lucide-react";

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SOCIAL: {
    bg: "bg-primary/10 dark:bg-primary/20",
    text: "text-primary",
    border: "border-primary/30",
  },
  ACADEMIC: {
    bg: "bg-chart-5/10 dark:bg-chart-5/20",
    text: "text-chart-5",
    border: "border-chart-5/30",
  },
  TRAVEL: {
    bg: "bg-chart-4/10 dark:bg-chart-4/20",
    text: "text-chart-4",
    border: "border-chart-4/30",
  },
  SPORTS: {
    bg: "bg-destructive/10 dark:bg-destructive/20",
    text: "text-destructive",
    border: "border-destructive/30",
  },
  CULTURAL: {
    bg: "bg-secondary/10 dark:bg-secondary/20",
    text: "text-secondary",
    border: "border-secondary/30",
  },
  VOLUNTEERING: {
    bg: "bg-chart-3/10 dark:bg-chart-3/20",
    text: "text-chart-3",
    border: "border-chart-3/30",
  },
  NIGHTLIFE: {
    bg: "bg-pink-500/10 dark:bg-pink-500/20",
    text: "text-pink-500",
    border: "border-pink-500/30",
  },
};

export default function EventCard({ event, onViewDetails }: EventCardProps) {
  const categoryStyle = CATEGORY_COLORS[event.category] || {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  };

  return (
    <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
      {event.status === "Canceled" && (
        <div className="absolute top-3 right-3 z-10">
          <Badge
            variant="destructive"
            className="font-semibold shadow-lg"
          >
            Canceled
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          <Badge
            className={`${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border} border font-medium`}
          >
            {event.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {new Date(event.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="text-muted-foreground">
            {new Date(event.date).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          {event.participant_count !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">{event.participant_count}</span>
              <span>participants</span>
            </div>
          )}
          {event.interest_count !== undefined && event.interest_count > 0 && (
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
              <span className="font-medium">{event.interest_count}</span>
              <span>interested</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          variant="default"
          className="w-full font-semibold group-hover:scale-105 transition-transform"
          onClick={() => onViewDetails(String(event.id))}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
