// NewTaskPanel.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  FileText,
  Calendar,
  Users,
  User,
  Flag,
  Clock,
  ListTodo,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { config } from "../../../config";
import useUsers from "../../../hooks/useUsersActions";
import { swal } from "../../../lib/common";
import { toast } from "@/components/ui/use-toast";

const NewTaskPanel = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectTasks = [],
  projectId = null,
  position = "right", // "right" o "bottom"
  defaultWidth = 500,
}) => {
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [assignmentType, setAssignmentType] = useState("individual");
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    dates: true,
    assignment: true,
    advanced: false,
  });

  // Ottieni l'utente corrente
  const currentUserId = useMemo(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        return userData.userId.toString();
      }
      return null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }, []);

  const [taskData, setTaskData] = useState({
    Title: "",
    Description: "",
    AssignedTo: currentUserId,
    Participants: [],
    Priority: "MEDIA",
    StartDate: new Date().toISOString().split("T")[0],
    DueDate: "",
    Status: "DA FARE",
    PredecessorTaskID: null,
    DefaultGroupId: null,
    ProjectID: projectId,
  });

  // Stati priorità con colori
  const priorityConfig = {
    ALTA: {
      color: "text-red-500 border-red-200 bg-red-50",
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      label: "Alta",
    },
    MEDIA: {
      color: "text-yellow-500 border-yellow-200 bg-yellow-50",
      icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
      label: "Media",
    },
    BASSA: {
      color: "text-green-500 border-green-200 bg-green-50",
      icon: <AlertTriangle className="w-4 h-4 text-green-500" />,
      label: "Bassa",
    },
  };

  // Effetti
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchGroups();
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
      resetForm();
    }
  }, [isOpen]);

  // Reset form
  const resetForm = () => {
    setTaskData({
      Title: "",
      Description: "",
      AssignedTo: currentUserId,
      Participants: [],
      Priority: "MEDIA",
      StartDate: new Date().toISOString().split("T")[0],
      DueDate: "",
      Status: "DA FARE",
      PredecessorTaskID: null,
      DefaultGroupId: null,
      ProjectID: projectId,
    });
    setSelectedGroupId(null);
    setAssignmentType("individual");
    setSearchValue("");
    setShowSelectedOnly(false);
    setIsClosing(false);
  };

  // Carica gruppi
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error fetching groups");
      const data = await response.json();
      setAvailableGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei gruppi",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  // Gestione gruppo
  const handleGroupChange = async (groupId) => {
    try {
      if (groupId === "null") {
        setSelectedGroupId(null);
        setTaskData(prev => ({
          ...prev,
          DefaultGroupId: null,
          Participants: [],
        }));
        return;
      }

      const numericGroupId = parseInt(groupId);
      setSelectedGroupId(numericGroupId);
      setTaskData(prev => ({ ...prev, DefaultGroupId: numericGroupId }));

      // Carica membri del gruppo
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/groups/${numericGroupId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Error fetching group members");
      const groupMembers = await response.json();

      if (groupMembers.length > 0) {
        const firstMemberId = groupMembers[0].userId.toString();
        const otherMemberIds = groupMembers
          .filter(member => member.userId.toString() !== firstMemberId)
          .map(member => member.userId.toString());

        setTaskData(prev => ({
          ...prev,
          AssignedTo: firstMemberId,
          Participants: otherMemberIds,
        }));
      }
    } catch (error) {
      console.error("Error loading group members:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei membri del gruppo",
        variant: "destructive",
      });
    }
  };

  // Validazione form
  const validateForm = () => {
    const errors = [];
    
    if (!taskData.Title.trim()) errors.push("Titolo");
    if (!taskData.StartDate) errors.push("Data inizio");
    if (!taskData.DueDate) errors.push("Data scadenza");
    if (!taskData.AssignedTo) errors.push("Responsabile");
    
    if (errors.length > 0) {
      toast({
        title: "Campi obbligatori mancanti",
        description: `Compila i seguenti campi: ${errors.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }

    if (new Date(taskData.DueDate) < new Date(taskData.StartDate)) {
      toast({
        title: "Date non valide",
        description: "La data di scadenza deve essere successiva alla data di inizio",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const formattedData = {
        ...taskData,
        AssignedTo: parseInt(taskData.AssignedTo),
        PredecessorTaskID: taskData.PredecessorTaskID ? parseInt(taskData.PredecessorTaskID) : null,
        AdditionalAssignees: JSON.stringify(taskData.Participants.map(id => parseInt(id))),
        DefaultGroupId: taskData.DefaultGroupId,
        ProjectID: taskData.ProjectID || projectId,
      };

      await onTaskCreated(formattedData);
      
      toast({
        title: "Attività creata",
        description: "L'attività è stata creata con successo",
        variant: "success",
      });

      handleClose();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Errore",
        description: "Errore nella creazione dell'attività",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chiusura pannello
  const handleClose = () => {
    if (taskData.Title || taskData.Description) {
      swal.fire({
        title: "Conferma chiusura",
        text: "Sei sicuro di voler chiudere? I dati inseriti verranno persi.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Chiudi",
        cancelButtonText: "Annulla",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsClosing(true);
          setTimeout(() => {
            onClose();
            resetForm();
          }, 300);
        }
      });
    } else {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 300);
    }
  };

  // Toggle sezione
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Utility functions
  const getSelectedUser = (userId) => users.find(user => user.userId.toString() === userId);
  const getSelectedGroup = (groupId) => availableGroups.find(group => group.groupId === groupId);

  // Filtra utenti
  const filterUsers = users.filter(user => {
    if (!searchValue) return true;
    const search = searchValue.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  // Filtra partecipanti
  const filteredParticipants = users.filter(user => {
    const isNotLeader = user.userId.toString() !== taskData.AssignedTo;
    if (showSelectedOnly) {
      return isNotLeader && taskData.Participants.includes(user.userId.toString());
    }
    return isNotLeader;
  });

  // Calcola dimensioni pannello
  const getPanelStyles = () => {
    if (position === "right") {
      return {
        position: "fixed",
        top: 100,
        margin: 0,
        right: 0,
        bottom: 0,
        width: defaultWidth,
        height: "100%",
        zIndex: 1040,
      };
    }

    return {
      position: "fixed",
      top: 100,
      left: 0,
      right: 0,
      height: "calc(100vh - 100px)",
      width: "100%",
      zIndex: 1040,
    };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: 1039 }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{
              x: position === "right" ? "100%" : 0,
              y: position === "bottom" ? "100%" : 0,
              opacity: 0,
            }}
            animate={{
              x: isClosing && position === "right" ? "100%" : 0,
              y: isClosing && position === "bottom" ? "100%" : 0,
              opacity: 1,
            }}
            exit={{
              x: position === "right" ? "100%" : 0,
              y: position === "bottom" ? "100%" : 0,
              opacity: 0,
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`
              bg-white shadow-2xl flex flex-col overflow-hidden
              ${position === "right" ? "border-l" : "border-t"}
            `}
            style={getPanelStyles()}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-white"
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    taskData.Title && taskData.StartDate && taskData.DueDate && taskData.AssignedTo
                      ? "bg-green-100 hover:bg-green-200"
                      : "bg-blue-100 hover:bg-blue-200"
                  }`}
                  onClick={() => {
                    if (taskData.Title && taskData.StartDate && taskData.DueDate && taskData.AssignedTo) {
                      handleSubmit();
                    }
                  }}
                >
                  <Plus className={`h-5 w-5 ${
                    taskData.Title && taskData.StartDate && taskData.DueDate && taskData.AssignedTo
                      ? "text-green-600"
                      : "text-blue-600"
                  }`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Nuova Attività</h2>
                  <p className="text-sm text-gray-500">Crea una nuova attività nel progetto</p>
                </div>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Chiudi</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>

            {/* Content */}
            {showContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Sezione informazioni base */}
                    <Card>
                      <CardContent className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleSection("basic")}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-600" />
                            <h3 className="font-semibold">Informazioni Base</h3>
                            {taskData.Title && (
                              <Badge variant="secondary" className="ml-2 bg-green-300">
                                Compilato
                              </Badge>
                            )}
                          </div>
                          {expandedSections.basic ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedSections.basic && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 space-y-4">
                                <div>
                                  <Label htmlFor="taskTitle" className="flex items-center gap-1">
                                    Titolo
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="taskTitle"
                                    value={taskData.Title}
                                    onChange={(e) => setTaskData({ ...taskData, Title: e.target.value })}
                                    placeholder="Inserisci il titolo dell'attività"
                                    className="mt-1"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="taskDescription">Descrizione</Label>
                                  <Textarea
                                    id="taskDescription"
                                    value={taskData.Description}
                                    onChange={(e) => setTaskData({ ...taskData, Description: e.target.value })}
                                    placeholder="Descrivi l'attività in dettaglio"
                                    rows={4}
                                    className="mt-1"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="taskPriority" className="flex items-center gap-1">
                                    <Flag className="h-4 w-4 text-gray-500" />
                                    Priorità
                                  </Label>
                                  <Select
                                    value={taskData.Priority}
                                    onValueChange={(value) => setTaskData({ ...taskData, Priority: value })}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(priorityConfig).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                          <div className="flex items-center gap-2">
                                            {config.icon}
                                            <span>{config.label}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>

                    {/* Sezione date */}
                    <Card>
                      <CardContent className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleSection("dates")}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-600" />
                            <h3 className="font-semibold">Date e Scadenze</h3>
                            {taskData.StartDate && taskData.DueDate && (
                              <Badge variant="secondary" className="ml-2 bg-green-300">
                                {Math.ceil((new Date(taskData.DueDate) - new Date(taskData.StartDate)) / (1000 * 60 * 60 * 24)) + 1} giorni
                              </Badge>
                            )}
                          </div>
                          {expandedSections.dates ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedSections.dates && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="taskStartDate" className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    Data Inizio
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="taskStartDate"
                                    type="date"
                                    value={taskData.StartDate}
                                    onChange={(e) => {
                                      const startDate = e.target.value;
                                      setTaskData(prev => ({
                                        ...prev,
                                        StartDate: startDate,
                                        DueDate: prev.DueDate && prev.DueDate < startDate ? startDate : prev.DueDate,
                                      }));
                                    }}
                                    className="mt-1"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="taskDueDate" className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    Data Scadenza
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="taskDueDate"
                                    type="date"
                                    value={taskData.DueDate}
                                    min={taskData.StartDate}
                                    onChange={(e) => setTaskData({ ...taskData, DueDate: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>

                    {/* Sezione assegnazione */}
                    <Card>
                      <CardContent className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleSection("assignment")}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-gray-600" />
                            <h3 className="font-semibold">Assegnazione</h3>
                            {taskData.AssignedTo && (
                              <Badge variant="secondary" className="ml-2 bg-green-300">
                                {getSelectedUser(taskData.AssignedTo)?.firstName || "Assegnato"}
                              </Badge>
                            )}
                          </div>
                          {expandedSections.assignment ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedSections.assignment && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0">
                                <Tabs value={assignmentType} onValueChange={setAssignmentType}>
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="individual" className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>Utente</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="group" className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      <span>Gruppo</span>
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="individual" className="space-y-4">
                                    <div>
                                      <Label className="flex items-center gap-1">
                                        <User className="h-4 w-4 text-gray-500" />
                                        Responsabile
                                        <span className="text-red-500">*</span>
                                      </Label>
                                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox}
                                            className="w-full justify-between mt-1"
                                          >
                                            {taskData.AssignedTo
                                              ? getSelectedUser(taskData.AssignedTo)
                                                ? `${getSelectedUser(taskData.AssignedTo).firstName} ${getSelectedUser(taskData.AssignedTo).lastName}`
                                                : "Seleziona responsabile"
                                              : "Seleziona responsabile"}
                                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                          <Command>
                                            <CommandInput
                                              placeholder="Cerca utente..."
                                              value={searchValue}
                                              onValueChange={setSearchValue}
                                            />
                                            <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-auto">
                                              
                                              {filterUsers.map((user) => (
                                                <CommandItem
                                                  key={user.userId}
                                                  value={user.userId.toString()}
                                                  onSelect={(value) => {
                                                    setTaskData(prev => ({
                                                      ...prev,
                                                      AssignedTo: value,
                                                      DefaultGroupId: null,
                                                    }));
                                                    setOpenCombobox(false);
                                                    setSearchValue("");
                                                  }}
                                                >
                                                  <CheckIcon
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      taskData.AssignedTo === user.userId.toString()
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                    )}
                                                  />
                                                  {user.firstName} {user.lastName}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                    </div>

                                    <div>
                                      <div className="flex justify-between items-center mb-2">
                                        <Label className="flex items-center gap-1">
                                          <Users className="h-4 w-4 text-gray-500" />
                                          Partecipanti ({taskData.Participants.length})
                                        </Label>
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id="showSelected"
                                            checked={showSelectedOnly}
                                            onCheckedChange={setShowSelectedOnly}
                                            className="h-4 w-4 text-black"
                                          />
                                          <Label
                                            htmlFor="showSelected"
                                            className="text-xs text-gray-500 cursor-pointer"
                                          >
                                            Solo selezionati
                                          </Label>
                                        </div>
                                      </div>
                                      <Card className="border-dashed">
                                        <ScrollArea className="h-[120px]">
                                          <div className="p-2 space-y-1">
                                            {filteredParticipants.map((user) => (
                                              <div
                                                key={user.userId}
                                                className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded"
                                              >
                                                <Checkbox
                                                  checked={taskData.Participants.includes(user.userId.toString())}
                                                  onCheckedChange={(checked) => {
                                                    setTaskData(prev => ({
                                                      ...prev,
                                                      Participants: checked
                                                        ? [...prev.Participants, user.userId.toString()]
                                                        : prev.Participants.filter(id => id !== user.userId.toString()),
                                                    }));
                                                  }}
                                                  id={`user-${user.userId}`}
                                                  className="h-4 w-4 text-black"
                                                />
                                                <Label
                                                  htmlFor={`user-${user.userId}`}
                                                  className="flex-grow cursor-pointer text-sm"
                                                >
                                                  {user.firstName} {user.lastName}
                                                </Label>
                                              </div>
                                            ))}
                                          </div>
                                        </ScrollArea>
                                      </Card>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="group" className="space-y-4">
                                    <div>
                                      <Label className="flex items-center gap-1">
                                        <Users className="h-4 w-4 text-gray-500" />
                                        Gruppo
                                      </Label>
                                      <Select
                                        value={selectedGroupId?.toString() || "null"}
                                        onValueChange={handleGroupChange}
                                        disabled={isLoadingGroups}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder="Seleziona gruppo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="null">Nessun gruppo</SelectItem>
                                          {availableGroups.map((group) => (
                                            <SelectItem key={group.groupId} value={group.groupId.toString()}>
                                              {group.groupName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {selectedGroupId && (
                                        <div className="mt-2 p-2 bg-blue-50 rounded-md flex items-start gap-2">
                                          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                                          <p className="text-xs text-blue-700">
                                            L'attività verrà assegnata a tutti i membri del gruppo
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>

                    {/* Sezione avanzata */}
                    <Card>
                      <CardContent className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleSection("advanced")}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ListTodo className="h-5 w-5 text-gray-600" />
                            <h3 className="font-semibold">Opzioni Avanzate</h3>
                          </div>
                          {expandedSections.advanced ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedSections.advanced && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0">
                                <div>
                                  <Label htmlFor="predecessorTask" className="flex items-center gap-1">
                                    <ListTodo className="h-4 w-4 text-gray-500" />
                                    Attività Precedente
                                  </Label>
                                  <Select
                                    value={taskData.PredecessorTaskID?.toString() || "0"}
                                    onValueChange={(value) =>
                                      setTaskData(prev => ({
                                        ...prev,
                                        PredecessorTaskID: value === "0" ? null : parseInt(value),
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Seleziona attività" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">Nessuna attività collegata</SelectItem>
                                      {projectTasks.map((t) => (
                                        <SelectItem key={t.TaskID} value={t.TaskID.toString()}>
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant="outline"
                                              className={
                                                t.Status === "COMPLETATA"
                                                  ? "bg-green-100 text-green-700"
                                                  : t.Status === "IN ESECUZIONE"
                                                  ? "bg-blue-100 text-blue-700"
                                                  : "bg-gray-100 text-gray-700"
                                              }
                                            >
                                              {t.Status}
                                            </Badge>
                                            <span className="truncate">{t.Title}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>

                {/* Footer con azioni */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 border-t bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {taskData.Title && taskData.StartDate && taskData.DueDate && taskData.AssignedTo ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckIcon className="h-4 w-4" />
                          Pronto per la creazione
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          Campi obbligatori
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NewTaskPanel;