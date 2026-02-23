// src/pages/progetti/progetti/ProjectListSection/constants/projectConstants.js
export const DEFAULT_COLUMN_WIDTHS = [
    250, // name
    300, // description
    200, // company
    120, // status
    120, // endDate
    150, // tasks
    80   // actions
  ];
  
  export const DEFAULT_PROJECT = {
    Name: "",
    Description: "",
    StartDate: new Date().toISOString().split("T")[0],
    EndDate: "",
    Status: "1B",
    ProjectCategoryId: 0,
    ProjectCategoryDetailLine: 0,
    CustSupp: 0,
    ProjectErpID: "",
  };
  
  export const DEFAULT_FILTERS = {
    status: [],
    searchText: "",
    categoryId: [],
    custSupp: null,
    projectErpId: "",
    taskAssignedTo: [],
  };
  
  export const EXPORT_TYPES = {
    CSV: 'csv',
    HTML: 'html',
    PDF: 'pdf'
  };