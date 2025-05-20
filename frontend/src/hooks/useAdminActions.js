import { useState, useEffect } from "react";
import axios from "axios";
import { config } from "../config";

const useAdminActions = () => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pages, setPages] = useState([]);
  const [pagesHierarchy, setPagesHierarchy] = useState([]);
  const [notificationsChannels, setNotificationsChannels] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchPages();
    fetchNotificationsChannels();
    fetchCompanies();
  }, []);

  const parseData = (data) => {
    if (data && typeof data === "string") {
      try {
        // Rimuovi eventuali caratteri non validi prima del parsing
        const cleanedData = data.trim().replace(/^[^{[]*/, ""); // Rimuovi qualsiasi cosa prima di un '{' o '['
        return JSON.parse(cleanedData);
      } catch (error) {
        console.error("Error parsing data:", error, "Original data:", data);
        return [];
      }
    }
    return data;
  };

  /* Gestione aziende */
  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${config.API_BASE_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setLoading(false);
    }
  };

  const getUserCompanies = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${config.API_BASE_URL}/user-companies/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching user companies:", error);
      return [];
    }
  };

  const assignUserToCompany = async (userId, companyId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/user/${userId}/assign-company/${companyId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchUsers(); // Aggiorna l'elenco degli utenti
    } catch (error) {
      console.error("Error assigning user to company:", error);
      throw error;
    }
  };

  const removeUserFromCompany = async (userId, companyId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${config.API_BASE_URL}/user/${userId}/remove-company/${companyId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchUsers(); // Aggiorna l'elenco degli utenti
      return response.data;
    } catch (error) {
      console.error("Error removing user from company:", error);
      throw error;
    }
  };

  const setPrimaryCompany = async (userId, companyId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${config.API_BASE_URL}/user/${userId}/set-primary-company/${companyId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchUsers(); // Aggiorna l'elenco degli utenti
      return response.data;
    } catch (error) {
      console.error("Error setting primary company:", error);
      throw error;
    }
  };

  /* Gestione utenti */
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      let response = await axios.get(`${config.API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const usersData = response.data.map((user) => {
        let groupsArray = [];

        // Check if groups exists and convert it to a proper array of objects
        if (user.groups) {
          if (typeof user.groups === "string") {
            // If it's a simple string like "Admin", convert it to an array with an object
            groupsArray = [
              {
                groupName: user.groups,
                // You may want to set default values for groupId and description
                groupId: null,
                description: "",
              },
            ];
          } else if (Array.isArray(user.groups)) {
            // If it's already an array, use it
            groupsArray = user.groups;
          } else if (typeof user.groups === "object") {
            // If it's an object, wrap it in an array
            groupsArray = [user.groups];
          }
        }

        // Return the user with properly formatted groups
        return {
          ...user,
          groups: groupsArray,
        };
      });
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };

  const addUser = async (userData) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${config.API_BASE_URL}/add-user`, userData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      throw error;
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${config.API_BASE_URL}/user/${userId}`, userData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const deleteUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${config.API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  };

  const resetPassword = async (userId, newPassword) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/reset-password`,
        { userId, newPassword },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchUsers();
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  };

  const toggleUserStatus = async (userId, userDisabled) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${config.API_BASE_URL}/user/${userId}/status`,
        { userDisabled },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      throw error;
    }
  };

  /* Gestione dei gruppi */
  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${config.API_BASE_URL}/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const groupsData = response.data.map((group) => ({
        ...group,
        users: parseData(group.users) || [], // Assicurati che users sia sempre un array
        pages: parseData(group.pages) || [], // Assicurati che pages sia sempre un array
      }));
      setGroups(groupsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setLoading(false);
    }
  };

  const addGroup = async (groupData) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${config.API_BASE_URL}/groups`, groupData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroups();
    } catch (error) {
      console.error("Error adding group:", error);
    }
  };

  const updateGroup = async (groupId, groupData) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${config.API_BASE_URL}/groups/${groupId}`, groupData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroups();
    } catch (error) {
      console.error("Error updating group:", error);
    }
  };

  const assignUserToGroup = async (userId, groupId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/groups/${groupId}/add-user`,
        { userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchGroups();
    } catch (error) {
      console.error("Error assigning user to group:", error);
    }
  };

  const removeUserFromGroup = async (userId, groupId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/groups/${groupId}/remove-user`,
        { userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchGroups();
    } catch (error) {
      console.error("Error removing user from group:", error);
    }
  };

  /* Gestione delle pagine */
  const fetchPages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${config.API_BASE_URL}/pages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const pagesData = response.data.map((page) => ({
        ...page,
        groups:
          typeof page.groups === "string"
            ? JSON.parse(page.groups)
            : page.groups || [],
        childPages: page.childPages
          ? page.childPages.split(",").map((id) => parseInt(id, 10))
          : [],
      }));

      // Set flat pages list
      setPages(pagesData);

      // Create hierarchical structure for easier navigation
      const hierarchy = buildPageHierarchy(pagesData);
      setPagesHierarchy(hierarchy);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching pages:", error);
      setLoading(false);
    }
  };

  // Helper function to build page hierarchy
  const buildPageHierarchy = (flatPages) => {
    const hierarchy = [];
    const pagesMap = {};

    // First pass: create a map of pages
    flatPages.forEach((page) => {
      pagesMap[page.pageId] = { ...page, children: [] };
    });

    // Second pass: build the tree
    flatPages.forEach((page) => {
      const pageWithChildren = pagesMap[page.pageId];

      if (page.pageParent && pagesMap[page.pageParent]) {
        // This is a child page, add it to its parent
        pagesMap[page.pageParent].children.push(pageWithChildren);
      } else {
        // This is a root page
        hierarchy.push(pageWithChildren);
      }
    });

    return hierarchy;
  };

  const enableDisablePage = async (pageId, disabled) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${config.API_BASE_URL}/pages/${pageId}/status`,
        { disabled },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchPages();
    } catch (error) {
      console.error("Error enabling/disabling page:", error);
    }
  };

  const toggleInheritPermissions = async (pageId, inheritPermissions) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${config.API_BASE_URL}/pages/${pageId}/inheritance`,
        { inheritPermissions },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchPages();
    } catch (error) {
      console.error("Error toggling page inheritance:", error);
    }
  };

  const assignGroupToPage = async (
    pageId,
    groupId,
    applyToChildren = false,
  ) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/pages/${pageId}/add-group`,
        { groupId, applyToChildren },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchPages();
    } catch (error) {
      console.error("Error assigning group to page:", error);
    }
  };

  const removeGroupFromPage = async (
    pageId,
    groupId,
    applyToChildren = false,
  ) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/pages/${pageId}/remove-group`,
        { groupId, applyToChildren },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchPages();
    } catch (error) {
      console.error("Error removing group from page:", error);
    }
  };

  /* Gestione dei canali delle notifiche */
  const fetchNotificationsChannels = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${config.API_BASE_URL}/notifications-channels`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      /* In response.data c'è anche un json chiamato membersJson che ha come campi: userId, firstName, lastName, role */
      const channelsData = response.data.map((channel) => ({
        ...channel,
        members: parseData(channel.membersJson),
      }));
      setNotificationsChannels(channelsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching notifications channels:", error);
      setLoading(false);
    }
  };

  const addNotificationChannel = async (channelData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${config.API_BASE_URL}/notifications-channels`,
        channelData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchNotificationsChannels();
      return response.data;
    } catch (error) {
      console.error("Error adding notification channel:", error);
    }
  };

  const updateNotificationChannel = async (channelData) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${config.API_BASE_URL}/notifications-channels/${channelData.notificationCategoryId}`,
        channelData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchNotificationsChannels();
    } catch (error) {
      console.error("Error updating notification channel:", error);
    }
  };

  const addUserToChannel = async (userId, notificationCategoryId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/notifications-channels/${notificationCategoryId}/add-user`,
        { userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchNotificationsChannels(); // Aggiorna i canali di notifica
    } catch (error) {
      console.error("Error adding user to channel:", error);
    }
  };

  const removeUserFromChannel = async (userId, notificationCategoryId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${config.API_BASE_URL}/notifications-channels/${notificationCategoryId}/remove-user`,
        { userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchNotificationsChannels(); // Aggiorna i canali di notifica
    } catch (error) {
      console.error("Error removing user from channel:", error);
    }
  };

  // Metodo per aggiornare i dati mantenendo i filtri
  const refreshData = (tabType) => {
    setLoading(true);

    if (tabType === "users" || tabType === "all") {
      fetchUsers().finally(() => {
        if (tabType === "users") setLoading(false);
      });
    }

    if (tabType === "groups" || tabType === "all") {
      fetchGroups().finally(() => {
        if (tabType === "groups") setLoading(false);
      });
    }

    if (tabType === "pages" || tabType === "all") {
      fetchPages().finally(() => {
        if (tabType === "pages") setLoading(false);
      });
    }

    if (tabType === "notificationsChannel" || tabType === "all") {
      fetchNotificationsChannels().finally(() => {
        if (tabType === "notificationsChannel") setLoading(false);
      });
    }

    if (tabType === "companies" || tabType === "all") {
      fetchCompanies().finally(() => {
        if (tabType === "companies") setLoading(false);
      });
    }
  };

  return {
    users,
    groups,
    pages,
    pagesHierarchy,
    notificationsChannels,
    companies,
    loading,
    setLoading,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetPassword,
    fetchUsers,
    fetchGroups,
    fetchCompanies,
    getUserCompanies,
    assignUserToCompany,
    removeUserFromCompany,
    setPrimaryCompany,
    addGroup,
    updateGroup,
    removeUserFromGroup,
    assignUserToGroup,
    fetchPages,
    enableDisablePage,
    toggleInheritPermissions,
    assignGroupToPage,
    removeGroupFromPage,
    fetchNotificationsChannels,
    addNotificationChannel,
    updateNotificationChannel,
    addUserToChannel,
    removeUserFromChannel,
    refreshData,
  };
};

export default useAdminActions;
