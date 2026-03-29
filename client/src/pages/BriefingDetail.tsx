import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

export default function BriefingDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: briefing, isLoading } = useQuery({
    queryKey: ["/api/briefings", id],
    queryFn: async () => {
      const res = await fetch(`/api/briefings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch briefing");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-dark-card rounded w-1/3" />
          <div className="h-4 bg-dark-card rounded w-2/3" />
          <div className="h-64 bg-dark-card rounded" />
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl text-white mb-4">Briefing not found</h2>
        <Link href="/archive">
          <a className="text-gold hover:underline">Back to Archive</a>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/archive">
        <a className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Archive
        </a>
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2">{briefing.title || "Market Briefing"}</h1>
      <div className="flex items-center gap-4 text-[#888] text-sm mb-6">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {briefing.date}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          6:00 AM ET
        </span>
      </div>
      <div className="prose prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: briefing.content || "" }} />
      </div>
    </div>
  );
}