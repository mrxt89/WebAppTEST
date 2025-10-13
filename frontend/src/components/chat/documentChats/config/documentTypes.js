import { 
    FileText, 
    Package, 
    Users, 
    File, 
    Link, 
    ShoppingCart,
    Truck,
    Clipboard,
    Tag,
    Ticket
  } from "lucide-react";
  
  export const DOCUMENT_TYPES = {
    Task: {
      id: 'Task',
      label: 'Attività',
      icon: Clipboard,
      color: 'blue',
      fields: ['TaskID', 'ProjectID'],
      displayFormat: (doc) => `Attività: ${doc.Title || doc.TaskID}`
    },
    Customer: {
      id: 'Customer',
      label: 'Cliente',
      icon: Users,
      color: 'green',
      fields: ['CustSuppCode'],
      displayFormat: (doc) => `Cliente: ${doc.CompanyName || doc.CustSuppCode}`
    },
    Supplier: {
      id: 'Supplier',
      label: 'Fornitore',
      icon: Truck,
      color: 'orange',
      fields: ['CustSuppCode'],
      displayFormat: (doc) => `Fornitore: ${doc.CompanyName || doc.CustSuppCode}`
    },
    SaleOrd: {
      id: 'SaleOrd',
      label: 'Ordine Cliente',
      icon: ShoppingCart,
      color: 'indigo',
      fields: ['SaleOrdId'],
      displayFormat: (doc) => `OC: ${doc.InternalOrdNo || doc.SaleOrdId}`
    },
    MO: {
      id: 'MO',
      label: 'Ordine Produzione',
      icon: Package,
      color: 'purple',
      fields: ['MOId'],
      displayFormat: (doc) => `ODP: ${doc.MONo || doc.MOId}`
    },
    SaleDoc: {
      id: 'SaleDoc',
      label: 'Documento Vendita',
      icon: FileText,
      color: 'teal',
      fields: ['SaleDocId'],
      displayFormat: (doc) => `Doc: ${doc.DocNo || doc.SaleDocId}`
    },
    Item: {
      id: 'Item',
      label: 'Articolo',
      icon: Tag,
      color: 'yellow',
      fields: ['ItemCode'],
      displayFormat: (doc) => `Art: ${doc.ItemCode}`
    },
    BOM: {
      id: 'BOM',
      label: 'Distinta Base',
      icon: File,
      color: 'gray',
      fields: ['BOM'],
      displayFormat: (doc) => `DB: ${doc.BOM}`
    },
    Ticket: {
      id: 'Ticket',
      label: 'Ticket',
      icon: Ticket,
      color: 'red',
      fields: ['ticketId'],
      displayFormat: () => `Ticket`
    }
  };
  
  // Helper per ottenere la configurazione di un tipo
  export const getDocumentTypeConfig = (type) => {
    return DOCUMENT_TYPES[type] || null;
  };
  
  // Helper per ottenere tutti i tipi disponibili
  export const getAllDocumentTypes = () => {
    return Object.values(DOCUMENT_TYPES);
  };