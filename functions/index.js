/**
 * Firebase Cloud Functions
 * Handles server-side operations for Dua requests
 * 
 * To deploy:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize: firebase init functions
 * 4. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function: Send notification when request is answered
 * Triggered when a dua_requests document is updated with a response
 */
exports.onRequestAnswered = functions.firestore
  .document('dua_requests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const requestId = context.params.requestId;

    // Check if response was just added
    if (!before.response && after.response && after.status === 'answered') {
      const userId = after.userId;

      try {
        // Get user's device token
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
          console.log('User not found:', userId);
          return null;
        }

        const userData = userDoc.data();
        const deviceToken = userData.deviceToken;
        const notificationEnabled = userData.notificationEnabled !== false;

        if (!deviceToken || !notificationEnabled) {
          console.log('User has no token or notifications disabled:', userId);
          return null;
        }

        // Prepare notification message
        const message = {
          notification: {
            title: 'پاسخ به درخواست شما',
            body: 'پاسخ به درخواست شما آماده است. برای مشاهده پاسخ، اینجا را بزنید.',
          },
          data: {
            type: 'dua_response',
            requestId,
            userId,
          },
          token: deviceToken,
          android: {
            priority: 'high',
            notification: {
              channelId: 'dua-responses',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };

        // Send notification via FCM
        const response = await admin.messaging().send(message);
        console.log('Notification sent successfully:', response);
        
        return null;
      } catch (error) {
        console.error('Error sending notification:', error);
        return null;
      }
    }

    return null;
  });

/**
 * Cloud Function: Rate limiting
 * Prevents spam by limiting requests per user per day
 */
exports.checkRateLimit = functions.https.onCall(async (data, context) => {
  // Only authenticated admins can bypass rate limit
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = data.userId;
  const maxRequestsPerDay = 3;

  try {
    const now = admin.firestore.Timestamp.now();
    const oneDayAgo = new admin.firestore.Timestamp(now.seconds - 86400, now.nanoseconds);

    const requestsQuery = await admin
      .firestore()
      .collection('dua_requests')
      .where('userId', '==', userId)
      .where('createdAt', '>=', oneDayAgo)
      .get();

    const requestCount = requestsQuery.size;

    return {
      allowed: requestCount < maxRequestsPerDay,
      remaining: Math.max(0, maxRequestsPerDay - requestCount),
      resetTime: now.seconds + 86400,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check rate limit');
  }
});
