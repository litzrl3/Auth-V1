const router = require('express').Router();
const path = require('path');
const db = require('../../database/database.js');
const { clientId, redirectUri, scopes } = require('../../../config.js');

// Rota para a página de resgate (semelhante à Foto 2)
router.get('/:code', (req, res) => {
  const code = req.params.code;
  const gift = db.getGift(code);

  // Verifica se o gift existe e tem usos
  if (!gift || gift.uses_remaining <= 0) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'invalid-code.html'));
  }

  // Se o gift for válido, envia a página de resgate
  res.sendFile(path.join(__dirname, '..', 'public', 'redeem.html'));
});

// Rota de "API" para a página de resgate pegar a URL de auth
router.get('/init/:code', (req, res) => {
    const code = req.params.code;
    const gift = db.getGift(code);

    if (!gift || gift.uses_remaining <= 0) {
        return res.status(404).json({ error: 'Código inválido ou sem usos.' });
    }

    // Constrói a URL de autorização com o 'state' contendo o código
    const state = `redeem_${code}`;
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;

    res.json({
        oauthUrl: oauthUrl,
        usesRemaining: gift.uses_remaining
    });
});

module.exports = router;