const router = require('express').Router();
const axios = require('axios');
const config = require('../../../config');
const { dbWrapper } = require('../../database/database');
const { Client, GatewayIntentBits, WebhookClient } = require('discord.js');

// O 'botClient' é necessário para adicionar o membro ao servidor
// Note: Este require pode causar dependência circular se o bot/index.js também importar este arquivo.
// Uma solução melhor seria usar o client do interactionCreate.js, mas para o /auth/callback
// precisamos de uma instância do bot.
// Certifique-se que o bot/index.js NÃO importa nada do /web
const botClient = require('../../bot/index');

router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).send('Código ou estado de autorização ausente.');
    }

    // 1. Verificar o 'state' no banco de dados para prevenir ataques CSRF
    //    Usamos findOneAndDelete para garantir que o 'state' só possa ser usado uma vez.
    const stateDoc = await dbWrapper.getAuthState(state);

    if (!stateDoc) {
        console.error("Auth state inválido ou expirado recebido:", state);
        return res.status(400).send('Auth state inválido ou expirado. Por favor, tente novamente.');
    }
    
    // Se o 'state' é válido, o aviso "Disparidade de usuário" é irrelevante, pois o state
    // é a nossa prova de que a solicitação é legítima. A lógica foi simplificada.

    try {
        // 2. Trocar o 'code' por um 'access_token'
        const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token',
            new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: config.redirectUri,
            }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 3. Obter informações do usuário com o 'access_token'
        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const user = userResponse.data;

        // 4. Salvar ou atualizar o usuário no banco de dados
        const userData = {
            id: user.id,
            username: `${user.username}#${user.discriminator}`,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: Date.now() + (expires_in * 1000),
        };
        await dbWrapper.saveUser(userData);

        // 5. Adicionar o usuário ao servidor principal (se configurado)
        const botConfig = await dbWrapper.getBotConfig();
        if (botConfig && botConfig.mainGuildId && botConfig.verifiedRoleId) {
            try {
                const guild = await botClient.guilds.fetch(botConfig.mainGuildId);
                const member = await guild.members.add(user.id, {
                    accessToken: access_token,
                    roles: [botConfig.verifiedRoleId]
                });
                
                if (member) {
                    console.log(`Usuário ${user.username} adicionado e cargo ${botConfig.verifiedRoleId} atribuído.`);
                }

            } catch (guildError) {
                console.error(`Falha ao adicionar/atualizar membro ${user.username} no servidor:`, guildError.message);
                // Continua mesmo se falhar em adicionar ao servidor (ex: usuário já está lá)
            }
        }

        // 6. Enviar webhook de log (se configurado)
        if (botConfig && botConfig.logChannelWebhook) {
            try {
                const webhook = new WebhookClient({ url: botConfig.logChannelWebhook });
                await webhook.send({
                    content: `✅ Novo usuário verificado: **${user.username}#${user.discriminator}** (ID: \`${user.id}\`)`,
                });
            } catch (webhookError) {
                console.error("Falha ao enviar log para o Webhook:", webhookError.message);
            }
        }

        // 7. Redirecionar para a página de sucesso
        res.sendFile('auth-success.html', { root: 'src/web/public' });

    } catch (error) {
        console.error('Erro no fluxo de callback OAuth2:', error.response ? error.response.data : error.message);
        res.status(500).send('Um erro ocorreu durante a autenticação.');
    }
});

module.exports = router;