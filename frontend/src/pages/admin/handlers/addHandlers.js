import { swal } from '../../../lib/common';

export const handleAddUser = (addUser, refreshData, companies = []) => {
  // Prepara le opzioni per le aziende
  const companyOptions = companies.map(company => 
    `<option value="${company.CompanyId}">${company.Description}</option>`
  ).join('');

  swal.fire({
    title: 'Aggiungi Nuovo Utente',
    html: `
      <input type="text" id="username" class="archa-input" placeholder="Username" autocomplete="off">
      <input type="text" id="firstName" class="archa-input" placeholder="Nome" autocomplete="off">
      <input type="text" id="lastName" class="archa-input" placeholder="Cognome" autocomplete="new-username" value="">
      <input type="password" id="password" class="archa-input" placeholder="Password" autocomplete="new-password" value="">
      <input type="email" id="email" class="archa-input" placeholder="Email" autocomplete="off">
      <input type="text" id="userBadge" class="archa-input" placeholder="Badge" autocomplete="off">
      <input type="text" id="role" class="archa-input" placeholder="Ruolo" autocomplete="off">
      <input type="text" id="phoneNumber" class="archa-input" placeholder="Telefono" autocomplete="off">
      <label for="companies">Aziende</label>
      <select id="companies" class="archa-input" multiple>
        ${companyOptions}
      </select>
      <small>Tieni premuto CTRL per selezionare più aziende</small>
    `,
    focusConfirm: false,
    showCancelButton: true,
    cancelButtonText: 'Annulla',
    didOpen: () => {
      document.getElementById('lastName').value = '';
      document.getElementById('password').value = '';
    },
    preConfirm: () => {
      const username = swal.getPopup().querySelector('#username').value;
      const firstName = swal.getPopup().querySelector('#firstName').value;
      const lastName = swal.getPopup().querySelector('#lastName').value;
      const password = swal.getPopup().querySelector('#password').value;
      const email = swal.getPopup().querySelector('#email').value;
      const userBadge = swal.getPopup().querySelector('#userBadge').value;
      const role = swal.getPopup().querySelector('#role').value;
      const phoneNumber = swal.getPopup().querySelector('#phoneNumber').value;
      
      // Ottieni le aziende selezionate
      const companiesSelect = swal.getPopup().querySelector('#companies');
      const companies = Array.from(companiesSelect.selectedOptions).map(option => parseInt(option.value));

      if (!username || !firstName || !password) {
        swal.showValidationMessage(`Please enter required fields: username, first name, password`);
        return null;
      }
      
      if (companies.length === 0) {
        swal.showValidationMessage(`Seleziona almeno un'azienda`);
        return null;
      }
      
      return { username, firstName, lastName, password, email, userBadge, role, phoneNumber, companies }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      addUser(result.value)
        .then(() => {
          swal.fire('Successo', 'Utente aggiunto con successo.', 'success');
          if (refreshData) refreshData('users');
        })
        .catch((error) => {
          console.error('Errore durante l\'aggiunta dell\'utente:', error);
          swal.fire('Errore', error.response?.data || 'Errore durante l\'aggiunta dell\'utente.', 'error');
        });
    }
  });
};

export const handleAddGroup = (addGroup, refreshData) => {
  swal.fire({
    title: 'Aggiungi Nuovo Gruppo',
    html: `
      <input type="text" id="groupName" class="archa-input" placeholder="Nome Gruppo">
      <input type="text" id="description" class="archa-input" placeholder="Descrizione">
    `,
    focusConfirm: false,
    showCancelButton: true,
    cancelButtonText: 'Annulla',
    preConfirm: () => {
      const groupName = swal.getPopup().querySelector('#groupName').value;
      const description = swal.getPopup().querySelector('#description').value;

      if (!groupName) {
        swal.showValidationMessage(`Please enter the group name`);
        return null;
      }
      return { groupName, description };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      addGroup(result.value)
        .then(() => {
          swal.fire('Successo', 'Gruppo aggiunto con successo.', 'success');
          if (refreshData) refreshData('groups');
        })
        .catch((error) => {
          console.error('Errore durante l\'aggiunta del gruppo:', error);
          swal.fire('Errore', error.response?.data || 'Errore durante l\'aggiunta del gruppo.', 'error');
        });
    }
  });
};

export const handleAddNotificationChannel = (addNotificationChannel, refreshData) => {
  swal.fire({
    title: 'Aggiungi nuovo canale di notifica',
    html: `
      <input type="text" id="channelName" class="archa-input" placeholder="Nome Canale">
      <input type="text" id="description" class="archa-input" placeholder="Descrizione">
      <input type="color" id="color" class="archa-input" placeholder="Colore">
      <select id="responseType" class="archa-input">
        <option value="1">Nessuna Risposta</option>
        <option value="2">Risposta SI/NO</option>
        <option value="3">Testo libero</option>
      </select>
      <input type="text" id="defaultTitle" class="archa-input" placeholder="Titolo di Default">
      <label for="intercompany">Canale Intercompany</label>
      <input type="checkbox" id="intercompany" class="archa-input" placeholder="Intercompany">
    `,
    focusConfirm: false,
    showCancelButton: true,
    cancelButtonText: 'Annulla',
    preConfirm: () => {
      const channelName = swal.getPopup().querySelector('#channelName').value;
      const description = swal.getPopup().querySelector('#description').value;
      const hexColor = swal.getPopup().querySelector('#color').value;
      const defaultResponseOptionId = swal.getPopup().querySelector('#responseType').value;
      const defaultTitle = swal.getPopup().querySelector('#defaultTitle').value;
      const intercompany = swal.getPopup().querySelector('#intercompany').checked

      if (!channelName || !description || !hexColor || !defaultResponseOptionId) {
        swal.showValidationMessage(`Campi obbligatori: nome canale, descrizione, colore, risposta di default`);
        return null;
      }
      return { name: channelName, description, hexColor, defaultResponseOptionId, defaultTitle, intercompany};
    }
  }).then((result) => {
    if (result.isConfirmed) {
      addNotificationChannel(result.value)
        .then(() => {
          swal.fire('Successo', 'Canale di notifica aggiunto con successo.', 'success');
          if (refreshData) refreshData('notificationsChannel');
        })
        .catch((error) => {
          console.error('Errore durante l\'aggiunta del canale di notifica:', error);
          swal.fire('Errore', error.response?.data || 'Errore durante l\'aggiunta del canale di notifica.', 'error');
        });
    }
  });
};