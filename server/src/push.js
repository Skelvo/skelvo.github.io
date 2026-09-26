import webpush from 'web-push';

// Envoie une notification à tous les téléphones abonnés.
export function createPush({ db, vapid }) {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  return {
    publicKey: vapid.publicKey,
    async send(payload) {
      const subs = db.listSubscriptions();
      console.log(`[push] "${payload.title}" -> ${subs.length} appareil(s)`);
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              db.removeSubscription(sub.endpoint); // abonnement expiré
            } else {
              console.error(`[push] échec (${err.statusCode ?? err.message})`);
            }
          }
        })
      );
    },
  };
}
