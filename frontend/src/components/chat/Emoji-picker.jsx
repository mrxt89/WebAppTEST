'use client';

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";
import Picker from '@emoji-mart/react';
import data from "@emoji-mart/data";

function EmojiPicker({ onChange, className, disabled }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div 
          className={className || "cursor-pointer p-2 rounded-full hover:bg-gray-100"} 
          role="button"
          tabIndex={0}
          aria-label="Pick emoji"
        >
          <Smile className="h-5 w-5 text-muted-foreground hover:text-foreground transition" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full custom-popover-content p-0 border-none">
        <Picker 
          emojiSize={24}
          theme="light"
          data={data}
          maxFrequentRows={1}
          onEmojiSelect={(emoji) => onChange(emoji.native)}
          previewPosition="none"
          skinTonePosition="none"
        />
      </PopoverContent>
    </Popover>
  );
}

export default EmojiPicker;