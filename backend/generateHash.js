const bcrypt = require('bcrypt');

const saltRounds = 10;
const newPassword = 'marco'; // Sostituisci con la nuova password

bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) throw err;

    bcrypt.hash(newPassword, salt, (err, hash) => {
        if (err) throw err;
    });
});
