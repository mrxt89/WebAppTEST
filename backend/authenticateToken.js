const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ 
      error: 'NO_TOKEN',
      message: 'Authentication required' 
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      // Distingui tra token scaduto e token invalido
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'TOKEN_EXPIRED',
          message: 'Token expired',
          expiredAt: err.expiredAt 
        });
      }
      
      return res.status(403).json({ 
        error: 'INVALID_TOKEN',
        message: 'Invalid token' 
      });
    }
    
    // Debug log per verificare il contenuto del token
    console.log('Token verified, user data:', user);
    
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
