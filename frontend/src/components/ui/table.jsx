import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto ">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(
  ({ className, filters, onFilterChange, ...props }, ref) => (
    <>
      <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props}>
        {props.children}
        {filters && (
          <tr>
            {filters.map((filter, index) => (
              <th key={index} className="p-2">
                {filter.type === "text" && (
                  <input
                    type="text"
                    placeholder="Cerca..."
                    className="border rounded px-2 py-1 w-full"
                    onChange={(e) => onFilterChange(index, e.target.value)}
                  />
                )}
                {filter.type === "number" && (
                  <input
                    type="number"
                    placeholder="Cerca..."
                    className="border rounded px-2 py-1 w-full"
                    onChange={(e) => onFilterChange(index, e.target.value)}
                  />
                )}
                {filter.type === "date" && (
                  <input
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    onChange={(e) => onFilterChange(index, e.target.value)}
                  />
                )}
              </th>
            ))}
          </tr>
        )}
      </thead>
    </>
  ),
);
TableHeader.displayName = "TableHeader";

const ResizableTableHead = React.forwardRef(
  ({ className, onResize, ...props }, ref) => {
    const handleMouseDown = (e) => {
      const startX = e.pageX;
      const startWidth = ref.current.offsetWidth;

      const handleMouseMove = (e) => {
        const newWidth = startWidth + (e.pageX - startX);
        ref.current.style.width = `${newWidth}px`;
        if (onResize) onResize(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    return (
      <th
        ref={ref}
        className={cn(
          "relative h-8 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
          className,
        )}
        {...props}
      >
        {props.children}
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
          onMouseDown={handleMouseDown}
        />
      </th>
    );
  },
);
ResizableTableHead.displayName = "ResizableTableHead";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const FilterInput = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border rounded px-2 py-1 w-full"
    />
    {value && (
      <button
        onClick={() => onChange("")}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
        aria-label="Clear filter"
      >
        ✖
      </button>
    )}
  </div>
);

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  ResizableTableHead,
  FilterInput,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
