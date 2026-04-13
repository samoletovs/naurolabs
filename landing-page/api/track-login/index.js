const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

const TELEGRAM_NOTIFY_URL = process.env.TELEGRAM_NOTIFY_URL || '';

module.exports = async function (context, req) {
  const header = req.headers['x-ms-client-principal'];
  if (!header) {
    context.res = { status: 401, body: { error: 'Not authenticated' } };
    return;
  }

  const principal = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  const email = principal.userDetails || principal.userId || 'unknown';
  const provider = principal.identityProvider || 'unknown';
  const name = req.body?.name || email;
  const timestamp = new Date().toISOString();

  // Skip notifications for the owner
  if (email === 'd.146099412+samoletovs@users.noreply.github.comgmail.com') {
    context.res = { status: 200, body: { ok: true } };
    return;
  }

  try {
    const storageAccount = process.env.AZURE_STORAGE_ACCOUNT;
    const storageKey = process.env.AZURE_STORAGE_KEY;

    if (storageAccount && storageKey) {
      const credential = new AzureNamedKeyCredential(storageAccount, storageKey);
      const tableClient = new TableClient(
        `https://${storageAccount}.table.core.windows.net`,
        'NauroLabsLogins',
        credential
      );

      try { await tableClient.createTable(); } catch { /* already exists */ }

      // Check if user has logged in before
      let isNewUser = true;
      try {
        const sanitizedEmail = email.replace(/'/g, "''");
        const existing = tableClient.listEntities({
          queryOptions: { filter: `PartitionKey eq '${sanitizedEmail}'` }
        });
        for await (const _ of existing) { isNewUser = false; break; }
      } catch { /* assume new */ }

      // Store login event
      await tableClient.createEntity({
        partitionKey: email,
        rowKey: timestamp.replace(/[:.]/g, '-'),
        name: name,
        provider: provider,
        userAgent: (req.headers['user-agent'] || '').substring(0, 200),
        app: 'landing-page'
      });

      // Telegram notification for new users only
      if (isNewUser) {
        try {
          await fetch(TELEGRAM_NOTIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `🆕 New user on nauroLabs!\n\nName: ${name}\nEmail: ${email}\nProvider: ${provider}\nTime: ${timestamp}`
            })
          });
        } catch { /* best effort */ }
      }
    } else {
      // No storage configured — notify on all logins as fallback
      try {
        await fetch(TELEGRAM_NOTIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `👤 Login on nauroLabs\n\nUser: ${name} (${email})\nProvider: ${provider}\nTime: ${timestamp}`
          })
        });
      } catch { /* best effort */ }
    }
  } catch (err) {
    context.log('Track login error:', err.message);
  }

  context.res = { status: 200, body: { ok: true } };
};
