
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Filter, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { SeverityLevel } from "@/types";
import { useEpisodes } from "@/hooks/useEpisodes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const History = () => {
  const navigate = useNavigate();
  const { episodes, loading, error, refetch, deleteEpisode } = useEpisodes();
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const getSeverityColor = (level: SeverityLevel) => {
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-yellow-100 text-yellow-800",
      3: "bg-orange-100 text-orange-800", 
      4: "bg-red-100 text-red-800",
      5: "bg-purple-100 text-purple-800"
    };
    return colors[level] || colors[3];
  };

  const getSeverityLabel = (level: SeverityLevel) => {
    const labels = {
      1: "Mild",
      2: "Moderate", 
      3: "Medium",
      4: "Severe",
      5: "Extreme"
    };
    return labels[level] || "Medium";
  };

  const filteredAndSortedEpisodes = episodes
    .filter(episode => {
      const matchesSearch = episode.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          episode.bodyAreas.some(area => area.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          episode.triggers.some(trigger => (trigger?.label || '').toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSeverity = severityFilter === "all" || episode.severityLevel.toString() === severityFilter;
      
      return matchesSearch && matchesSeverity;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.datetime.getTime() - b.datetime.getTime();
        case "severity-high":
          return b.severityLevel - a.severityLevel;
        case "severity-low":
          return a.severityLevel - b.severityLevel;
        default: // newest
          return b.datetime.getTime() - a.datetime.getTime();
      }
    });

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 sm:px-6 max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">Episode History</h1>
          <div className="grid gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 sm:h-32 animate-pulse bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 sm:px-6 max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">Episode History</h1>
          <div className="text-center py-8 sm:py-12">
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-medium text-destructive">Unable to load episodes</h3>
              <p className="text-sm sm:text-base text-muted-foreground px-4">{error}</p>
              <Button onClick={refetch} className="w-full sm:w-auto">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Episode History</h1>
          <Button onClick={() => navigate("/log-episode")} className="w-full sm:w-auto">
            Log New Episode
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filter & Search
            </CardTitle>
            <CardDescription className="text-sm">
              Find specific episodes using the filters below
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search episodes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Severity Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="1">Mild (1)</SelectItem>
                    <SelectItem value="2">Moderate (2)</SelectItem>
                    <SelectItem value="3">Medium (3)</SelectItem>
                    <SelectItem value="4">Severe (4)</SelectItem>
                    <SelectItem value="5">Extreme (5)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="severity-high">Highest Severity</SelectItem>
                    <SelectItem value="severity-low">Lowest Severity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 sm:space-y-4">
          {filteredAndSortedEpisodes.length === 0 ? (
            <Card className="text-center py-8 sm:py-12">
              <CardContent>
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No Episodes Found</h3>
                <p className="text-sm text-muted-foreground mb-4 px-4">
                  {episodes.length === 0 
                    ? "You haven't logged any episodes yet. Start by logging your first episode!"
                    : "No episodes match your current filters. Try adjusting your search criteria."
                  }
                </p>
                <Button onClick={() => navigate("/log-episode")} className="w-full sm:w-auto">
                  Log Your First Episode
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedEpisodes.map((episode) => (
              <Card 
                key={episode.id} 
                className="hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => navigate(`/episode/${episode.id}`)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {format(episode.datetime, "EEEE, MMMM d, yyyy")}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getSeverityColor(episode.severityLevel)} text-xs`}>
                            {getSeverityLabel(episode.severityLevel)}
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {format(episode.datetime, "h:mm a")}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                        {episode.bodyAreas.slice(0, 3).map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                        {episode.bodyAreas.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{episode.bodyAreas.length - 3} more
                          </Badge>
                        )}
                      </div>

                      {episode.notes && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {episode.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Episode?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the episode record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEpisode(episode.id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default History;
