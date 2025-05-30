import { CircleHelp } from "lucide-react";
import { useWikiContext } from "@/components/wiki/WikiContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NotificationSidebarHeader = ({ isFilterExpanded }) => {
  const { openWiki } = useWikiContext();

  const handleOpenWiki = (e) => {
    e.stopPropagation();
    openWiki("notifications", true);
  };

  return (
    <div
      className="header"
    >
      <div className="flex justify-between items-center p-2">
        <div
          className="text-lg font-semibold"
          id="notification-sidebar-title"
        >
          Notifiche
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpenWiki}
                className="relative text-black hover:bg-gray-100 rounded-full transition-colors flex items-center"
                aria-label="Aiuto e Wiki"
                id="notification-sidebar-wiki-button"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Guida notifiche</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default NotificationSidebarHeader; 