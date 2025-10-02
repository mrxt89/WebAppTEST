import { useState, useCallback } from 'react';

// ========================================
// HOOK PERSONALIZZATO PER GESTIONE DATI NOTI
// ========================================

const useKnownData = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Funzione per fare richieste API
    const apiRequest = useCallback(async (url, options = {}) => {
        const token = localStorage.getItem('token');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nella richiesta');
        }
        
        return result;
    }, []);

    // Ottiene tutti i dati noti
    const getAllKnownData = useCallback(async (dataType = null) => {
        setLoading(true);
        setError(null);
        
        try {
            const url = dataType ? `/api/known-data?dataType=${dataType}` : '/api/known-data';
            const result = await apiRequest(url);
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Ottiene i dati noti per un singolo articolo
    const getKnownDataForItem = useCallback(async (itemCode, dataType) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest(`/api/known-data/item/${itemCode}/${dataType}`);
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Crea un nuovo parametro
    const createParameter = useCallback(async (parameterData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest('/api/known-data/parameter', {
                method: 'POST',
                body: JSON.stringify(parameterData)
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Aggiorna un parametro esistente
    const updateParameter = useCallback(async (parameterId, parameterData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest(`/api/known-data/parameter/${parameterId}`, {
                method: 'PUT',
                body: JSON.stringify(parameterData)
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Elimina un parametro
    const deleteParameter = useCallback(async (parameterId) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest(`/api/known-data/parameter/${parameterId}`, {
                method: 'DELETE'
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Crea una nuova formula
    const createFormula = useCallback(async (formulaData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest('/api/known-data/formula', {
                method: 'POST',
                body: JSON.stringify(formulaData)
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Aggiorna una formula esistente
    const updateFormula = useCallback(async (formulaId, formulaData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest(`/api/known-data/formula/${formulaId}`, {
                method: 'PUT',
                body: JSON.stringify(formulaData)
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Elimina una formula
    const deleteFormula = useCallback(async (formulaId) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest(`/api/known-data/formula/${formulaId}`, {
                method: 'DELETE'
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Crea una regola di matching
    const createMatchingRule = useCallback(async (ruleData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest('/api/known-data/matching-rule', {
                method: 'POST',
                body: JSON.stringify(ruleData)
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Aggiorna una regola di matching
    const updateMatchingRule = useCallback(async (ruleId, ruleData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest(`/api/known-data/matching-rule/${ruleId}`, {
                method: 'PUT',
                body: JSON.stringify(ruleData)
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Elimina una regola di matching
    const deleteMatchingRule = useCallback(async (ruleId) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest(`/api/known-data/matching-rule/${ruleId}`, {
                method: 'DELETE'
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Testa il calcolo di un dato noto
    const testCalculation = useCallback(async (testData) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiRequest('/api/known-data/test-calculation', {
                method: 'POST',
                body: JSON.stringify(testData)
            });
            return result.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    // Utility per raggruppare i dati per ItemCode
    const groupKnownDataByItem = useCallback((knownData) => {
        return knownData.reduce((acc, item) => {
            const key = `${item.itemCode}_${item.dataType}`;
            if (!acc[key]) {
                acc[key] = {
                    itemCode: item.itemCode,
                    itemDescription: item.itemDescription,
                    dataType: item.dataType,
                    parameters: [],
                    formulas: [],
                    matchingRules: []
                };
            }
            
            if (item.parameterName) {
                acc[key].parameters.push(item);
            }
            if (item.formulaName) {
                acc[key].formulas.push(item);
            }
            if (item.matchingType) {
                acc[key].matchingRules.push(item);
            }
            
            return acc;
        }, {});
    }, []);

    // Utility per filtrare i dati
    const filterKnownData = useCallback((knownData, filters) => {
        const { searchTerm = '', dataType = 'ALL', activeFilter = 'ALL' } = filters;
        
        return knownData.filter(item => {
            const matchesSearch = item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.parameterName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesDataType = dataType === 'ALL' || item.dataType === dataType;
            const matchesActive = activeFilter === 'ALL' || 
                                (activeFilter === 'ACTIVE' && item.isActive) ||
                                (activeFilter === 'INACTIVE' && !item.isActive);
            
            return matchesSearch && matchesDataType && matchesActive;
        });
    }, []);

    // Utility per validare i dati del form
    const validateParameterData = useCallback((data) => {
        const errors = {};
        
        if (!data.itemCode || data.itemCode.trim() === '') {
            errors.itemCode = 'Il codice articolo è obbligatorio';
        }
        
        if (!data.dataType || data.dataType.trim() === '') {
            errors.dataType = 'Il tipo dato è obbligatorio';
        }
        
        if (!data.parameterName || data.parameterName.trim() === '') {
            errors.parameterName = 'Il nome parametro è obbligatorio';
        }
        
        if (data.parameterValue === undefined || data.parameterValue === null || data.parameterValue === '') {
            errors.parameterValue = 'Il valore parametro è obbligatorio';
        }
        
        if (isNaN(parseFloat(data.parameterValue))) {
            errors.parameterValue = 'Il valore parametro deve essere un numero valido';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }, []);

    // Utility per validare i dati della formula
    const validateFormulaData = useCallback((data) => {
        const errors = {};
        
        if (!data.itemCode || data.itemCode.trim() === '') {
            errors.itemCode = 'Il codice articolo è obbligatorio';
        }
        
        if (!data.dataType || data.dataType.trim() === '') {
            errors.dataType = 'Il tipo dato è obbligatorio';
        }
        
        if (!data.formulaName || data.formulaName.trim() === '') {
            errors.formulaName = 'Il nome formula è obbligatorio';
        }
        
        if (!data.formulaExpression || data.formulaExpression.trim() === '') {
            errors.formulaExpression = 'L\'espressione formula è obbligatoria';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }, []);

    // Utility per validare i dati del test
    const validateTestData = useCallback((data) => {
        const errors = {};
        
        if (!data.itemCode || data.itemCode.trim() === '') {
            errors.itemCode = 'Il codice articolo è obbligatorio';
        }
        
        if (!data.dataType || data.dataType.trim() === '') {
            errors.dataType = 'Il tipo dato è obbligatorio';
        }
        
        if (data.L === undefined || data.L === null || data.L === '') {
            errors.L = 'Il valore L (lunghezza) è obbligatorio';
        }
        
        if (isNaN(parseFloat(data.L))) {
            errors.L = 'Il valore L deve essere un numero valido';
        }
        
        if (data.QTA === undefined || data.QTA === null || data.QTA === '') {
            errors.QTA = 'Il valore QTA (quantità) è obbligatorio';
        }
        
        if (isNaN(parseFloat(data.QTA))) {
            errors.QTA = 'Il valore QTA deve essere un numero valido';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }, []);

    return {
        // Stati
        loading,
        error,
        
        // Funzioni CRUD
        getAllKnownData,
        getKnownDataForItem,
        createParameter,
        updateParameter,
        deleteParameter,
        createFormula,
        updateFormula,
        deleteFormula,
        createMatchingRule,
        updateMatchingRule,
        deleteMatchingRule,
        testCalculation,
        
        // Utility
        groupKnownDataByItem,
        filterKnownData,
        validateParameterData,
        validateFormulaData,
        validateTestData
    };
};

export default useKnownData;
