// src/pages/progetti/progetti/articoli/BOMViewer/components/codingRules/ArticleSuggestions.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Package,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  Copy,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Hash,
  FileText,
  Loader2,
} from "lucide-react";
import useApiRequest from "@/hooks/useApiRequest";
import { config } from "@/config";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const ArticleSuggestions = ({
  companyId,
  rootCode = "",
  description = "",
  currentItemId = null,
  onSelectArticle,
  className = ""
}) => {
  const { makeRequest } = useApiRequest();
  
  // Stati
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  
  // Refs
  const dragRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const searchDebounceRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      if (rootCode.length >= 3 || description.length >= 3) {
        searchSimilarArticles();
      } else {
        setSuggestions([]);
      }
    }, 300); // Debounce di 300ms

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [rootCode, description, searchTerm, showAllSuggestions]);

  // Gestione drag migliorata con limiti viewport
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('[data-no-drag]')) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = dragRef.current.getBoundingClientRect();
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    
    // Calcola limiti con margine
    const margin = 20;
    const cardWidth = dragRef.current?.offsetWidth || 400;
    const cardHeight = dragRef.current?.offsetHeight || 300;
    
    const boundedX = Math.max(margin, Math.min(newX, window.innerWidth - cardWidth - margin));
    const boundedY = Math.max(margin, Math.min(newY, window.innerHeight - cardHeight - margin));
    
    setPosition({ x: boundedX, y: boundedY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Event listeners ottimizzati
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Funzione di ricerca ottimizzata
  const searchSimilarArticles = useCallback(async () => {
    if (loading) return; // Previeni chiamate multiple
    
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        companyId: companyId,
        rootCode: rootCode,
        description: description || "",
        excludeId: currentItemId || "",
        limit: showAllSuggestions ? 50 : 10
      });
      
      if (searchTerm) params.append("searchTerm", searchTerm);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/searchSimilar?${params}`,
        { method: "GET" }
      );
      
      if (response && Array.isArray(response)) {
        const enrichedResults = response.map(item => ({
          ...item,
          similarityScore: calculateSimilarity(item, rootCode, description),
          canModify: item.stato_erp !== 1
        }));
        
        enrichedResults.sort((a, b) => b.similarityScore - a.similarityScore);
        setSuggestions(enrichedResults);
      }
    } catch (error) {
      console.error("Errore nella ricerca articoli simili:", error);
      setSuggestions([]);
      toast({
        title: "Errore",
        description: "Impossibile caricare i suggerimenti",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, rootCode, description, currentItemId, searchTerm, showAllSuggestions, makeRequest, loading]);

  // Calcola similarità ottimizzata
  const calculateSimilarity = useCallback((item, targetRootCode, targetDescription) => {
    let score = 0;
    
    // Similarity basata sul codice
    if (item.Item && targetRootCode) {
      const itemRoot = item.Item.substring(0, targetRootCode.length).toUpperCase();
      const targetRoot = targetRootCode.toUpperCase();
      
      if (itemRoot === targetRoot) {
        score += 50;
      } else {
        // Calcolo Levenshtein distance semplificato
        let matches = 0;
        for (let i = 0; i < Math.min(itemRoot.length, targetRoot.length); i++) {
          if (itemRoot[i] === targetRoot[i]) matches++;
        }
        score += (matches / Math.max(itemRoot.length, targetRoot.length)) * 30;
      }
    }
    
    // Similarity basata sulla descrizione
    if (item.Description && targetDescription) {
      const desc1 = item.Description.toLowerCase().trim();
      const desc2 = targetDescription.toLowerCase().trim();
      
      // Exact match bonus
      if (desc1 === desc2) {
        score += 50;
      } else {
        // Word matching
        const words1 = new Set(desc1.split(/\s+/));
        const words2 = new Set(desc2.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        if (union.size > 0) {
          score += (intersection.size / union.size) * 40;
        }
      }
    }
    
    return Math.round(score);
  }, []);

  // Gestione selezione articolo
  const handleSelectArticle = useCallback((article) => {
    setSelectedArticle(article);
    setShowDetailsDialog(true);
  }, []);

  // Conferma selezione
  const handleConfirmSelection = useCallback(() => {
    if (selectedArticle && onSelectArticle) {
      onSelectArticle(selectedArticle);
      setShowDetailsDialog(false);
      
      toast({
        title: "Articolo selezionato",
        description: `Hai selezionato l'articolo ${selectedArticle.Item}`,
        variant: "success",
      });
      
      // Minimizza automaticamente dopo la selezione
      setTimeout(() => setIsMinimized(true), 1000);
    }
  }, [selectedArticle, onSelectArticle]);

  // Quick select senza dialog
  const handleQuickSelect = useCallback((e, article) => {
    e.stopPropagation();
    
    if (onSelectArticle) {
      onSelectArticle(article);
      
      toast({
        title: "Articolo selezionato",
        description: `${article.Item} - ${article.Description}`,
        variant: "success",
      });
      
      // Minimizza dopo la selezione
      setTimeout(() => setIsMinimized(true), 800);
    }
  }, [onSelectArticle]);

  // Filtra suggerimenti con memoization
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm) return suggestions;
    
    const term = searchTerm.toLowerCase();
    return suggestions.filter(item => 
      item.Item.toLowerCase().includes(term) ||
      item.Description.toLowerCase().includes(term)
    );
  }, [suggestions, searchTerm]);

  // Statistiche con memoization
  const suggestionStats = useMemo(() => {
    return {
      total: filteredSuggestions.length,
      erp: filteredSuggestions.filter(s => s.stato_erp === 1).length,
      temp: filteredSuggestions.filter(s => s.stato_erp !== 1).length,
      highScore: filteredSuggestions.filter(s => s.similarityScore >= 70).length,
      perfect: filteredSuggestions.filter(s => s.similarityScore >= 90).length
    };
  }, [filteredSuggestions]);

  // Non mostrare se non ci sono suggerimenti
  if (suggestions.length === 0 && !loading) {
    return <div ref={containerRef} />;
  }

  return (
    <>
      {/* Placeholder per mantenere spazio */}
      <div ref={containerRef} />

      {/* Floating Card con animazioni */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            ref={dragRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-50 ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: '400px',
              boxShadow: isDragging 
                ? '0 20px 50px rgba(0,0,0,0.2)' 
                : '0 10px 40px rgba(0,0,0,0.15)',
            }}
          >
            <Card className="border-amber-200 bg-white/95 backdrop-blur-sm overflow-hidden">
              {/* Header ottimizzato */}
              <div
                className={`flex items-center justify-between p-3 border-b bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg cursor-grab transition-all ${
                  isDragging ? 'cursor-grabbing' : ''
                }`}
                onMouseDown={handleMouseDown}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    Articoli simili
                  </span>
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {suggestionStats.total}
                    </Badge>
                  )}
                  {suggestionStats.perfect > 0 && (
                    <Badge variant="success" className="text-xs bg-green-100 text-green-700">
                      {suggestionStats.perfect} perfetti
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1" data-no-drag>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronUp className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setIsMinimized(true)}
                  >
                    <Minimize2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Contenuto animato */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="p-3" data-no-drag>
                      {/* Barra di ricerca migliorata */}
                      {filteredSuggestions.length > 5 && (
                        <div className="mb-3">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                            <Input
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Filtra suggerimenti..."
                              className="pl-8 h-9 bg-white pr-8"
                            />
                            {searchTerm && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1 h-7 w-7"
                                onClick={() => setSearchTerm("")}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Lista suggerimenti ottimizzata */}
                      <ScrollArea className="h-64">
                        <div className="space-y-1 pr-2">
                          {loading && filteredSuggestions.length === 0 ? (
                            <div className="flex items-center justify-center h-32">
                              <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Ricerca in corso...</p>
                              </div>
                            </div>
                          ) : filteredSuggestions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">Nessun articolo simile trovato</p>
                            </div>
                          ) : (
                            filteredSuggestions
                              .slice(0, showAllSuggestions ? undefined : 10)
                              .map((item) => (
                                <motion.div
                                  key={item.Id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className={`group flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                                    hoveredItemId === item.Id ? 'bg-amber-50' : 'hover:bg-amber-50/50'
                                  }`}
                                  onClick={() => handleSelectArticle(item)}
                                  onMouseEnter={() => setHoveredItemId(item.Id)}
                                  onMouseLeave={() => setHoveredItemId(null)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Hash className="h-3 w-3 text-gray-400" />
                                      <span className="font-mono text-sm font-medium group-hover:text-amber-700 truncate">
                                        {item.Item}
                                      </span>
                                      {item.stato_erp === 1 && (
                                        <Lock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                      )}
                                      {item.similarityScore >= 90 ? (
                                        <Badge variant="success" className="text-xs bg-green-100 text-green-700 flex-shrink-0">
                                          {item.similarityScore}%
                                        </Badge>
                                      ) : item.similarityScore >= 70 ? (
                                        <Badge variant="warning" className="text-xs bg-amber-100 text-amber-700 flex-shrink-0">
                                          {item.similarityScore}%
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <FileText className="h-3 w-3 text-gray-400" />
                                      <span className="text-xs text-gray-600 truncate">
                                        {item.Description}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectArticle(item);
                                            }}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Dettagli
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={(e) => handleQuickSelect(e, item)}
                                          >
                                            <ArrowRight className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Usa questo articolo
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </motion.div>
                              ))
                          )}
                        </div>
                      </ScrollArea>
                      
                      {/* Footer ottimizzato */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {suggestionStats.erp > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                {suggestionStats.erp} ERP
                              </span>
                            )}
                            {suggestionStats.erp > 0 && suggestionStats.temp > 0 && (
                              <span className="mx-1">•</span>
                            )}
                            {suggestionStats.temp > 0 && (
                              <span>{suggestionStats.temp} temporanei</span>
                            )}
                          </div>
                          {filteredSuggestions.length > 10 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                              className="h-7 text-xs"
                            >
                              {showAllSuggestions ? "Mostra meno" : `Mostra tutti (${filteredSuggestions.length})`}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Versione minimizzata migliorata */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 left-1/2 z-50"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white relative group transform transition-transform hover:scale-105"
                    onClick={() => {
                      setIsMinimized(false);
                      setIsCollapsed(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-medium">{suggestionStats.total}</span>
                    </div>
                    {suggestionStats.perfect > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <span className="text-xs text-white font-bold">
                          {suggestionStats.perfect}
                        </span>
                      </motion.div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Articoli simili trovati</p>
                    {suggestionStats.highScore > 0 && (
                      <p className="text-xs">
                        {suggestionStats.highScore} con alta compatibilità
                      </p>
                    )}
                    {suggestionStats.perfect > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        {suggestionStats.perfect} match perfetti!
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog dettagli migliorato */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Articolo</DialogTitle>
            <DialogDescription>
              Informazioni complete sull'articolo selezionato
            </DialogDescription>
          </DialogHeader>
          
          {selectedArticle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Codice</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-medium text-lg">
                      {selectedArticle.Item}
                    </span>
                    {selectedArticle.stato_erp === 1 && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        ERP
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Natura</label>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedArticle.Nature === 22413312 && (
                      <>
                        <Package className="h-4 w-4 text-blue-500" />
                        <span>Semilavorato</span>
                      </>
                    )}
                    {selectedArticle.Nature === 22413313 && (
                      <>
                        <Package className="h-4 w-4 text-green-500" />
                        <span>Prodotto Finito</span>
                      </>
                    )}
                    {selectedArticle.Nature === 22413314 && (
                      <>
                        <Package className="h-4 w-4 text-orange-500" />
                        <span>Materia Prima</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Descrizione</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedArticle.Description}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Analisi Similarità</label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Match totale</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedArticle.similarityScore}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={`h-2 rounded-full ${
                            selectedArticle.similarityScore >= 90
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : selectedArticle.similarityScore >= 70
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500'
                          }`}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {selectedArticle.similarityScore}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Radice codice:</span>
                      <span className="ml-2 font-mono">{selectedArticle.Item.substring(0, 10)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Unità di misura:</span>
                      <span className="ml-2">{selectedArticle.BaseUoM || "PZ"}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedArticle.stato_erp === 1 && (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    Questo articolo è presente in ERP. Il componente verrà sostituito con questo articolo esistente.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Chiudi
            </Button>
            <Button onClick={handleConfirmSelection}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Usa questo articolo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArticleSuggestions;