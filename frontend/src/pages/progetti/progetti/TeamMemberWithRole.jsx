import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-blue-100 text-blue-800">
            {getInitials(member.userName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{member.userName}</p>
          <div className="flex items-center gap-2 mt-1">
            <MemberRoleSelect
              member={member}
              onRoleUpdate={handleRoleUpdate}
              disabled={!canEditRole}
            />
            {isCurrentUser && (
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                Tu
              </span>
            )}
          </div>
        </div>
      </div>

      {onRemove && !isCurrentUser && (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(member.ProjectMemberID)}
        >
          Rimuovi
        </Button>
      )}
    </div>
  );
};

export default TeamMemberWithRole;
