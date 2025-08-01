"use client";
// Inspired by react-hot-toast library
import * as React from "react";

const TOAST_LIMIT = 3; // Aumentato per permettere più notifiche
const TOAST_REMOVE_DELAY = 5000; // 5 secondi per default

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map();

const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// Configurazione globale per la posizione dei toast
let globalPosition = "bottom-right";

// Funzione per impostare la posizione globale
toast.setPosition = (position) => {
  globalPosition = position;
  // Notifica tutti i listener del cambio di posizione
  listeners.forEach((listener) => {
    listener({ ...memoryState, position: globalPosition });
  });
};

// Funzione toast principale con supporto per varianti
function toast(props) {
  // Se viene passata una stringa, la convertiamo in oggetto
  if (typeof props === "string") {
    props = { description: props };
  }

  const id = genId();

  // Determina la durata in base alla variante
  const duration = props.duration || (props.variant === "destructive" ? 7000 : TOAST_REMOVE_DELAY);

  const update = (props) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      variant: "default", // variante di default
      position: props.position || globalPosition, // usa posizione specifica o globale
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss dopo il timeout
  const dismissTimeout = setTimeout(() => {
    dismiss();
  }, duration);

  // Cancella il timeout se il toast viene chiuso manualmente
  const originalDismiss = dismiss;
  const dismissWithClearTimeout = () => {
    clearTimeout(dismissTimeout);
    originalDismiss();
  };

  return {
    id: id,
    dismiss: dismissWithClearTimeout,
    update,
  };
}

// Helper functions per le varianti comuni
toast.success = (props) => {
  if (typeof props === "string") {
    return toast({ description: props, variant: "success" });
  }
  return toast({ ...props, variant: "success" });
};

toast.error = (props) => {
  if (typeof props === "string") {
    return toast({ description: props, variant: "destructive" });
  }
  return toast({ ...props, variant: "destructive" });
};

toast.warning = (props) => {
  if (typeof props === "string") {
    return toast({ description: props, variant: "warning" });
  }
  return toast({ ...props, variant: "warning" });
};

toast.info = (props) => {
  if (typeof props === "string") {
    return toast({ description: props, variant: "primary" });
  }
  return toast({ ...props, variant: "primary" });
};

function useToast() {
  const [state, setState] = React.useState({ ...memoryState, position: globalPosition });

  React.useEffect(() => {
    const updateState = (newState) => {
      setState({ ...newState, position: globalPosition });
    };
    listeners.push(updateState);
    return () => {
      const index = listeners.indexOf(updateState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };