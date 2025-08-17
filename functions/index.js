/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Importa las librerías principales de Firebase Functions (para configuración global)
const { setGlobalOptions } = require("firebase-functions");

// Importa los módulos específicos para triggers HTTP (onRequest) y Firestore (onDocumentCreated) de v2
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

// Importa el módulo de logging para registrar mensajes
const { logger } = require("firebase-functions/logger");

// Importa el SDK de Firebase Admin para interactuar con los servicios de Firebase (Firestore, Messaging, etc.)
const admin = require('firebase-admin');

// Inicializa el Admin SDK. Esto es esencial para que tus funciones puedan acceder a Firestore, enviar mensajes FCM, etc.
admin.initializeApp();

// Configuración global para tus funciones (por ejemplo, número máximo de instancias)
// Para el control de costos y rendimiento, puedes establecer el número máximo de contenedores.
// Este límite es por función, pero se aplica globalmente si no se sobreescribe en cada función.
setGlobalOptions({ maxInstances: 10 });

// --- Tus Cloud Functions para Notificaciones ---

// 1. Función de prueba HTTP para enviar una notificación (v2 HTTP Trigger)
// Puedes llamar a esta función desde tu navegador para probar el envío de notificaciones.
// Ejemplo de URL (reemplaza 'TU_REGION' y 'TU_PROJECT_ID'):
// https://TU_REGION-TU_PROJECT_ID.cloudfunctions.net/sendTestNotification?userId=ID_DE_USUARIO_CON_TOKEN_FCM&title=Hola&body=Esto%20es%20una%20prueba
exports.sendTestNotification = onRequest(async (req, res) => {
  // Asegúrate de que este userId exista en tu colección 'users' de Firestore y tenga un 'fcmToken' válido
  const userId = req.query.userId;
  const title = req.query.title || '¡Hola desde Cloud Functions!';
  const body = req.query.body || 'Esta es una notificación de prueba desde tu agenda.';

  if (!userId) {
    logger.warn("sendTestNotification: Missing 'userId' query parameter.");
    return res.status(400).send("Se requiere el parámetro 'userId'.");
  }

  try {
    // Obtener el token FCM del usuario desde Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      logger.info(`sendTestNotification: No FCM token found for user: ${userId}`);
      return res.status(404).send(`No se encontró token FCM para el usuario ${userId}.`);
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: { // Puedes enviar datos adicionales que tu app puede procesar (se recuperan en `payload.data`)
        context: 'test_notification',
        targetUserId: userId,
        // Importante: `click_action` define la URL a la que el navegador debería ir al hacer clic en la notificación.
        // Asegúrate de que esta URL sea accesible públicamente por tu app web.
        click_action: 'https://calendario-ea7e0.web.app/'
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    logger.info(`Notificación de prueba enviada con éxito a ${userId}:`, response);
    res.status(200).send('Notificación de prueba enviada con éxito!');

  } catch (error) {
    logger.error("Error enviando notificación de prueba:", error);
    res.status(500).send('Error al enviar la notificación de prueba: ' + error.message);
  }
});

// 2. Función para enviar notificaciones cuando se crea un nuevo evento en tu calendario (v2 Firestore Trigger)
// Esta función se activa automáticamente cuando se añade un nuevo documento a la colección 'eventosCalendario'.
// ¡ADAPTA LA RUTA DE FIRESTORE Y LA LÓGICA INTERNA A TUS NECESIDADES!
// Si tu colección se llama diferente o los campos del evento son otros, ajústalos.
exports.sendNotificationOnNewCalendarEvent = onDocumentCreated('eventosCalendario/{eventId}', async (event) => {
  const newEventData = event.data.data(); // Los datos del nuevo documento creado
  const eventId = event.params.eventId; // El ID del documento
  
  // Asume que tu evento tiene un campo 'userId' que indica a quién pertenece el evento.
  // Si un evento puede tener múltiples usuarios, necesitarías iterar sobre una lista de IDs.
  const userIdToNotify = newEventData.userId; 

  if (!userIdToNotify) {
    logger.warn(`sendNotificationOnNewCalendarEvent: No 'userId' found in new event ${eventId}. Skipping notification.`);
    return null; // No hay a quién notificar
  }

  try {
    // Obtener el token FCM del usuario receptor desde Firestore
    const userDoc = await admin.firestore().collection('users').doc(userIdToNotify).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      logger.info(`sendNotificationOnNewCalendarEvent: No FCM token found for user: ${userIdToNotify}.`);
      return null; // No se puede notificar si no hay token
    }

    const notificationPayload = {
      notification: {
        title: `🗓️ ¡Nuevo evento en tu agenda!`, // Emoji para hacerla más visible
        body: `"${newEventData.title || 'Evento sin título'}" el ${newEventData.date || 'fecha desconocida'}.`,
        icon: 'https://calendario-ea7e0.web.app/favicon.ico' // Asegúrate de que esta URL sea pública y accesible
      },
      data: {
        eventType: 'calendar_event',
        eventId: eventId,
        // Puedes redirigir a una página específica del evento al hacer clic
        click_action: `https://calendario-ea7e0.web.app/eventos/${eventId}` 
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(notificationPayload);
    logger.info(`Notificación enviada con éxito a ${userIdToNotify} por nuevo evento ${eventId}:`, response);
    return response;

  } catch (error) {
    logger.error(`Error enviando notificación por nuevo evento de calendario ${eventId}:`, error);
    return null;
  }
});
