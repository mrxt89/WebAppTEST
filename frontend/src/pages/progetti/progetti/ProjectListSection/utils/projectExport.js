import { toast } from "@/components/ui/use-toast";

export const exportToCSV = (filteredProjects, filters, projectStatuses, categories, customers, users) => {
  try {
    const today = new Date();
    
    // Prepara i dati per il CSV
    const csvData = [];
    
    // Headers
    csvData.push(['Report Progetti - ' + today.toLocaleDateString('it-IT')]);
    csvData.push([]);
    csvData.push(['Totale progetti: ' + filteredProjects.length]);
    
    // Filtri applicati
    if (filters.status && filters.status.length > 0) {
      const statusDescs = filters.status
        .map(s => projectStatuses.find(st => st.Id === s)?.StatusDescription || s)
        .join(', ');
      csvData.push(['Filtro Stati: ' + statusDescs]);
    }
    if (filters.categoryId && filters.categoryId.length > 0) {
      const categoryDescs = filters.categoryId
        .map(c => categories.find(cat => cat.ProjectCategoryId === parseInt(c))?.Description || 'N/A')
        .join(', ');
      csvData.push(['Filtro Categorie: ' + categoryDescs]);
    }
    
    csvData.push([]);
    csvData.push(['Nome Progetto', 'Descrizione', 'Stato', 'Scadenza', 'Giorni rimanenti', 'Cliente']);
    
    // Dati progetti
    filteredProjects.forEach(project => {
      const endDate = project.EndDate 
        ? new Date(project.EndDate).toLocaleDateString('it-IT')
        : 'Non definita';
      
      // Calcola giorni rimanenti
      let daysRemaining = '';
      if (project.EndDate) {
        const end = new Date(project.EndDate);
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          daysRemaining = `Scaduto da ${Math.abs(diffDays)} giorni`;
        } else if (diffDays === 0) {
          daysRemaining = 'Scade oggi';
        } else {
          daysRemaining = `${diffDays} giorni`;
        }
      }

      csvData.push([
        project.Name || '',
        project.Description || '-',
        project.StatusDescription || '',
        endDate,
        daysRemaining,
        project.CompanyName || '-'
      ]);
    });
    
    // Statistiche finali
    csvData.push([]);
    const activeProjects = filteredProjects.filter(p => ['1A', '2A', '3A'].includes(p.Status)).length;
    const delayedProjects = filteredProjects.filter(p => {
      if (!p.EndDate) return false;
      return new Date(p.EndDate) < today;
    }).length;
    csvData.push(['Progetti attivi: ' + activeProjects]);
    csvData.push(['Progetti in ritardo: ' + delayedProjects]);

    // Converti in CSV
    const csvContent = csvData.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"` 
          : cell
      ).join(',')
    ).join('\n');

    // Crea e scarica il file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Report_Progetti_${today.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Error exporting to CSV:", error);
    throw error;
  }
};

export const exportToPrintableHTML = (filteredProjects, filters, projectStatuses, categories, customers, users) => {
  try {
    const today = new Date();
    const reportDate = today.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Raccogli i filtri attivi
    const activeFilters = [];
    if (filters.status && filters.status.length > 0) {
      const statusDescs = filters.status
        .map(s => projectStatuses.find(st => st.Id === s)?.StatusDescription || s)
        .join(', ');
      activeFilters.push({ label: 'Stati', value: statusDescs });
    }
    if (filters.categoryId && filters.categoryId.length > 0) {
      const categoryDescs = filters.categoryId
        .map(c => categories.find(cat => cat.ProjectCategoryId === parseInt(c))?.Description || 'N/A')
        .join(', ');
      activeFilters.push({ label: 'Categorie', value: categoryDescs });
    }
    if (filters.custSupp) {
      const customer = customers.find(c => c.CustSupp === filters.custSupp);
      if (customer) {
        activeFilters.push({ label: 'Cliente', value: customer.Name });
      }
    }
    if (filters.searchText) {
      activeFilters.push({ label: 'Ricerca', value: filters.searchText });
    }
    if (filters.projectErpId) {
      activeFilters.push({ label: 'ID ERP', value: filters.projectErpId });
    }
    if (filters.taskAssignedTo && filters.taskAssignedTo.length > 0) {
      const userNames = filters.taskAssignedTo
        .map(id => {
          const user = users.find(u => u.userId === parseInt(id));
          return user ? `${user.firstName} ${user.lastName}` : '';
        })
        .filter(name => name)
        .join(', ');
      activeFilters.push({ label: 'Assegnato a', value: userNames });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Report Progetti - ${today.toLocaleDateString('it-IT')}</title>
        <style>
          @page {
            size: landscape;
            margin: 15mm;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #1a202c;
            background-color: #f7fafc;
            line-height: 1.6;
          }
          
          .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 40px;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .header-left {
            flex: 1;
          }
          
          h1 {
            color: #2563eb;
            margin: 0 0 8px 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          
          .subtitle {
            color: #64748b;
            font-size: 16px;
            margin: 0;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 30px;
          }
          
          .stat-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px 20px;
            text-align: center;
          }
          
          .stat-card.primary {
            background: #dbeafe;
            border-color: #3b82f6;
          }
          
          .stat-card.success {
            background: #d1fae5;
            border-color: #10b981;
          }
          
          .stat-card.warning {
            background: #fed7aa;
            border-color: #f97316;
          }
          
          .stat-card.danger {
            background: #fee2e2;
            border-color: #ef4444;
          }
          
          .stat-value {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            line-height: 1;
          }
          
          .stat-label {
            font-size: 14px;
            color: #64748b;
            margin: 4px 0 0;
          }
          
          .filters-section {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 24px;
          }
          
          .filters-title {
            font-size: 14px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
          }
          
          .filter-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .filter-tag {
            background: white;
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 4px 12px;
            font-size: 13px;
            color: #334155;
          }
          
          .filter-tag strong {
            color: #1e293b;
          }
          
          .critical-section {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
          }
          
          .critical-section h3 {
            color: #dc2626;
            margin: 0 0 12px 0;
            font-size: 18px;
            font-weight: 600;
          }
          
          .critical-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .critical-item {
            background: white;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .critical-item:last-child {
            margin-bottom: 0;
          }
          
          .critical-name {
            font-weight: 600;
            color: #1e293b;
          }
          
          .critical-status {
            color: #dc2626;
            font-size: 14px;
            font-weight: 500;
          }
          
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 24px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          
          thead {
            background: #f8fafc;
          }
          
          th {
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
            white-space: nowrap;
          }
          
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
            color: #334155;
          }
          
          tr:last-child td {
            border-bottom: none;
          }
          
          tr:hover {
            background-color: #f8fafc;
          }
          
          .project-name {
            font-weight: 600;
            color: #1e293b;
          }
          
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          
          .status-indicator {
            width: 6px;
            height: 6px;
            border-radius: 50%;
          }
          
          .days-remaining {
            font-weight: 500;
          }
          
          .days-remaining.urgent {
            color: #dc2626;
            font-weight: 600;
          }
          
          .days-remaining.warning {
            color: #f59e0b;
            font-weight: 600;
          }
          
          .days-remaining.ok {
            color: #10b981;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 13px;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .container {
              box-shadow: none;
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <h1>Report Progetti</h1>
              <p class="subtitle">Generato il ${reportDate}</p>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card primary">
              <div class="stat-value">${filteredProjects.length}</div>
              <div class="stat-label">Totale Progetti</div>
            </div>
            <div class="stat-card success">
              <div class="stat-value">${filteredProjects.filter(p => ['2A', '3A'].includes(p.Status)).length}</div>
              <div class="stat-label">Progetti Attivi</div>
            </div>
            <div class="stat-card warning">
              <div class="stat-value">${filteredProjects.filter(p => {
                if (!p.EndDate || !['2A', '3A'].includes(p.Status)) return false;
                const end = new Date(p.EndDate);
                const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
              }).length}</div>
              <div class="stat-label">In Scadenza</div>
            </div>
            <div class="stat-card danger">
              <div class="stat-value">${filteredProjects.filter(p => {
                if (!p.EndDate || !['2A', '3A'].includes(p.Status)) return false;
                return new Date(p.EndDate) < today;
              }).length}</div>
              <div class="stat-label">In Ritardo</div>
            </div>
          </div>
          
          ${activeFilters.length > 0 ? `
            <div class="filters-section">
              <div class="filters-title">Filtri applicati:</div>
              <div class="filter-tags">
                ${activeFilters.map(filter => `
                  <span class="filter-tag">
                    <strong>${filter.label}:</strong> ${filter.value}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${(() => {
            const criticalProjects = filteredProjects.filter(p => {
              if (!p.EndDate || !['2A', '3A'].includes(p.Status)) return false;
              const end = new Date(p.EndDate);
              const diffTime = end - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 7;
            });
            
            if (criticalProjects.length > 0) {
              return `
                <div class="critical-section">
                  <h3>⚠️ Progetti Critici (scadenza entro 7 giorni)</h3>
                  <ul class="critical-list">
                    ${criticalProjects.map(p => {
                      const end = new Date(p.EndDate);
                      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                      const status = diffDays < 0 ? `SCADUTO da ${Math.abs(diffDays)} giorni` : 
                                    diffDays === 0 ? 'SCADE OGGI' : 
                                    `Scade tra ${diffDays} giorni`;
                      return `
                        <li class="critical-item">
                          <span class="critical-name">${p.Name}</span>
                          <span class="critical-status">${status}</span>
                        </li>
                      `;
                    }).join('')}
                  </ul>
                </div>
              `;
            }
            return '';
          })()}
          
          <table>
            <thead>
              <tr>
                <th>Nome Progetto</th>
                <th>Descrizione</th>
                <th>Cliente</th>
                <th>Stato</th>
                <th>Scadenza</th>
                <th>Tempo Rimanente</th>
                <th>Attività</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProjects.map(project => {
                const endDate = project.EndDate 
                  ? new Date(project.EndDate).toLocaleDateString('it-IT', { 
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })
                  : 'Non definita';
                
                let daysRemaining = '';
                let daysClass = 'ok';
                if (project.EndDate) {
                  const end = new Date(project.EndDate);
                  const diffTime = end - today;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays < 0) {
                    daysRemaining = `Scaduto da ${Math.abs(diffDays)} giorni`;
                    daysClass = 'urgent';
                  } else if (diffDays === 0) {
                    daysRemaining = 'Scade oggi';
                    daysClass = 'urgent';
                  } else if (diffDays <= 7) {
                    daysRemaining = `${diffDays} giorni`;
                    daysClass = 'warning';
                  } else {
                    daysRemaining = `${diffDays} giorni`;
                  }
                } else {
                  daysRemaining = '-';
                }

                const statusColor = project.StatusColor || '#94a3b8';
                const completedTasks = project.TaskCompletate || 0;
                const openTasks = project.TaskAperteNonRitardo || 0;
                const delayedTasks = project.TaskAperteInRitardo || 0;
                const totalTasks = completedTasks + openTasks + delayedTasks;

                return `
                  <tr>
                    <td><span class="project-name">${project.Name || ''}</span></td>
                    <td>${project.Description || '-'}</td>
                    <td>${project.CompanyName || '-'}</td>
                    <td>
                      <span class="status-badge" style="background-color: ${statusColor}20;">
                        <span class="status-indicator" style="background-color: ${statusColor};"></span>
                        ${project.StatusDescription || ''}
                      </span>
                    </td>
                    <td>${endDate}</td>
                    <td><span class="days-remaining ${daysClass}">${daysRemaining}</span></td>
                    <td>
                      ${totalTasks > 0 ? `
                        <span style="color: #10b981;">${completedTasks}</span> / 
                        <span style="color: #64748b;">${openTasks}</span>
                        ${delayedTasks > 0 ? ` / <span style="color: #ef4444;">${delayedTasks}</span>` : ''}
                      ` : '-'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Report generato automaticamente dal sistema di gestione progetti</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Salva il file HTML
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const fileName = `Report_Progetti_${today.toISOString().split('T')[0]}.html`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error exporting HTML:", error);
    throw error;
  }
};

export const exportToPDF = (filteredProjects, filters, projectStatuses, categories, customers, users) => {
  try {
    const today = new Date();
    const reportDate = today.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Raccogli i filtri attivi
    const activeFilters = [];
    if (filters.status && filters.status.length > 0) {
      const statusDescs = filters.status
        .map(s => projectStatuses.find(st => st.Id === s)?.StatusDescription || s)
        .join(', ');
      activeFilters.push({ label: 'Stati', value: statusDescs });
    }
    if (filters.categoryId && filters.categoryId.length > 0) {
      const categoryDescs = filters.categoryId
        .map(c => categories.find(cat => cat.ProjectCategoryId === parseInt(c))?.Description || 'N/A')
        .join(', ');
      activeFilters.push({ label: 'Categorie', value: categoryDescs });
    }
    if (filters.custSupp) {
      const customer = customers.find(c => c.CustSupp === filters.custSupp);
      if (customer) {
        activeFilters.push({ label: 'Cliente', value: customer.Name });
      }
    }
    if (filters.searchText) {
      activeFilters.push({ label: 'Ricerca', value: filters.searchText });
    }
    if (filters.projectErpId) {
      activeFilters.push({ label: 'ID ERP', value: filters.projectErpId });
    }
    if (filters.taskAssignedTo && filters.taskAssignedTo.length > 0) {
      const userNames = filters.taskAssignedTo
        .map(id => {
          const user = users.find(u => u.userId === parseInt(id));
          return user ? `${user.firstName} ${user.lastName}` : '';
        })
        .filter(name => name)
        .join(', ');
      activeFilters.push({ label: 'Assegnato a', value: userNames });
    }

    // HTML ottimizzato per la stampa PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Report Progetti - ${today.toLocaleDateString('it-IT')}</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #1a202c;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3b82f6;
          }
          
          h1 {
            color: #2563eb;
            font-size: 24px;
            font-weight: 700;
          }
          
          .subtitle {
            color: #64748b;
            font-size: 12px;
          }
          
          .stats-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
          }
          
          .stat-card {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
          }
          
          .stat-card.primary { background: #dbeafe; border-color: #3b82f6; }
          .stat-card.success { background: #d1fae5; border-color: #10b981; }
          .stat-card.warning { background: #fed7aa; border-color: #f97316; }
          .stat-card.danger { background: #fee2e2; border-color: #ef4444; }
          
          .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
          }
          
          .stat-label {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          
          .filters-section {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 12px;
            font-size: 10px;
          }
          
          .filter-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 4px;
          }
          
          .filter-tag {
            background: white;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 2px 8px;
          }
          
          .critical-section {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          
          .critical-section h3 {
            color: #dc2626;
            font-size: 14px;
            margin-bottom: 6px;
          }
          
          .critical-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
          }
          
          .critical-item {
            background: white;
            border: 1px solid #fecaca;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 10px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            page-break-inside: auto;
          }
          
          thead {
            background: #f8fafc;
          }
          
          th {
            padding: 6px 8px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #e2e8f0;
            background: #f1f5f9;
          }
          
          td {
            padding: 4px 8px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
          }
          
          tr { page-break-inside: avoid; }
          
          .project-name {
            font-weight: 600;
            color: #1e293b;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: 500;
          }
          
          .days-remaining.urgent { color: #dc2626; font-weight: 600; }
          .days-remaining.warning { color: #f59e0b; font-weight: 600; }
          
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 9px;
          }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Report Progetti</h1>
            <p class="subtitle">Generato il ${reportDate}</p>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-value">${filteredProjects.length}</div>
            <div class="stat-label">Totale Progetti</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">${filteredProjects.filter(p => ['2A', '3A'].includes(p.Status)).length}</div>
            <div class="stat-label">Progetti Attivi</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">${filteredProjects.filter(p => {
              if (!p.EndDate || !['2A', '3A'].includes(p.Status)) return false;
              const end = new Date(p.EndDate);
              const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
              return diffDays >= 0 && diffDays <= 7;
            }).length}</div>
            <div class="stat-label">In Scadenza</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-value">${filteredProjects.filter(p => {
              if (!p.EndDate || !['2A', '3A'].includes(p.Status)) return false;
              return new Date(p.EndDate) < today;
            }).length}</div>
            <div class="stat-label">In Ritardo</div>
          </div>
        </div>
        
        ${activeFilters.length > 0 ? `
          <div class="filters-section">
            <strong>Filtri applicati:</strong>
            <div class="filter-tags">
              ${activeFilters.map(filter => `
                <span class="filter-tag">${filter.label}: ${filter.value}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${(() => {
          const criticalProjects = filteredProjects.filter(p => {
            if (!p.EndDate || !['2A', '3A'].includes(p.Status)) return false;
            const end = new Date(p.EndDate);
            const diffTime = end - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
          });
          
          if (criticalProjects.length > 0) {
            return `
              <div class="critical-section">
                <h3>⚠️ Progetti Critici</h3>
                <div class="critical-list">
                  ${criticalProjects.map(p => {
                    const end = new Date(p.EndDate);
                    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                    const status = diffDays < 0 ? `SCADUTO (${Math.abs(diffDays)}g)` : 
                                  diffDays === 0 ? 'OGGI' : 
                                  `${diffDays}g`;
                    return `<div class="critical-item"><strong>${p.Name}</strong> - ${status}</div>`;
                  }).join('')}
                </div>
              </div>
            `;
          }
          return '';
        })()}
        
        <table>
          <thead>
            <tr>
              <th style="width: 20%">Nome Progetto</th>
              <th style="width: 25%">Descrizione</th>
              <th style="width: 15%">Cliente</th>
              <th style="width: 10%">Stato</th>
              <th style="width: 10%">Scadenza</th>
              <th style="width: 12%">Rimanente</th>
              <th style="width: 8%">Task</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProjects.map(project => {
              const endDate = project.EndDate 
                ? new Date(project.EndDate).toLocaleDateString('it-IT', { 
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                : '-';
              
              let daysRemaining = '';
              let daysClass = '';
              if (project.EndDate) {
                const end = new Date(project.EndDate);
                const diffTime = end - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                  daysRemaining = `Scaduto (${Math.abs(diffDays)}g)`;
                  daysClass = 'urgent';
                } else if (diffDays === 0) {
                  daysRemaining = 'Oggi';
                  daysClass = 'urgent';
                } else if (diffDays <= 7) {
                  daysRemaining = `${diffDays} giorni`;
                  daysClass = 'warning';
                } else {
                  daysRemaining = `${diffDays} giorni`;
                }
              } else {
                daysRemaining = '-';
              }

              const statusColor = project.StatusColor || '#94a3b8';
              const completedTasks = project.TaskCompletate || 0;
              const openTasks = project.TaskAperteNonRitardo || 0;
              const delayedTasks = project.TaskAperteInRitardo || 0;

              return `
                <tr>
                  <td><span class="project-name">${project.Name || ''}</span></td>
                  <td>${project.Description || '-'}</td>
                  <td>${project.CompanyName || '-'}</td>
                  <td>
                    <span class="status-badge" style="background-color: ${statusColor}30; color: ${statusColor};">
                      ${project.StatusDescription || ''}
                    </span>
                  </td>
                  <td>${endDate}</td>
                  <td><span class="days-remaining ${daysClass}">${daysRemaining}</span></td>
                  <td>${completedTasks}/${openTasks}${delayedTasks > 0 ? `/<span style="color:#ef4444">${delayedTasks}</span>` : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          Report generato automaticamente - Sistema di gestione progetti
        </div>
      </body>
      </html>
    `;

    // Apri in nuova finestra per stampa
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Attendi il caricamento e poi mostra dialog di stampa
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

  } catch (error) {
    console.error("Error exporting PDF:", error);
    throw error;
  }
};