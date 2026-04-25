import { Link } from "react-router-dom";
import { PlayCircle, FileText, Images, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Resource = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_image_url: string | null;
  resource_type: string;
  difficulty: string;
  duration_minutes: number;
};

const TYPE_ICON: Record<string, any> = {
  video: PlayCircle,
  article: FileText,
  gallery: Images,
};

export const ResourceCard = ({ resource, completed }: { resource: Resource; completed?: boolean }) => {
  const Icon = TYPE_ICON[resource.resource_type] || FileText;
  return (
    <Link
      to={`/vendor/resources/r/${resource.slug}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {resource.cover_image_url ? (
          <img
            src={resource.cover_image_url}
            alt={resource.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Icon className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="gap-1 capitalize text-[10px]">
            <Icon className="h-3 w-3" /> {resource.resource_type}
          </Badge>
        </div>
        {completed && (
          <div className="absolute top-2 right-2 bg-success text-success-foreground rounded-full p-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">{resource.title}</h3>
        {resource.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{resource.summary}</p>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
          <span className="capitalize">{resource.difficulty}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{resource.duration_minutes} min</span>
        </div>
      </div>
    </Link>
  );
};

export default ResourceCard;
