import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Save,
  ListFilter,
  ShoppingCart,
  Package,
  Edit,
  Clock,
  FileSpreadsheet,
  Database,
  ArrowLeft,
} from "lucide-react";
import { swal } from "@/lib/common";
import ArticleReferences from "./ArticleReferences";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";
import ArticleActionsDropdown from "./ArticleActionsDropdown";

/**
 * ArticleDetails - Componente per la visualizzazione e modifica dei dettagli di un articolo
 * @param {Object} item - Articolo da visualizzare/modificare
 * @param {Object} project - Progetto associato all'articolo
 * @param {boolean} canEdit - Flag che indica se l'utente ha i permessi di modifica
 * @param {Function} onBOMView - Callback per la visualizzazione della distinta base
 * @param {Function} onRefresh - Callback per richiedere l'aggiornamento dell'elenco articoli
 * @param {Function} onBack - Callback per tornare alla lista degli articoli
 */
const ArticleDetails = ({
  item,
  project,
  canEdit,
  onBOMView,
  onRefresh,
  onBack,
}) => {
  // Stati locali
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [articleData, setArticleData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [activeTab, setActiveTab] = useState("general");

  // Otteniamo gli hook necessari
  const {
    getItemById,
    fetchItemStatuses,
    updateItem,
    loading: hookLoading,
    unlinkItemFromProject,
    disableTemporaryItem,
  } = useProjectArticlesActions();

  // Combiniamo i loading
  const isLoading = loading || hookLoading;

  // Carica i dettagli completi dell'articolo
  useEffect(() => {
    const loadArticleDetails = async () => {
      if (!item?.Id) {
        console.log("No item ID provided, skipping details fetch");
        return;
      }

      try {
        setLoading(true);
        console.log("Loading article details for item:", item.Id);

        const data = await getItemById(item.Id);

        if (data && typeof data === "object" && "Id" in data) {
          console.log("Article data received successfully:", {
            id: data.Id,
            item: data.Item,
          });
          setArticleData(data);
          setOriginalData(data);
        } else {
          console.warn(
            "Invalid or missing article data for ID:",
            item.Id,
            "Data:",
            data,
          );
        }
      } catch (error) {
        console.error("Error loading article details:", error);
        swal.fire({
          title: "Errore",
          text:
            error.message ||
            "Si è verificato un errore nel caricamento dei dettagli articolo",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    // Load statuses
    const loadStatuses = async () => {
      try {
        const data = await fetchItemStatuses();
        if (data) {
          setStatusOptions(data);
        }
      } catch (error) {
        console.error("Error loading statuses:", error);
      }
    };

    loadArticleDetails();
    loadStatuses();
  }, [item?.Id, getItemById, fetchItemStatuses]);

  // Gestione modifica campi
  const handleChange = (field, value) => {
    setArticleData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Salvataggio modifiche
  const handleSave = async () => {
    try {
      setLoading(true);

      // Preparazione dati per l'API
      const itemData = {
        Id: articleData.Id,
        Item: articleData.Item,
        Description: articleData.Description,
        CustomerItemReference: articleData.CustomerItemReference || "",
        CustomerDescription: articleData.CustomerDescription || "",
        Diameter: articleData.Diameter,
        Bxh: articleData.Bxh || "",
        Depth: articleData.Depth,
        Length: articleData.Length,
        MediumRadius: articleData.MediumRadius,
        Notes: articleData.Notes || "",
        CategoryId: articleData.CategoryId,
        FamilyId: articleData.FamilyId,
        MacrofamilyId: articleData.MacrofamilyId,
        ItemTypeId: articleData.ItemTypeId,
        Nature: articleData.Nature,
        StatusId: articleData.StatusId,
        fscodice: articleData.fscodice || "",
        DescriptionExtension: articleData.DescriptionExtension || "",
        BaseUoM: articleData.BaseUoM || "PZ",
        offset_acquisto: articleData.offset_acquisto || "",
        offset_autoconsumo: articleData.offset_autoconsumo || "",
        offset_vendita: articleData.offset_vendita || "",
        stato_erp: articleData.stato_erp || 0, // Manteniamo il valore stato_erp
      };

      // Utilizziamo l'hook per l'aggiornamento
      const result = await updateItem(itemData);

      if (result && result.success) {
        swal.fire({
          title: "Successo",
          text: "Articolo aggiornato con successo",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        // Aggiornamento dati articolo usando l'hook
        const updatedData = await getItemById(articleData.Id);
        if (updatedData) {
          setArticleData(updatedData);
          setOriginalData(updatedData);
        }

        setIsEditing(false);
        if (onRefresh) onRefresh();
      } else {
        throw new Error(
          (result && result.msg) || "Errore durante l'aggiornamento",
        );
      }
    } catch (error) {
      console.error("Error updating article:", error);
      swal.fire({
        title: "Errore",
        text:
          error.message ||
          "Si è verificato un errore nell'aggiornamento dell'articolo",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Annulla modifiche
  const handleCancel = () => {
    setArticleData(originalData);
    setIsEditing(false);
  };

  // Gestione rimozione dal progetto
  const handleUnlinkFromProject = async () => {
    try {
      if (!project || !project.ProjectID || !articleData || !articleData.Id) {
        throw new Error(
          "Dati insufficienti per rimuovere l'articolo dal progetto",
        );
      }

      const result = await unlinkItemFromProject(
        project.ProjectID,
        articleData.Id,
      );

      if (result && result.success) {
        swal.fire({
          title: "Completato",
          text: "Articolo rimosso dal progetto con successo",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        if (onRefresh) onRefresh();
        if (onBack) onBack(); // Torna alla lista degli articoli
      } else {
        throw new Error(result.msg || "Errore durante la rimozione");
      }
    } catch (error) {
      console.error("Error unlinking item from project:", error);
      swal.fire({
        title: "Errore",
        text:
          error.message ||
          "Si è verificato un errore durante la rimozione dell'articolo dal progetto",
        icon: "error",
      });
    }
  };

  // Gestione disabilitazione articolo
  const handleDisableItem = async () => {
    try {
      if (!articleData || !articleData.Id) {
        throw new Error("Dati insufficienti per disabilitare l'articolo");
      }

      const result = await disableTemporaryItem(articleData.Id);

      if (result && result.success) {
        swal.fire({
          title: "Completato",
          text: "Articolo disabilitato con successo",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        if (onRefresh) onRefresh();
        if (onBack) onBack(); // Torna alla lista degli articoli
      } else {
        throw new Error(result.msg || "Errore durante la disabilitazione");
      }
    } catch (error) {
      console.error("Error disabling item:", error);
      swal.fire({
        title: "Errore",
        text:
          error.message ||
          "Si è verificato un errore durante la disabilitazione dell'articolo",
        icon: "error",
      });
    }
  };

  if (isLoading && !articleData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!articleData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Nessun articolo selezionato
      </div>
    );
  }

  // Nature options
  const natureOptions = [
    { id: 22413312, description: "Semilavorato" },
    { id: 22413313, description: "Prodotto Finito" },
    { id: 22413314, description: "Acquisto" },
  ];

  // Ottieni dettagli natura
  const getNatureDetails = (nature) => {
    switch (nature) {
      case 22413312: // Semilavorato
        return {
          icon: <Package className="h-4 w-4" />,
          label: "Semilavorato",
          color: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case 22413313: // Prodotto Finito
        return {
          icon: <Package className="h-4 w-4" />,
          label: "Prodotto Finito",
          color: "bg-green-100 text-green-700 border-green-200",
        };
      case 22413314: // Acquisto
        return {
          icon: <ShoppingCart className="h-4 w-4" />,
          label: "Acquisto",
          color: "bg-amber-100 text-amber-700 border-amber-200",
        };
      default:
        return {
          icon: <Package className="h-4 w-4" />,
          label: "Altro",
          color: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  };

  const natureDetails = getNatureDetails(articleData.Nature);

  // Verifica se l'articolo è dall'ERP usando stato_erp
  const isFromERP = articleData.stato_erp === 1;

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header con bottoni azione */}
      <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <h2 className="text-lg font-semibold flex items-center gap-2">
            {natureDetails.icon}
            <span>{articleData.Item}</span>
          </h2>

          <Badge className={`${natureDetails.color}`}>
            {natureDetails.label}
          </Badge>

          {articleData.StatusDescription && (
            <Badge className="bg-gray-100 text-gray-700 border-gray-200">
              {articleData.StatusDescription}
            </Badge>
          )}

          {/* Badge per articoli ERP - usa stato_erp */}
          {isFromERP && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>Codificato in Mago</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="gap-1"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salva
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onBOMView(articleData)}
                className="gap-1"
              >
                <ListFilter className="h-4 w-4" />
                Distinta Base
              </Button>

              {canEdit && (
                <>
                  <Button onClick={() => setIsEditing(true)} className="gap-1">
                    <Edit className="h-4 w-4" />
                    Modifica
                  </Button>

                  {/* Add the actions dropdown menu */}
                  <ArticleActionsDropdown
                    item={articleData}
                    project={project}
                    canEdit={canEdit}
                    onViewDetails={() => {}} // Already on details view
                    onViewBOM={() => onBOMView(articleData)}
                    onEdit={() => setIsEditing(true)}
                    onRefresh={onRefresh}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="bg-white px-6 py-2 border-b">
          <TabsList>
            <TabsTrigger value="general">
              <Package className="h-4 w-4 mr-2" />
              Generale
            </TabsTrigger>
            <TabsTrigger value="dimensions">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Dimensioni
            </TabsTrigger>
            <TabsTrigger value="projects">
              <Clock className="h-4 w-4 mr-2" />
              Progetti
            </TabsTrigger>
            <TabsTrigger value="references">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Riferimenti Intercompany
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Tab Informazioni Generali */}
          <TabsContent
            value="general"
            className="pt-2 px-6 h-full overflow-auto"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="item">Codice Articolo</Label>
                  {isEditing ? (
                    <Input
                      id="item"
                      value={articleData.Item || ""}
                      onChange={(e) => handleChange("Item", e.target.value)}
                      disabled={isFromERP} // Disabilita se è un articolo ERP
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.Item}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nature">Natura</Label>
                  {isEditing ? (
                    <Select
                      value={articleData.Nature?.toString()}
                      onValueChange={(value) =>
                        handleChange("Nature", parseInt(value))
                      }
                      disabled={isFromERP} // Disabilita se è un articolo ERP
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona natura" />
                      </SelectTrigger>
                      <SelectContent>
                        {natureOptions.map((option) => (
                          <SelectItem
                            key={option.id}
                            value={option.id.toString()}
                          >
                            {option.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      <Badge className={`${natureDetails.color}`}>
                        {natureDetails.label}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={articleData.Description || ""}
                    onChange={(e) =>
                      handleChange("Description", e.target.value)
                    }
                    rows={3}
                    disabled={isFromERP} // Disabilita se è un articolo ERP
                  />
                ) : (
                  <div className="border rounded-md p-2 bg-slate-50 min-h-[70px] whitespace-pre-wrap">
                    {articleData.Description || "Nessuna descrizione"}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerItemReference">
                    Riferimento Cliente
                  </Label>
                  {isEditing ? (
                    <Input
                      id="customerItemReference"
                      value={articleData.CustomerItemReference || ""}
                      onChange={(e) =>
                        handleChange("CustomerItemReference", e.target.value)
                      }
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.CustomerItemReference || "-"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Stato</Label>
                  {isEditing ? (
                    <Select
                      value={articleData.StatusId?.toString()}
                      onValueChange={(value) =>
                        handleChange("StatusId", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem
                            key={option.Id}
                            value={option.Id.toString()}
                          >
                            {option.Description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.StatusDescription || "-"}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                {isEditing ? (
                  <Textarea
                    id="notes"
                    value={articleData.Notes || ""}
                    onChange={(e) => handleChange("Notes", e.target.value)}
                    rows={4}
                  />
                ) : (
                  <div className="border rounded-md p-2 bg-slate-50 min-h-[100px] whitespace-pre-wrap">
                    {articleData.Notes || "Nessuna nota"}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="uom">UM Base</Label>
                  {isEditing ? (
                    <Input
                      id="uom"
                      value={articleData.BaseUoM || "PZ"}
                      onChange={(e) => handleChange("BaseUoM", e.target.value)}
                      maxLength={3}
                      disabled={isFromERP} // Disabilita se è un articolo ERP
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.BaseUoM || "PZ"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectERPId">Codice FS</Label>
                  {isEditing ? (
                    <Input
                      id="projectERPId"
                      value={articleData.fscodice || ""}
                      onChange={(e) => handleChange("fscodice", e.target.value)}
                      maxLength={10}
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.fscodice || "-"}
                    </div>
                  )}
                  {/* Avviso se l'articolo è sincronizzato con Mago */}
                  {isFromERP && (
                    <div className="flex items-center gap-2 text-red-500 mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Articolo creato in Mago</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab Dimensioni */}
          <TabsContent
            value="dimensions"
            className="pt-2 px-6 h-full overflow-auto"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="diameter">Diametro</Label>
                  {isEditing ? (
                    <Input
                      id="diameter"
                      type="number"
                      step="0.01"
                      value={articleData.Diameter || ""}
                      onChange={(e) =>
                        handleChange(
                          "Diameter",
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.Diameter || "-"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bxh">Base x Altezza</Label>
                  {isEditing ? (
                    <Input
                      id="bxh"
                      value={articleData.Bxh || ""}
                      onChange={(e) => handleChange("Bxh", e.target.value)}
                      placeholder="100x100"
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.Bxh || "-"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depth">Profondità</Label>
                  {isEditing ? (
                    <Input
                      id="depth"
                      type="number"
                      step="0.01"
                      value={articleData.Depth || ""}
                      onChange={(e) =>
                        handleChange(
                          "Depth",
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.Depth || "-"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">Lunghezza</Label>
                  {isEditing ? (
                    <Input
                      id="length"
                      type="number"
                      step="0.01"
                      value={articleData.Length || ""}
                      onChange={(e) =>
                        handleChange(
                          "Length",
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.Length || "-"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mediumRadius">Raggio Medio</Label>
                  {isEditing ? (
                    <Input
                      id="mediumRadius"
                      type="number"
                      step="0.01"
                      value={articleData.MediumRadius || ""}
                      onChange={(e) =>
                        handleChange(
                          "MediumRadius",
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                    />
                  ) : (
                    <div className="border rounded-md p-2 bg-slate-50">
                      {articleData.MediumRadius || "-"}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dimensioni complessive</Label>
                <div className="border rounded-md p-4 bg-slate-50">
                  <div className="flex flex-wrap gap-3">
                    {articleData.Diameter ? (
                      <Badge className="bg-gray-200 text-gray-700">
                        Ø {articleData.Diameter}
                      </Badge>
                    ) : null}
                    {articleData.Bxh ? (
                      <Badge className="bg-gray-200 text-gray-700">
                        {articleData.Bxh}
                      </Badge>
                    ) : null}
                    {articleData.Depth ? (
                      <Badge className="bg-gray-200 text-gray-700">
                        P {articleData.Depth}
                      </Badge>
                    ) : null}
                    {articleData.Length ? (
                      <Badge className="bg-gray-200 text-gray-700">
                        L {articleData.Length}
                      </Badge>
                    ) : null}
                    {articleData.MediumRadius ? (
                      <Badge className="bg-gray-200 text-gray-700">
                        R {articleData.MediumRadius}
                      </Badge>
                    ) : null}
                    {!articleData.Diameter &&
                      !articleData.Bxh &&
                      !articleData.Depth &&
                      !articleData.Length &&
                      !articleData.MediumRadius && (
                        <span className="text-gray-400 text-sm">
                          Nessuna dimensione specificata
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab Progetti associati */}
          <TabsContent
            value="projects"
            className="pt-2 px-6 h-full overflow-auto"
          >
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Progetti associati</CardTitle>
                </CardHeader>
                <CardContent>
                  {articleData.projects && articleData.projects.length > 0 ? (
                    <div className="space-y-4">
                      {articleData.projects.map((proj) => (
                        <div
                          key={proj.ProjectID}
                          className="border rounded-md p-3 hover:bg-slate-50"
                        >
                          <div className="font-medium">{proj.ProjectName}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-gray-100 text-gray-700">
                              {proj.ProjectStatus}
                            </Badge>
                            {proj.CustomerItemReference && (
                              <div className="text-sm text-gray-500">
                                Rif. Cliente: {proj.CustomerItemReference}
                              </div>
                            )}
                          </div>
                          {proj.CustomerDescription && (
                            <div className="text-sm text-gray-500 mt-1">
                              {proj.CustomerDescription}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 flex items-center justify-center py-4">
                      Nessun progetto associato oltre a quello corrente
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Riferimenti Intercompany */}
          <TabsContent
            value="references"
            className="pt-2 px-6 h-full overflow-auto"
          >
            <ArticleReferences
              article={articleData}
              project={project}
              canEdit={canEdit}
              onRefresh={() => {
                // Ricarica i dettagli dell'articolo usando l'hook
                const loadArticleDetails = async () => {
                  try {
                    setLoading(true);
                    const data = await getItemById(articleData.Id);

                    if (data) {
                      setArticleData(data);
                      setOriginalData(data);
                    }
                  } catch (error) {
                    console.error("Error loading article details:", error);
                  } finally {
                    setLoading(false);
                  }
                };

                loadArticleDetails();
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ArticleDetails;
