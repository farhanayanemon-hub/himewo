import { MainLayout } from "@/components/layout/main-layout";
import { useListStories } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function StoriesPage() {
  const { data: storyGroups, isLoading } = useListStories();
  const [activeIndex, setActiveIndex] = useState(0);

  if (isLoading) {
    return <MainLayout><div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!storyGroups || storyGroups.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <p className="text-muted-foreground">No stories to show right now.</p>
          <Link href="/">
            <Button>Go Back Home</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const activeGroup = storyGroups[activeIndex];
  // Simple viewer for now: taking the first story of the active group
  const activeStory = activeGroup.stories[0];

  return (
    <MainLayout>
      <div className="h-[80vh] flex items-center justify-center bg-black/5 rounded-2xl relative animate-in fade-in">
        <div className="relative w-full max-w-sm h-full max-h-[800px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Progress bar */}
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
            {activeGroup.stories.map((s, i) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className={`h-full bg-white ${i === 0 ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>

          {/* Author Header */}
          <div className="absolute top-6 left-4 right-4 flex items-center gap-3 z-20">
            <img src={activeGroup.author.avatarUrl || ""} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
            <div>
              <div className="font-bold text-white text-sm drop-shadow-md">{activeGroup.author.displayName}</div>
            </div>
          </div>

          {/* Media */}
          {activeStory.mediaType === "video" ? (
             <video src={activeStory.mediaUrl} className="w-full h-full object-cover" autoPlay loop muted />
          ) : (
             <img src={activeStory.mediaUrl} className="w-full h-full object-cover" alt="" />
          )}

          {/* Caption */}
          {activeStory.caption && (
            <div className="absolute bottom-6 left-4 right-4 text-white font-medium drop-shadow-md z-20 text-center bg-black/30 backdrop-blur-sm p-3 rounded-xl">
              {activeStory.caption}
            </div>
          )}

          {/* Navigation Overlay */}
          <div className="absolute inset-0 flex z-10">
            <div 
              className="w-1/2 h-full cursor-pointer" 
              onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
            />
            <div 
              className="w-1/2 h-full cursor-pointer" 
              onClick={() => setActiveIndex(Math.min(storyGroups.length - 1, activeIndex + 1))}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}