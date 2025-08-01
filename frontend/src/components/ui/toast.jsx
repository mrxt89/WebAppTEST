import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority";
import { X, Info, CheckCircle, AlertTriangle, XCircle, Shield } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const positionClasses = {
  "top-left": "fixed top-0 left-0 flex-col",
  "top-center": "fixed top-0 left-1/2 -translate-x-1/2 flex-col",
  "top-right": "fixed top-0 right-0 flex-col",
  "bottom-left": "fixed bottom-0 left-0 flex-col-reverse",
  "bottom-center": "fixed bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse",
  "bottom-right": "fixed bottom-0 right-0 flex-col-reverse",
};

const ToastViewport = React.forwardRef(({ className, position = "bottom-right", ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "z-[100] flex max-h-screen w-full p-4 md:max-w-[420px]",
      positionClasses[position] || positionClasses["bottom-right"],
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-[rgb(244,244,245)] text-[rgb(0,0,0)]",
        primary: "border bg-[rgb(230,241,254)] text-[rgb(0,91,196)]",
        secondary: "border bg-[rgb(242,234,250)] text-[rgb(96,32,160)]",
        success: "border bg-[rgb(232,250,240)] text-[rgb(14,121,60)]",
        warning: "border bg-[rgb(254,252,232)] text-[rgb(147,99,22)]",
        destructive: "border bg-[rgb(254,231,239)] text-[rgb(194,14,77)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconWrapperVariants = cva(
  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
  {
    variants: {
      variant: {
        default: "bg-[rgb(0,0,0)]",
        primary: "bg-[rgb(0,91,196)]",
        secondary: "bg-[rgb(96,32,160)]",
        success: "bg-[rgb(14,121,60)]",
        warning: "bg-[rgb(147,99,22)]",
        destructive: "bg-[rgb(194,14,77)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap = {
  default: Info,
  primary: Info,
  secondary: Info,
  success: CheckCircle,
  warning: Shield,
  destructive: AlertTriangle,
};

const Toast = React.forwardRef(({ className, variant, icon, ...props }, ref) => {
  const IconComponent = icon || iconMap[variant] || iconMap.default;
  
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className={cn(iconWrapperVariants({ variant }))}>
          <IconComponent className="h-5 w-5 text-white" />
        </div>
        <div className="grid gap-1">
          {props.children}
        </div>
      </div>
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(({ className, variant, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
      variant === "default" && "text-[rgb(0,0,0)] hover:text-gray-700 focus:ring-gray-400",
      variant === "primary" && "text-[rgb(0,91,196)] hover:text-blue-700 focus:ring-blue-400",
      variant === "secondary" && "text-[rgb(96,32,160)] hover:text-purple-700 focus:ring-purple-400",
      variant === "success" && "text-[rgb(14,121,60)] hover:text-green-700 focus:ring-green-400",
      variant === "warning" && "text-[rgb(147,99,22)] hover:text-yellow-700 focus:ring-yellow-400",
      variant === "destructive" && "text-[rgb(194,14,77)] hover:text-red-700 focus:ring-red-400",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};