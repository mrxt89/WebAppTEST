import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import useAdminActions from "../../hooks/useAdminActions";

// Tab content components
import UsersTab from "./tabs/UsersTab";
import GroupsTab from "./tabs/GroupsTab";
import PagesTab from "./tabs/PagesTab";
import NotificationsTab from "./tabs/NotificationsTab";
import DescriptionRulesTab from "./tabs/DescriptionRulesTab";

// Dialog components
import {
  AddUserDialog,
  AddGroupDialog,
  AddNotificationChannelDialog,
} from "./components/AddDialogs";

const AdminDashboard = () => {
  /* General state */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState({});
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [addNotificationDialogOpen, setAddNotificationDialogOpen] = useState(false);
  
  const { user } = useAuth();
  
  const handleOpenChat = (notificationCategoryId) => {
    setModalProps({
      reply: true,
      type: "text",
      notificationCategoryId: notificationCategoryId,
      openChatModal: (notificationId) => {
        setIsModalOpen(false);
      },
    });
    setIsModalOpen(true);
  };

  const {
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
    resetPassword,
    toggleUserStatus,
    addGroup,
    updateGroup,
    assignUserToGroup,
    removeUserFromGroup,
    fetchGroups,
    enableDisablePage,
    toggleInheritPermissions,
    assignGroupToPage,
    removeGroupFromPage,
    fetchPages,
    fetchUsers,
    fetchNotificationsChannels,
    addNotificationChannel,
    updateNotificationChannel,
    addUserToChannel,
    removeUserFromChannel,
    getUserCompanies,
    assignUserToCompany,
    removeUserFromCompany,
    setPrimaryCompany,
    updateUserERPUserId,
    refreshData,
  } = useAdminActions();

  const handleAdd = () => {
    if (activeTab === "users") {
      setAddUserDialogOpen(true);
    } else if (activeTab === "groups") {
      setAddGroupDialogOpen(true);
    } else if (activeTab === "pages") {
      console.log("Inserimento pagina");
    } else if (activeTab === "notificationsChannel") {
      setAddNotificationDialogOpen(true);
    }
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter search results based on query
  const filteredUsers = users.filter((el) => {
    // filtra solo gli utenti che hanno la stessa CompanyId dell'utente loggato (user.CompanyId)
    if (el.CompanyId !== user.CompanyId) return false;
    const searchText = searchQuery.toLowerCase();
    return (
      el.username?.toLowerCase().includes(searchText) ||
      el.firstName?.toLowerCase().includes(searchText) ||
      el.lastName?.toLowerCase().includes(searchText) ||
      (el.email && el.email.toLowerCase().includes(searchText))
    );
  });

  const filteredGroups = groups.filter((group) => {
    const searchText = searchQuery.toLowerCase();
    return (
      group.groupName?.toLowerCase().includes(searchText) ||
      group.description?.toLowerCase().includes(searchText)
    );
  });

  const filteredPages = pages.filter((page) => {
    const searchText = searchQuery.toLowerCase();
    return (
      page.pageName?.toLowerCase().includes(searchText) ||
      page.pageRoute?.toLowerCase().includes(searchText) ||
      (page.pageDescription &&
        page.pageDescription.toLowerCase().includes(searchText))
    );
  });

  const filteredNotificationsChannels = notificationsChannels.filter(
    (channel) => {
      const searchText = searchQuery.toLowerCase();
      return (
        channel.name?.toLowerCase().includes(searchText) ||
        channel.description?.toLowerCase().includes(searchText)
      );
    },
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6"></header>
      <main className="grid flex-1 items-start sm:px-6 sm:py-0 md:gap-8 pt-24">
        <Tabs
          defaultValue="users"
          onValueChange={(value) => {
            setActiveTab(value);
          }}
        >
          <div className="flex items-center">
            <div className="flex items-center gap-4">
              <TabsList className="navbar-style-tabs">
                <TabsTrigger value="users">Utenti</TabsTrigger>
                <TabsTrigger value="groups">Gruppi</TabsTrigger>
                <TabsTrigger value="pages">Pagine</TabsTrigger>
                <TabsTrigger value="notificationsChannel">
                  Notifiche
                </TabsTrigger>
                <TabsTrigger value="descriptionRules">
                  Regole Descrizioni
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center justify-center gap-4 w-full">
              <Input
                type="search"
                placeholder="Cerca..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full mx-3 rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={handleAdd}
              >
                <div className="fa-add" />
                <span className="sm:not-sr-only sm:whitespace-nowrap">
                  Aggiungi
                </span>
              </Button>
            </div>
          </div>

          {/* Users Tab */}
          <TabsContent value="users">
            <UsersTab
              users={filteredUsers}
              companies={companies}
              updateUser={updateUser}
              resetPassword={resetPassword}
              toggleUserStatus={toggleUserStatus}
              getUserCompanies={getUserCompanies}
              assignUserToCompany={assignUserToCompany}
              removeUserFromCompany={removeUserFromCompany}
              setPrimaryCompany={setPrimaryCompany}
              updateUserERPUserId={updateUserERPUserId}
              refreshData={() => refreshData("users")}
            />
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <GroupsTab
              groups={filteredGroups}
              users={filteredUsers}
              updateGroup={updateGroup}
              assignUserToGroup={assignUserToGroup}
              removeUserFromGroup={removeUserFromGroup}
              refreshData={() => refreshData("groups")}
            />
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages">
            <PagesTab
              pages={filteredPages}
              groups={groups}
              enableDisablePage={enableDisablePage}
              toggleInheritPermissions={toggleInheritPermissions}
              assignGroupToPage={assignGroupToPage}
              removeGroupFromPage={removeGroupFromPage}
              fetchPages={fetchPages}
              refreshData={() => refreshData("pages")}
            />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notificationsChannel">
            <NotificationsTab
              notificationsChannels={filteredNotificationsChannels}
              users={filteredUsers}
              groups={groups}
              updateNotificationChannel={updateNotificationChannel}
              addUserToChannel={addUserToChannel}
              removeUserFromChannel={removeUserFromChannel}
              refreshData={() => refreshData("notificationsChannel")}
              handleOpenChat={handleOpenChat}
            />
          </TabsContent>

          {/* Description Rules Tab */}
          <TabsContent value="descriptionRules">
            <DescriptionRulesTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Add User Dialog */}
      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        onConfirm={(formData) => addUser(formData)}
        companies={companies}
      />

      {/* Add Group Dialog */}
      <AddGroupDialog
        open={addGroupDialogOpen}
        onOpenChange={setAddGroupDialogOpen}
        onConfirm={(formData) => addGroup(formData)}
      />

      {/* Add Notification Channel Dialog */}
      <AddNotificationChannelDialog
        open={addNotificationDialogOpen}
        onOpenChange={setAddNotificationDialogOpen}
        onConfirm={(formData) => addNotificationChannel(formData)}
      />
    </div>
  );
};

export default AdminDashboard;
