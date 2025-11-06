const router = require('express').Router();
const path = require('path');
const db = require('../../database/database.js');
const botClient = require('../../bot/index.js'); // Importa o cliente do bot

// Rota GET para a página de resgate (Foto 3)
// Ex: https://.../redeem/ABC123
router.get('/redeem/:code', (req, res) => {
  const code = req.params.code;
  const gift = db.getGift(code);

  // Verifica se o gift existe e NÃO foi usado
  if (!gift || gift.is_used) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'invalid-code.html'));
  }

  // Se o gift for válido, envia a página de resgate (Foto 3)
  res.sendFile(path.join(__dirname, '..', 'public', 'gift-redeem.html'));
});

// Rota POST para processar o resgate do gift (puxar os membros)
router.post('/redeem/pull', async (req, res) => {
    const { code, guildId } = req.body;

    if (!code || !guildId) {
        return res.status(400).json({ error: 'Código ou ID do servidor faltando.' });
    }

    const gift = db.getGift(code);

    // 1. Validar o gift
    if (!gift) {
        return res.status(404).json({ error: 'Código de gift não encontrado.' });
    }
    if (gift.is_used) {
        return res.status(400).json({ error: 'Este código já foi resgatado.' });
    }

    // 2. Validar o Servidor
    let guild;
    try {
        guild = await botClient.guilds.fetch(guildId);
    } catch {
        return res.status(404).json({ error: 'ID do Servidor inválido ou o bot não está nele.' });
    }

    // 3. Puxar Membros
    const memberCount = gift.member_count;
    const usersToPull = db.getRandomUsers(memberCount);

    if (usersToPull.length < memberCount) {
        return res.status(500).json({ error: `Não há usuários suficientes na database (${usersToPull.length}/${memberCount}).` });
    }

    // 4. Marcar gift como usado (Importante: fazer antes de puxar)
    const usedSuccess = db.useGift(code);
    if (!usedSuccess) {
         return res.status(500).json({ error: 'Erro de concorrência. Tente novamente.' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const user of usersToPull) {
        try {
            await guild.members.add(user.user_id, {
                accessToken: user.access_token
            });
            successCount++;
        } catch (error) {
            console.error(`Falha ao puxar ${user.username}: ${error.message}`);
            failCount++;
        }
    }

    console.log(`Resgate de Gift [${code}] concluído para Guild [${guildId}]: ${successCount} sucesso, ${failCount} falhas.`);
    
    // Sucesso! (Foto 5)
    res.status(200).json({ 
        message: 'Pedido Realizado com Sucesso!',
        details: `Seu pedido foi adicionado à fila e será processado em breve. (${successCount} puxados)`
    });
});

module.exports = router;
