import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle } from "lucide-react";
import { useWikiDocs } from "@/context/WikiDocsContext";
import WikiDocsPanel from "./WikiDocsPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Pulsante per aprire il pannello di documentazione wiki
 * Si integra automaticamente con il WikiContext per mostrare la documentazione pertinente
 */
const WikiHelpButton = ({ variant = "ghost", size = "sm", showLabel = false }) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const { pageId, componentKey } = useWikiDocs();

  const handleClick = () => {
    if (!pageId) {
      console.warn("No pageId available for wiki documentation");
      return;
    }
    setPanelOpen(true);
  };

  // Non mostrare il pulsante se non c'è un pageId
  if (!pageId) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={handleClick}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              {showLabel && <span>Documentazione</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Visualizza documentazione</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <WikiDocsPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        pageId={pageId}
        currentComponentKey={componentKey}
      />
    </>
  );
};

export default WikiHelpButton;
