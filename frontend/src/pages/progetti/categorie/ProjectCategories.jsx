// src/pages/progetti/categorie/page.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import useCategoryActions from '../../../hooks/useCategoryActions';
import { swal } from '../../../lib/common';
import { toast } from "@/components/ui/use-toast";

const CategoriesPage = () => {
  const { 
    categories, 
    loading, 
    fetchCategories, 
    addUpdateCategory, 
    addUpdateSubcategory,
    toggleCategoryStatus,
    toggleSubcategoryStatus 
  } = useCategoryActions();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSubcategory, setCurrentSubcategory] = useState(null);

  useEffect(() => {
    console.log('Fetching categories from jsx...');
    fetchCategories();
  }, [fetchCategories]);

  const handleSaveCategory = async () => {
    try {
      if (!currentCategory?.Description) {
        swal.fire('Attenzione', 'Il nome della categoria è obbligatorio', 'warning');
        return;
      }

      const result = await addUpdateCategory({
        ProjectCategoryId: currentCategory.ProjectCategoryId,
        Description: currentCategory.Description,
        HexColor: currentCategory.HexColor || '#000000'
      });

      if (result.success) {
        await fetchCategories();
        setIsDialogOpen(false);
        setCurrentCategory(null);
        swal.fire('Successo', 'Categoria salvata con successo', 'success');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      swal.fire('Errore', 'Errore nel salvataggio della categoria', 'error');
    }
  };

  const handleSaveSubcategory = async () => {
    try {
      if (!currentSubcategory?.Description) {
        swal.fire('Attenzione', 'Il nome della sottocategoria è obbligatorio', 'warning');
        return;
      }

      const result = await addUpdateSubcategory({
        ProjectCategoryId: currentCategory.ProjectCategoryId,
        Line: currentSubcategory.Line || (currentCategory.details?.length || 0) + 1,
        Description: currentSubcategory.Description
      });

      if (result.success) {
        await fetchCategories();
        setIsSubcategoryDialogOpen(false);
        setCurrentSubcategory(null);
        swal.fire('Successo', 'Sottocategoria salvata con successo', 'success');
      }
    } catch (error) {
      console.error('Error saving subcategory:', error);
      swal.fire('Errore', 'Errore nel salvataggio della sottocategoria', 'error');
    }
  };

  const handleToggleCategory = async (categoryId) => {
    try {
      const result = await toggleCategoryStatus(categoryId);
      if (result.success) {
        await fetchCategories();
        swal.fire('Successo', 'Stato della categoria aggiornato', 'success');
      }
    } catch (error) {
      console.error('Error toggling category:', error);
      swal.fire('Errore', 'Errore nell\'aggiornamento dello stato', 'error');
    }
  };

  const handleToggleSubcategory = async (categoryId, line) => {
    try {

      const subcategory = categories.find(c => c.ProjectCategoryId === categoryId)?.details.find(d => d.Line === line);
      if (!subcategory) {
        swal.fire('Errore', 'Sottocategoria non trovata', 'error');
        return;
      }

      const result = await toggleSubcategoryStatus(categoryId, line);
      if (result.success) {
        await fetchCategories();
        toast({
          title: "Categoria Aggiornata",
          variant: "success",
          duration: 3000,
          style: { backgroundColor: '#2c7a7b', color: '#fff' }
        });
      }
    } catch (error) {
      console.error('Error toggling subcategory:', error);
      swal.fire('Errore', 'Errore nell\'aggiornamento dello stato', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestione Categorie</CardTitle>
          <Button onClick={() => {
            setCurrentCategory({ Description: '', HexColor: '#000000' });
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Colore</TableHead>
                  <TableHead>Sottocategorie</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-[150px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(category => (
                  <TableRow key={category.ProjectCategoryId}>
                    <TableCell className="font-medium">{category.Description}</TableCell>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: category.HexColor }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentCategory(category);
                            setCurrentSubcategory({ Description: '' });
                            setIsSubcategoryDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        {category.details?.map(detail => (
                          <Badge 
                            key={detail.Line}
                            variant={detail.Disabled ? "outline" : "default"}
                            // Se disabilitata allora sfondo rosso altrimenti verde chiaro
                            className={{ 'bg-red-100': detail.Disabled, 'bg-green-100': !detail.Disabled, 'text-red-500': detail.Disabled, 'text-black-500': !detail.Disabled }} >
                            {detail.Description}
                            <button
                              onClick={() => handleToggleSubcategory(category.ProjectCategoryId, detail.Line)}
                              className="ml-1"
                            >
                              {detail.Disabled ? 
                                <EyeOff className="h-3 w-3" /> : 
                                <Eye className="h-3 w-3" />
                              }
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={category.Disabled ? "destructive" : "success"}
                      >
                        {category.Disabled ? "Disabilitata" : "Attiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCurrentCategory(category);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleCategory(category.ProjectCategoryId)}
                        >
                          {category.Disabled ? 
                            <Eye className="h-4 w-4" /> : 
                            <EyeOff className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog per categoria */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentCategory?.ProjectCategoryId ? 'Modifica Categoria' : 'Nuova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Nome Categoria</Label>
              <Input
                value={currentCategory?.Description || ''}
                onChange={(e) => setCurrentCategory({
                  ...currentCategory,
                  Description: e.target.value
                })}
              />
            </div>
            <div>
              <Label>Colore</Label>
              <Input
                type="color"
                value={currentCategory?.HexColor || '#000000'}
                onChange={(e) => setCurrentCategory({
                  ...currentCategory,
                  HexColor: e.target.value
                })}
              />
            </div>
            <Button 
              className="w-full"
              onClick={handleSaveCategory}
            >
              Salva
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog per sottocategoria */}
      <Dialog open={isSubcategoryDialogOpen} onOpenChange={setIsSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentSubcategory?.Line ? 'Modifica Sottocategoria' : 'Nuova Sottocategoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Nome Sottocategoria</Label>
              <Input
                value={currentSubcategory?.Description || ''}
                onChange={(e) => setCurrentSubcategory({
                  ...currentSubcategory,
                  Description: e.target.value
                })}
              />
            </div>
            <Button 
              className="w-full"
              onClick={handleSaveSubcategory}
            >
              Salva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;