/**
 * Utility functions for checking user permissions in the project management system
 */

/**
 * Checks if a user has admin or manager permissions for a project
 * @param {Object} project - The project object
 * @param {Number} userId - The user ID to check permissions for
 * @returns {Boolean} - True if the user has admin or manager permissions
 */
export const hasAdminOrManagerPermission = (project, userId) => {
  if (!project || !project.members || !userId) return false;

  const userMember = project.members.find((m) => m.UserID === parseInt(userId));
  return (
    userMember && (userMember.Role === "ADMIN" || userMember.Role === "MANAGER")
  );
};

/**
 * Checks if a user has admin permissions for a project
 * @param {Object} project - The project object
 * @param {Number} userId - The user ID to check permissions for
 * @returns {Boolean} - True if the user has admin permissions
 */
export const hasAdminPermission = (project, userId) => {
  if (!project || !project.members || !userId) return false;

  const userMember = project.members.find((m) => m.UserID === parseInt(userId));
  return userMember && userMember.Role === "ADMIN";
};

/**
 * Checks if the current user can edit a member's role
 * @param {Object} project - The project object
 * @param {Number} currentUserId - The current user ID
 * @param {Number} targetUserId - The ID of the user whose role would be edited
 * @returns {Boolean} - True if the current user can edit the target user's role
 */
export const canEditMemberRole = (project, currentUserId, targetUserId) => {
  if (!project || !project.members || !currentUserId || !targetUserId)
    return false;

  // Get current user's role
  const currentUserMember = project.members.find(
    (m) => m.UserID === parseInt(currentUserId),
  );

  // Get target user's role
  const targetUserMember = project.members.find(
    (m) => m.UserID === parseInt(targetUserId),
  );

  if (!currentUserMember || !targetUserMember) return false;

  // Only ADMIN can change roles
  if (currentUserMember.Role !== "ADMIN") return false;

  // Users cannot change their own role
  if (parseInt(currentUserId) === parseInt(targetUserId)) return false;

  return true;
};

/**
 * Checks if a user can edit a task
 * @param {Object} project - The project object
 * @param {Object} task - The task object
 * @param {Number} userId - The user ID to check permissions for
 * @returns {Boolean} - True if the user can edit the task
 */
export const canEditTask = (project, task, userId) => {
  if (!project || !task || !userId) return false;

  // Check if user is admin or manager
  if (hasAdminOrManagerPermission(project, userId)) return true;

  // Check if task is assigned to the user
  return task.AssignedTo === parseInt(userId);
};

/**
 * Checks if a user can modify a specific task field
 * @param {Object} project - The project object
 * @param {Object} task - The task object
 * @param {Number} userId - The user ID to check permissions for
 * @param {String} fieldName - The name of the field to modify
 * @returns {Boolean} - True if the user can modify the field
 */
export const canModifyTaskField = (project, task, userId, fieldName) => {
  if (!project || !task || !userId || !fieldName) return false;

  // Admin and manager can modify all fields
  if (hasAdminOrManagerPermission(project, userId)) return true;

  // If task is assigned to user (task owner)
  const isTaskOwner = task.AssignedTo === parseInt(userId);

  // Task owners can only modify status and add comments
  if (isTaskOwner) {
    return ["Status", "Comment"].includes(fieldName);
  }

  return false;
};

/**
 * Returns the current user's role in a project
 * @param {Object} project - The project object
 * @param {Number} userId - The user ID
 * @returns {String|null} - The role of the user, or null if not a member
 */
export const getUserRole = (project, userId) => {
  if (!project || !project.members || !userId) return null;

  const userMember = project.members.find((m) => m.UserID === parseInt(userId));
  return userMember ? userMember.Role : null;
};

/**
 * Checks if a user can create a new task
 * @param {Object} project - The project object
 * @param {Number} userId - The user ID to check permissions for
 * @returns {Boolean} - True if the user can create a task
 */
export const canCreateTask = (project, userId) => {
  return hasAdminOrManagerPermission(project, userId);
};

/**
 * Checks if a user can modify task assignee
 * @param {Object} project - The project object
 * @param {Number} userId - The user ID to check permissions for
 * @returns {Boolean} - True if the user can modify task assignee
 */
export const canChangeTaskAssignee = (project, userId) => {
  return hasAdminOrManagerPermission(project, userId);
};

/**
 * Checks if a user can modify task priority
 * @param {Object} project - The project object
 * @param {Object} task - The task object
 * @param {Number} userId - The user ID to check permissions for
 * @returns {Boolean} - True if the user can modify task priority
 */
export const canChangeTaskPriority = (project, task, userId) => {
  return hasAdminOrManagerPermission(project, userId);
};

/**
 * Checks if a user can modify a project
 * @param {Object} project - The project object
 * @param {Number} userId - The user ID to check permissions for
 * @returns {Boolean} - True if the user can modify the project
 */
export const canEditProject = (project, userId) => {
  return hasAdminPermission(project, userId);
};
