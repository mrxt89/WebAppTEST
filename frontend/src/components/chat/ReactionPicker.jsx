// Improved ReactionPicker.jsx
import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";

// Common reaction emojis - expanded selection
const commonReactions = [
  // Positive reactions
  { emoji: "👍", name: "Mi piace" },
  { emoji: "❤️", name: "Cuore" },
  { emoji: "👏", name: "Applausi" },
  { emoji: "🙏", name: "Grazie" },
  { emoji: "🔥", name: "Fire" },
  { emoji: "✅", name: "Fatto!" },
  { emoji: "🥳", name: "Festa" },

  // Negative or neutral reactions
  { emoji: "👎", name: "Non mi piace" },
  { emoji: "😮", name: "Sorpreso" },
  { emoji: "😢", name: "Triste" },
  { emoji: "😡", name: "Arrabbiato" },

  // Work-related reactions
  { emoji: "👀", name: "Vedo" },
  { emoji: "⚠️", name: "Attenzione" },
  { emoji: "⏰", name: "Urgente" },
  { emoji: "🔝", name: "Top" },
  { emoji: "💯", name: "Perfetto" },
];

// Group emojis into categories
const emojiCategories = [
  {
    title: "Positive",
    emojis: ["👍", "❤️", "👏", "🙏", "🔥", "✅", "🥳", "💯"],
  },
  {
    title: "Espressioni",
    emojis: ["😊", "😂", "😮", "😢", "😡", "🤔", "😎", "👀"],
  },
  {
    title: "Lavoro",
    emojis: ["⚠️", "⏰", "🔝", "📌", "📊", "🚀", "🎯", "🔄"],
  },
];

function ReactionPicker({ onReactionSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  // Handle reaction selection and close the picker
  const handleReactionClick = (emoji) => {
    if (onReactionSelect) {
      onReactionSelect(emoji);
    }
    setIsOpen(false);
  };

  // Handle clicking outside to close the picker
  const handleBlur = () => {
    // Small delay to allow clicks to register
    setTimeout(() => setIsOpen(false), 100);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      className="reaction-picker-popover z-[9999]"
    >
      <PopoverTrigger
        asChild
        className="reaction-trigger"
        id="reaction-trigger"
      >
        <button
          type="button"
          className="reaction-button p-1.5 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Aggiungi reazione"
          title="Più reazioni"
        >
          <SmilePlus className="h-4 w-4 text-gray-500 hover:text-gray-700 transition" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="reaction-picker p-3 max-w-[250px] z-[9999]"
        onBlur={handleBlur}
      >
        <div className="mb-2 text-xs text-gray-500 font-medium">
          Seleziona una reazione
        </div>
        <div className="flex flex-wrap gap-1">
          {commonReactions.map((reaction) => (
            <button
              key={reaction.emoji}
              className="reaction-item p-1.5 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              onClick={() => handleReactionClick(reaction.emoji)}
              title={reaction.name}
            >
              <span className="text-xl">{reaction.emoji}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ReactionPicker;
