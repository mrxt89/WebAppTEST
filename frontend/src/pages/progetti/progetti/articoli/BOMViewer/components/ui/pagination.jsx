// components/ui/pagination.jsx (aggiungi questo se non esiste già)
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  maxPageNumbers = 5,
}) => {
  // Calculate page numbers to display
  const getPageNumbers = () => {
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page, last page, and pages around current page
    const pages = [1];

    const startPage = Math.max(2, currentPage - Math.floor(maxPageNumbers / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxPageNumbers - 3);

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push("...");
    }

    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push("...");
    }

    // Add last page
    pages.push(totalPages);

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageNumbers = showPageNumbers ? getPageNumbers() : [];

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {showPageNumbers &&
        pageNumbers.map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`} className="px-2">
              ...
            </span>
          ) : (
            <Button
              key={`page-${page}`}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ),
        )}

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
