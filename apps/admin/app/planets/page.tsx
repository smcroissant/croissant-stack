"use client";

import { useState } from "react";
import { usePlanets, useCreatePlanet } from "../hooks/use-planets";
import { useAuth } from "../providers/auth-provider";
import { AuthRequiredDialog } from "../components/auth-required-dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Globe, Plus, Orbit, Calendar, Loader2 } from "lucide-react";

export default function PlanetsPage() {
  const { session } = useAuth();
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlanet, setNewPlanet] = useState({ name: "", description: "" });

  // Fetch planets using custom hook
  const {
    data: planets,
    isLoading,
    isError,
    error,
    refetch,
  } = usePlanets();

  // Create planet mutation using custom hook
  const createPlanetMutation = useCreatePlanet();

  const handleCreateClick = () => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    setIsCreateOpen(true);
  };

  const handleCreatePlanet = async () => {
    if (!newPlanet.name.trim()) return;
    
    createPlanetMutation.mutate(
      {
        name: newPlanet.name.trim(),
        description: newPlanet.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewPlanet({ name: "", description: "" });
        },
      }
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b mb-6">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Globe className="w-6 h-6 text-white" />
            </div>
            Planets
          </h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateClick} className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                <Plus className="w-4 h-4" />
                Add Planet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Orbit className="w-5 h-5 text-indigo-500" />
                  Create New Planet
                </DialogTitle>
                <DialogDescription>
                  Add a new planet to your cosmic collection.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Planet Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Kepler-442b"
                    value={newPlanet.name}
                    onChange={(e) =>
                      setNewPlanet({ ...newPlanet, name: e.target.value })
                    }
                    className="focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="A rocky exoplanet in the habitable zone..."
                    value={newPlanet.description}
                    onChange={(e) =>
                      setNewPlanet({ ...newPlanet, description: e.target.value })
                    }
                    className="min-h-[100px] focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlanet}
                  disabled={!newPlanet.name.trim() || createPlanetMutation.isPending}
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  {createPlanetMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Create Planet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <Globe className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg font-medium mb-2">Failed to load planets</p>
          <p className="text-muted-foreground mb-4">
            {error?.message || "An unexpected error occurred"}
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </div>
      ) : planets && planets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planets.map((planet, index) => (
            <Card
              key={planet.id}
              className="group overflow-hidden border-2 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, 
                          hsl(${(index * 47) % 360}, 70%, 50%), 
                          hsl(${((index * 47) + 40) % 360}, 70%, 40%))`,
                      }}
                    >
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-indigo-500 transition-colors">
                        {planet.name}
                      </CardTitle>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Orbit className="w-3 h-3 mr-1" />
                    Planet
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {planet.description ? (
                  <CardDescription className="line-clamp-3">
                    {planet.description}
                  </CardDescription>
                ) : (
                  <CardDescription className="italic text-muted-foreground/60">
                    No description available
                  </CardDescription>
                )}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Created {formatDate(planet.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full mb-6">
            <Globe className="w-12 h-12 text-indigo-500" />
          </div>
          <p className="text-xl font-medium mb-2">No planets discovered yet</p>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start exploring the cosmos by adding your first planet to the collection.
          </p>
          <Button onClick={handleCreateClick} className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
            <Plus className="w-4 h-4" />
            Discover First Planet
          </Button>
        </div>
      )}

      <AuthRequiredDialog
        open={showAuthRequired}
        onOpenChange={setShowAuthRequired}
      />
    </div>
  );
}

