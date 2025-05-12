import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import useProjectCustomersActions, { CUSTOMER_TYPE } from "../../../hooks/useProjectCustomersActions";
import { swal } from "../../../lib/common";
import ProjectCustomersTable from "./ProjectCustomersTable";

const ProjectCustomers = () => {
  const {
    projectCustomers,
    loadingCustomers,
    uniqueCountries,
    uniqueRegions,
    uniqueCounties,
    fetchProjectCustomers,
    updateProjectCustomer,
    searchErpCustomers,
    linkToErpCustomer,
    importProjectCustomers,
    countriesData,  
    importFromERP,
  } = useProjectCustomersActions();

  useEffect(() => {
    fetchProjectCustomers();
  }, [fetchProjectCustomers]);

  // Handle new project customer addition
  const handleAddCustomer = async () => {
    try {
      // Prepara i dati per i dropdown
      const { value: formValues } = await swal.fire({
        title: "Nuovo Cliente Prospect",
        html: `
          <div class="space-y-4 text-left max-h-[70vh] overflow-y-auto pr-2" style="max-width: 500px; margin: 0 auto;">
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Codice Cliente</label>
              <input id="CustomerCode" class=" w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Codice Cliente" maxlength="50">
            </div>
            
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Codice FS</label>
              <input id="fscodice" class=" w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Codice FS" maxlength="64">
            </div>

            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome Azienda <span class="text-red-500">*</span></label>
              <input id="CompanyName" class=" w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Nome Azienda" maxlength="128" required>
            </div>

            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
              <input id="TaxIdNumber" class=" w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Partita IVA" maxlength="20">
            </div>
            
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
              <input id="Address" class=" w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Indirizzo" maxlength="128">
            </div>

            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">CAP</label>
              <input id="ZIPCode" class=" w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="CAP" maxlength="10">
            </div>
            
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Città</label>
              <input id="City" class=" w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Città" maxlength="64">
            </div>

            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Nazione</label>
              <select id="Country" class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                <option value="">-- Seleziona --</option>
                ${uniqueCountries.map(country => 
                  `<option value="${country}">${country}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Regione</label>
              <select id="Region" class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                <option value="">-- Seleziona --</option>
              </select>
            </div>
            
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <select id="County" class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                <option value="">-- Seleziona --</option>
              </select>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Conferma',
        cancelButtonText: 'Annulla',
        width: '550px',
        didOpen: () => {
          // Ottieni riferimenti ai dropdown
          const countrySelect = document.getElementById('Country');
          const regionSelect = document.getElementById('Region');
          const countySelect = document.getElementById('County');
          
          // Funzione per popolare le regioni in base alla nazione selezionata
          const populateRegions = (country) => {
            // Filtra le regioni per la nazione selezionata
            const filteredRegions = country 
              ? [...new Set(countriesData
                  .filter(item => item.Country === country)
                  .map(item => item.Region)
                  .filter(Boolean))] 
              : [];
            
            // Aggiorna il dropdown delle regioni
            regionSelect.innerHTML = '<option value="">-- Seleziona --</option>';
            filteredRegions.sort().forEach(region => {
              regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
            });
            
            // Reset del dropdown provincia
            countySelect.innerHTML = '<option value="">-- Seleziona --</option>';
          };
          
          // Funzione per popolare le province in base alla regione selezionata
          const populateCounties = (region) => {
            // Filtra le province per la regione selezionata
            const country = countrySelect.value;
            const filteredCounties = region
              ? [...new Set(countriesData
                  .filter(item => 
                    (country ? item.Country === country : true) && 
                    item.Region === region)
                  .map(item => item.County)
                  .filter(Boolean))]
              : [];
            
            // Aggiorna il dropdown delle province
            countySelect.innerHTML = '<option value="">-- Seleziona --</option>';
            filteredCounties.sort().forEach(county => {
              countySelect.innerHTML += `<option value="${county}">${county}</option>`;
            });
          };
          
          // Funzione per trovare la nazione data una provincia
          const findCountryAndRegionByCounty = (county) => {
            const match = countriesData.find(item => item.County === county);
            if (match) {
              if (match.Country) {
                countrySelect.value = match.Country;
                populateRegions(match.Country);
              }
              if (match.Region) {
                regionSelect.value = match.Region;
                populateCounties(match.Region);
              }
            }
          };
          
          // Event listeners
          countrySelect.addEventListener('change', () => {
            populateRegions(countrySelect.value);
          });
          
          regionSelect.addEventListener('change', () => {
            populateCounties(regionSelect.value);
            
            // Aggiorna anche la nazione se non è già selezionata
            if (!countrySelect.value && regionSelect.value) {
              const match = countriesData.find(item => item.Region === regionSelect.value);
              if (match && match.Country) {
                countrySelect.value = match.Country;
              }
            }
          });
          
          countySelect.addEventListener('change', () => {
            if (countySelect.value && (!countrySelect.value || !regionSelect.value)) {
              findCountryAndRegionByCounty(countySelect.value);
            }
          });
        },
        preConfirm: () => {
          const customerCode = document.getElementById("CustomerCode").value;
          const companyName = document.getElementById("CompanyName").value;
          const taxIdNumber = document.getElementById("TaxIdNumber").value;
          const address = document.getElementById("Address").value;
          const zipCode = document.getElementById("ZIPCode").value;
          const city = document.getElementById("City").value;
          const country = document.getElementById("Country").value;
          const region = document.getElementById("Region").value;
          const county = document.getElementById("County").value;
          const fscodice = document.getElementById("fscodice").value;

          if (!companyName) {
            swal.showValidationMessage('Nome azienda è obbligatorio');
            return false;
          }

          return {
            CustomerCode: customerCode,
            CompanyName: companyName,
            TaxIdNumber: taxIdNumber,
            Address: address,
            ZIPCode: zipCode,
            City: city,
            Country: country,
            Region: region,
            County: county,
            fscodice: fscodice,
            // Default to CUSTOMER_TYPE for new entries
            ERPCustSuppType: CUSTOMER_TYPE
          };
        }
      });

      if (formValues) {
        const result = await updateProjectCustomer(null, formValues);
        if (result && result.success) {
          swal.fire({
            title: "Successo",
            text: "Cliente prospect aggiunto con successo",
            icon: "success",
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error(result?.message || "Errore nell'aggiunta del cliente");
        }
      }
    } catch (error) {
      console.error("Errore nell'aggiunta:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text: error.toString()
      });
    }
  };

  // Handle linking to ERP customer
  const handleLinkToErp = async (id) => {
    try {
      const { value: searchTerm } = await swal.fire({
        title: "Cerca Cliente ERP",
        input: "text",
        inputPlaceholder: "Inserisci nome o codice cliente",
        showCancelButton: true,
        confirmButtonText: "Cerca",
        cancelButtonText: "Annulla"
      });

      if (searchTerm) {
        const erpCustomers = await searchErpCustomers(searchTerm);
        
        if (!erpCustomers || erpCustomers.length === 0) {
          swal.fire({
            icon: "info",
            title: "Nessun risultato",
            text: "Nessun cliente ERP trovato con questi criteri"
          });
          return;
        }

        // Formatta i risultati per la selezione
        const options = erpCustomers.map(customer => ({
          id: customer.CustSupp,
          text: `${customer.CustSupp} - ${customer.CompanyName}`
        }));

        const { value: selectedErpCustSupp } = await swal.fire({
          title: "Seleziona Cliente ERP",
          html: `
            <select id="erpCustomerSelect" class="swal2-select w-full">
              ${options.map(opt => `<option value="${opt.id}">${opt.text}</option>`).join('')}
            </select>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: "Collega",
          cancelButtonText: "Annulla",
          preConfirm: () => {
            return document.getElementById('erpCustomerSelect').value;
          }
        });

        if (selectedErpCustSupp) {
          const result = await linkToErpCustomer(id, selectedErpCustSupp);
          
          if (result && result.success) {
            swal.fire({
              icon: "success",
              title: "Collegato",
              text: result.message,
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            throw new Error(result?.message || "Errore nel collegamento al cliente ERP");
          }
        }
      }
    } catch (error) {
      console.error("Errore nel collegamento al cliente ERP:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text: error.toString()
      });
    }
  };

  // Excel export
  const handleExportExcel = () => {
    if (!projectCustomers || projectCustomers.length === 0) {
      swal.fire({
        icon: "warning",
        title: "Attenzione",
        text: "Non ci sono dati da esportare"
      });
      return;
    }
    
    try {
      // Configura le larghezze delle colonne
      const wscols = [
        {wch: 15},  // Id
        {wch: 20},  // CustomerCode
        {wch: 40},  // CompanyName
        {wch: 20},  // TaxIdNumber
        {wch: 40},  // Address
        {wch: 25},  // City
        {wch: 10},  // County
        {wch: 20},  // Country
        {wch: 10},  // ZIPCode
        {wch: 20},  // ERPCustSupp
        {wch: 15},  // ERPCustSuppType
        {wch: 10},  // Disabled
        {wch: 20},  // fscodice
      ];

      const worksheet = XLSX.utils.json_to_sheet(projectCustomers);
      worksheet['!cols'] = wscols;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "ClientiProspect");
      XLSX.writeFile(workbook, "ClientiProspect.xlsx");

      // Feedback all'utente
      swal.fire({
        title: "Successo",
        text: `Esportati ${projectCustomers.length} record`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Errore durante l'esportazione:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text: "Si è verificato un errore durante l'esportazione"
      });
    }
  };

  // CSV import
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Verifica che ci siano dati validi
            if (!results.data || results.data.length === 0) {
              throw new Error('Il file CSV non contiene dati validi');
            }

            // Verifica e formatta i dati (ConvertValuesForImport)
            const validRecords = results.data.map(row => {
              // Ensure all required fields have valid values
              return {
                // Use null for Id to let the server assign a new one if not provided
                Id: row.Id || null,
                CustomerCode: row.CustomerCode || '',
                CompanyName: row.CompanyName || 'Cliente Senza Nome',
                TaxIdNumber: row.TaxIdNumber || '',
                Address: row.Address || '',
                City: row.City || '',
                County: row.County || '',
                Country: row.Country || '',
                ZIPCode: row.ZIPCode || '',
                ERPCustSupp: row.ERPCustSupp || '',
                ERPCustSuppType: row.ERPCustSuppType || CUSTOMER_TYPE,
                Disabled: row.Disabled ? 1 : 0,
                fscodice: row.fscodice || ''
              };
            });

            // Chiedi conferma prima di importare
            const { isConfirmed } = await swal.fire({
              title: 'Conferma importazione',
              html: `
                <p>Stai per importare ${validRecords.length} clienti prospect.</p>
                <p>I seguenti campi sono presenti nel file:</p>
                <ul style="text-align: left; margin-top: 10px;">
                  ${results.meta.fields.map(field => `<li>${field}</li>`).join('')}
                </ul>
                <p>Vuoi continuare?</p>
              `,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sì, importa',
              cancelButtonText: 'Annulla'
            });

            if (isConfirmed) {
              const result = await importProjectCustomers(validRecords);
              
              if (result && result.success) {
                swal.fire({
                  icon: 'success',
                  title: 'Importazione completata',
                  text: `Importati ${result.importedCount} record con successo.`,
                  confirmButtonText: 'OK'
                });
              } else {
                throw new Error(result?.message || 'Errore durante l\'importazione');
              }
            }
          } catch (error) {
            console.error('Errore durante l\'importazione:', error);
            swal.fire({
              icon: 'error',
              title: 'Errore',
              text: error.message || 'Si è verificato un errore durante l\'importazione',
              confirmButtonText: 'OK'
            });
          }
        },
        error: (error) => {
          console.error('Errore nel parsing del CSV:', error);
          swal.fire('Errore', 'Errore nel parsing del file CSV', 'error');
        }
      });
    }
    // Reset input value to allow uploading the same file again
    event.target.value = null;
  };

  // Gestisce l'importazione da gestionale
const handleImportFromERP = async () => {
  try {
    const { value: searchTerm } = await swal.fire({
      title: "Cerca Cliente Gestionale",
      input: "text",
      inputPlaceholder: "Inserisci nome o codice cliente",
      showCancelButton: true,
      confirmButtonText: "Cerca",
      cancelButtonText: "Annulla"
    });

    if (searchTerm) {
      const erpCustomers = await searchErpCustomers(searchTerm);
      
      if (!erpCustomers || erpCustomers.length === 0) {
        swal.fire({
          icon: "info",
          title: "Nessun risultato",
          text: "Nessun cliente trovato con questi criteri nel gestionale"
        });
        return;
      }

      // Formatta i risultati per la selezione
      const options = erpCustomers.map(customer => ({
        id: customer.CustSupp,
        text: `${customer.CustSupp} - ${customer.CompanyName}`
      }));

      const { value: selectedErpCustSupp } = await swal.fire({
        title: "Seleziona Cliente da Importare",
        html: `
          <select id="erpCustomerSelect" class="w-full">
            ${options.map(opt => `<option value="${opt.id}">${opt.text}</option>`).join('')}
          </select>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Importa",
        cancelButtonText: "Annulla",
        preConfirm: () => {
          return document.getElementById('erpCustomerSelect').value;
        }
      });

      if (selectedErpCustSupp) {
        // Check if customer already exists in prospects
        const existingProspect = projectCustomers.find(
          c => c.ERPCustSupp === selectedErpCustSupp
        );
        
        if (existingProspect) {
          swal.fire({
            icon: "warning",
            title: "Cliente già presente",
            text: "Questo cliente è già presente nell'elenco dei prospect"
          });
          return;
        }
        
        const result = await importFromERP(selectedErpCustSupp);
        
        if (result && result.success) {
          swal.fire({
            icon: "success",
            title: "Importato",
            text: result.message,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error(result?.message || "Errore nell'importazione del cliente");
        }
      }
    }
  } catch (error) {
    console.error("Errore nell'importazione da gestionale:", error);
    swal.fire({
      icon: "error",
      title: "Errore",
      text: error.toString()
    });
  }
};

  return (
    <div className="p-3" style={{ maxWidth: "98%", justifyContent: 'center', margin: 'auto' }}>
      <div className="h-[calc(100vh-150px)]">
      <Button 
        onClick={handleImportFromERP}
        className="bg-purple-500 hover:bg-purple-600"
      >
        <i className="fas fa-file-import mr-2" />
        Importa da Gestionale
      </Button>
        <ProjectCustomersTable 
          projectCustomers={projectCustomers}
          loading={loadingCustomers}
          onUpdateCustomer={updateProjectCustomer}
          onAddCustomer={handleAddCustomer}
          onExportExcel={handleExportExcel}
          onFileUpload={handleFileUpload}
          onLinkToErp={handleLinkToErp}
        />
      </div>
    </div>
  );
};

export default ProjectCustomers;