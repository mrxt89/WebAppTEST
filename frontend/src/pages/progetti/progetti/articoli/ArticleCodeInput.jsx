import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Loader2,
  Database,
  Package
} from "lucide-react";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";

/**
 * ArticleCodeInput - Componente per l'input del codice articolo con validazione in tempo reale
 * @param {string} value - Valore corrente del codice articolo
 * @param {Function} onChange - Callback chiamata quando il valore cambia
 * @param {Function} onValidation - Callback chiamata con il risultato della validazione
 * @param {number} excludeItemId - ID articolo da escludere dalla validazione (per modifica)
 * @param {boolean} disabled - Se l'input è disabilitato
 * @param {boolean} isFromERP - Se l'articolo proviene dal gestionale (disabilita modifica)
 * @param {string} placeholder - Placeholder per l'input
 * @param {boolean} required - Se il campo è obbligatorio
 * @param {string} className - Classi CSS aggiuntive
 */
const ArticleCodeInput = ({
  value = "",
  onChange,
  onValidation,
  excludeItemId = null,
  disabled = false,
  isFromERP = false,
  placeholder = "Inserisci codice articolo",
  required = true,
  className = ""
}) => {
  const [validationState, setValidationState] = useState({
    status: 'idle', // 'idle', 'validating', 'valid', 'invalid', 'warning'
    message: '',
    isWarning: false
  });
  
  const { validateItemCodeRealTime, clearValidationCache } = useProjectArticlesActions();

  // Effect per la validazione in tempo reale
  useEffect(() => {
    if (!value || value.trim() === '') {
      setValidationState({ status: 'idle', message: '', isWarning: false });
      if (onValidation) {
        onValidation({ isValid: !required, message: required ? 'Campo obbligatorio' : '' });
      }
      return;
    }

    setValidationState({ status: 'validating', message: 'Validazione in corso...', isWarning: false });

    validateItemCodeRealTime(
      value.trim(),
      excludeItemId,
      (result) => {
        const newState = {
          status: result.isValid ? (result.isWarning ? 'warning' : 'valid') : 'invalid',
          message: result.message,
          isWarning: result.isWarning
        };
        
        setValidationState(newState);
        
        if (onValidation) {
          onValidation({
            isValid: result.isValid,
            message: result.message,
            isWarning: result.isWarning
          });
        }
      },
      300 // Debounce di 300ms
    );
  }, [value, excludeItemId, validateItemCodeRealTime, onValidation, required]);

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      clearValidationCache();
    };
  }, [clearValidationCache]);

  // Gestione cambio valore
  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Limita lunghezza a 64 caratteri
    if (newValue.length <= 64) {
      onChange(newValue);
    }
  };

  // Determina lo stile dell'input in base allo stato di validazione
  const getInputClassName = () => {
    const baseClasses = "pr-10"; // Spazio per l'icona
    
    switch (validationState.status) {
      case 'valid':
        return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-500`;
      case 'warning':
        return `${baseClasses} border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500`;
      case 'invalid':
        return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500`;
      default:
        return baseClasses;
    }
  };

  // Icona di stato
  const getStatusIcon = () => {
    switch (validationState.status) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Messaggio di aiuto
  const getHelpMessage = () => {
    if (isFromERP) {
      return (
        <div className="flex items-center gap-2 text-blue-600 text-sm mt-1">
          <Database className="h-4 w-4" />
          <span>Codice articolo dal gestionale (non modificabile)</span>
        </div>
      );
    }

    if (validationState.status === 'idle' && !value) {
      return (
        <div className="text-gray-500 text-sm mt-1">
          Inserisci un codice articolo univoco (max 64 caratteri)
        </div>
      );
    }

    return null;
  };

  // Alert per messaggi di validazione
  const getValidationAlert = () => {
    if (validationState.status === 'idle' || !validationState.message) {
      return null;
    }

    const alertProps = {
      className: "mt-2",
    };

    if (validationState.status === 'invalid') {
      alertProps.className += " border-red-200 bg-red-50";
    } else if (validationState.status === 'warning') {
      alertProps.className += " border-yellow-200 bg-yellow-50";
    } else if (validationState.status === 'valid' && validationState.isWarning) {
      alertProps.className += " border-blue-200 bg-blue-50";
    }

    return (
      <Alert {...alertProps}>
        <div className="flex items-center gap-2">
          {validationState.status === 'invalid' && <AlertCircle className="h-4 w-4 text-red-500" />}
          {validationState.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          {validationState.status === 'valid' && validationState.isWarning && <Database className="h-4 w-4 text-blue-500" />}
          <AlertDescription className="text-sm">
            {validationState.message}
            {validationState.isWarning && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  Il codice può comunque essere utilizzato
                </Badge>
              </div>
            )}
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="item-code" className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        Codice Articolo
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id="item-code"
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled || isFromERP}
          placeholder={isFromERP ? "Codice dal gestionale" : placeholder}
          className={`${getInputClassName()} ${className}`}
          maxLength={64}
        />
        
        {/* Icona di stato */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {getStatusIcon()}
        </div>
      </div>

      {/* Messaggio di aiuto */}
      {getHelpMessage()}

      {/* Alert di validazione */}
      {getValidationAlert()}

      {/* Indicatore caratteri rimanenti */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>
          {value.length}/64 caratteri
        </span>
        {validationState.status === 'valid' && !validationState.isWarning && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>Codice disponibile</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleCodeInput;