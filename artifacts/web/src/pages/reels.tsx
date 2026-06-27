import { MainLayout } from "@/components/layout/main-layout";
import {
  useListReels,
  useLikeReel,
  useUnlikeReel,
  getListReelsQueryKey,
} from "@workspace/api-client-react";
import { Heart, MessageCircle, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function ReelsPage() {
  const { data: reels, isLoading } = useListReels();
  const likeReel = useLikeReel();
  const unlikeReel = useUnlikeReel();
  const queryClient = useQueryClient();

  const toggleLike = (id: number, liked: boolean) => {
    const onSettled = () =>
      queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
    if (liked) {
      unlikeReel.mutate({ id }, { onSuccess: onSettled });
    } else {
      likeReel.mutate({ id }, { onSuccess: onSettled });
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col items-center gap-6 pb-20 animate-in fade-in zoom-in-95 duration-500">
        {isLoading ? (
          <div className="py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : reels?.length === 0 ? (
          <div className="py-20 text-muted-foreground">No reels available.</div>
        ) : (
          reels?.map((reel) => (
            <div key={reel.id} className="relative w-full max-w-md h-[80vh] bg-black rounded-2xl overflow-hidden shadow-xl flex shrink-0">
              <video 
                src={reel.videoUrl} 
                className="w-full h-full object-cover" 
                controls 
                autoPlay={false}
                loop 
                muted 
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-4 left-4 right-16 text-white z-10">
                <div className="flex items-center gap-2 mb-2">
                  <img src={reel.author.avatarUrl || ""} className="w-10 h-10 rounded-full object-cover border border-white/20" alt="" />
                  <span className="font-bold text-sm drop-shadow-md">{reel.author.displayName}</span>
                  <Button variant="secondary" size="sm" className="h-6 text-xs bg-white/20 hover:bg-white/30 text-white border-none ml-2">Follow</Button>
                </div>
                <p className="text-sm drop-shadow-md line-clamp-2">{reel.caption}</p>
              </div>

              <div className="absolute bottom-4 right-4 flex flex-col items-center gap-4 z-10">
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => toggleLike(reel.id, reel.viewerHasLiked)}
                    className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors"
                  >
                    <Heart className={`w-6 h-6 ${reel.viewerHasLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                  <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">{reel.likeCount}</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </button>
                  <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">{reel.commentCount}</span>
                </div>

                <div className="flex flex-col items-center">
                  <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors">
                    <Share2 className="w-6 h-6 text-white" />
                  </button>
                  <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">Share</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
}