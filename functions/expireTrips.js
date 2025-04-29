const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.expireOldTrips = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();

    const tripsRef = db.collection('trips');
    const snapshot = await tripsRef
    .where('status', '==', 'active') 
    .get();

    const batch = db.batch();
    let updateCount = 0;

    snapshot.forEach(doc => {
      const trip = doc.data();
      if (trip.departureTime && new Date(trip.departureTime).getTime() < Date.now()) {
        const tripRef = tripsRef.doc(doc.id);
        batch.update(tripRef, { status: 'expired' });
        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`${updateCount} expired trips updated.`);
    } else {
      console.log('No trips to expire.');
    }

    res.status(200).send(`${updateCount} trips updated to expired status.`);
  } catch (error) {
    console.error('Error expiring trips:', error);
    res.status(500).send('Internal Server Error');
  }
});
