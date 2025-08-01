import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Info, CheckCircle, AlertTriangle, XCircle, X, AlertCircle, Shield } from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-lg p-4 flex items-start gap-3",
  {
    variants: {
      variant: {
        default: "bg-[rgb(244,244,245)] text-[rgb(0,0,0)] dark:bg-gray-900/10 dark:text-gray-100",
        primary: "bg-[rgb(230,241,254)] text-[rgb(0,91,196)] dark:bg-blue-900/10 dark:text-blue-300",
        secondary: "bg-[rgb(242,234,250)] text-[rgb(96,32,160)] dark:bg-purple-900/10 dark:text-purple-300",
        success: "bg-[rgb(232,250,240)] text-[rgb(14,121,60)] dark:bg-green-900/10 dark:text-green-300",
        warning: "bg-[rgb(254,252,232)] text-[rgb(147,99,22)] dark:bg-yellow-900/10 dark:text-yellow-300",
        destructive: "bg-[rgb(254,231,239)] text-[rgb(194,14,77)] dark:bg-red-900/10 dark:text-red-300",
        danger: "bg-[rgb(254,231,239)] text-[rgb(194,14,77)] dark:bg-red-900/10 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconWrapperVariants = cva(
  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
  {
    variants: {
      variant: {
        default: "bg-[rgb(0,0,0)] dark:bg-gray-600",
        primary: "bg-[rgb(0,91,196)] dark:bg-blue-500",
        secondary: "bg-[rgb(96,32,160)] dark:bg-purple-500",
        success: "bg-[rgb(14,121,60)] dark:bg-green-500",
        warning: "bg-[rgb(147,99,22)] dark:bg-yellow-600",
        destructive: "bg-[rgb(194,14,77)] dark:bg-red-500",
        danger: "bg-[rgb(194,14,77)] dark:bg-red-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Icone personalizzate per ogni tipo
const iconMap = {
  default: Info,
  primary: Info,
  secondary: Info,
  success: CheckCircle,
  warning: Shield, // Scudo per warning
  destructive: AlertTriangle, // Triangolo/esagono per danger
  danger: AlertTriangle,
};

const Alert = React.forwardRef(({ 
  className, 
  variant = "default",
  icon,
  isClosable = false,
  onClose,
  children,
  ...props 
}, ref) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleClose = React.useCallback(() => {
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  if (!isVisible) return null;

  const IconComponent = icon || iconMap[variant] || iconMap.default;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <div className={cn(iconWrapperVariants({ variant }))}>
        <IconComponent className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {isClosable && (
        <button
          onClick={handleClose}
          className={cn(
            "ml-auto -mr-1.5 -mt-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
            variant === "default" && "text-[rgb(0,0,0)] hover:text-gray-700 focus:ring-gray-400",
            variant === "primary" && "text-[rgb(0,91,196)] hover:text-blue-700 focus:ring-blue-400",
            variant === "secondary" && "text-[rgb(96,32,160)] hover:text-purple-700 focus:ring-purple-400",
            variant === "success" && "text-[rgb(14,121,60)] hover:text-green-700 focus:ring-green-400",
            variant === "warning" && "text-[rgb(147,99,22)] hover:text-yellow-700 focus:ring-yellow-400",
            (variant === "destructive" || variant === "danger") && "text-[rgb(194,14,77)] hover:text-red-700 focus:ring-red-400"
          )}
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };