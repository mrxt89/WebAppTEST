import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import MemberRoleSelect from "./MemberRoleSelect";

export const TeamMemberWithRole = ({
  member,
  onRemove,
  onRoleUpdate,
  canEditRole,
  currentUserId,
}) => {
  const isCurrentUser = member.UserID === parseInt(currentUserId);
  const handleRoleUpdate = async (updatedMember) => {
    if (onRoleUpdate) {
      return await onRoleUpdate(updatedMember);
    }
    return false;
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };


  return (
    <div className="group flex flex-col p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
      {/* Top row - Avatar and name */}
      <div className="flex items-center gap-3 mb-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-100 text-gray-700 text-sm font-medium">
            {getInitials(member.userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 text-sm truncate">
              {member.userName}
            </h4>
            {isCurrentUser && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5">
                Tu
              </Badge>
            )}
          </div>
        </div>
        {onRemove && !isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
            onClick={() => onRemove(member.ProjectMemberID)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Bottom row - Role selector */}
      <div className="flex justify-start">
        <MemberRoleSelect
          member={member}
          onRoleUpdate={handleRoleUpdate}
          disabled={!canEditRole}
        />
      </div>
    </div>
  );
};

export default TeamMemberWithRole;
