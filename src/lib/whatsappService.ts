import { db, collection, setDoc, doc } from './firebase';
import { TokenItem, WhatsAppLog } from '../types/queue';

/**
 * Meta WhatsApp Cloud API Integration Simulator and Payload Builder
 * Follows Meta Graph API v20.0 WhatsApp Business endpoint standards
 * POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
 */

export interface MetaWhatsAppMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: 'header' | 'body' | 'button';
      sub_type?: 'url' | 'quick_reply';
      index?: string;
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time' | 'payload';
        text?: string;
      }>;
    }>;
  };
}

export type WhatsAppTriggerType = 
  | 'TOKEN_ISSUED' 
  | 'QUEUE_APPROACHING' // 2-3 patients ahead
  | 'TOKEN_CALLED_NOW' // Current turn
  | 'DOCTOR_DELAY_ALERT'
  | 'TOKEN_HOLD_ALERT';

export class WhatsAppService {
  /**
   * Generates official Meta Cloud API JSON payload for Utility message templates
   */
  static buildMetaPayload(
    phone: string, 
    trigger: WhatsAppTriggerType, 
    token: TokenItem, 
    clinicName: string,
    doctorName: string,
    cabin: string,
    extraParam?: string
  ): { payload: MetaWhatsAppMessagePayload; messageText: string; templateName: string } {
    const cleanPhone = phone.replace(/[^0-9]/g, '') || '919876543210';
    let templateName = 'clinic_queue_utility_update';
    let messageText = '';
    let bodyParams: string[] = [];

    switch (trigger) {
      case 'TOKEN_ISSUED':
        templateName = 'clinic_token_confirmation_v1';
        bodyParams = [token.patientName, token.tokenNumber, clinicName, extraParam || '15 mins'];
        messageText = `🏥 *${clinicName}*\nHello ${token.patientName}, your token *#${token.tokenNumber}* is confirmed for Dr. ${doctorName}.\nEstimated Wait: ${extraParam || '15-25 mins'}.\nTrack live on your phone in real-time.`;
        break;

      case 'QUEUE_APPROACHING':
        templateName = 'clinic_queue_approaching_v1';
        bodyParams = [token.patientName, token.tokenNumber, extraParam || '2', cabin];
        messageText = `⏳ *Queue Alert - Dr. ${doctorName}*\nHi ${token.patientName}, there are only *${extraParam || '2'} patient(s)* ahead of your token *#${token.tokenNumber}*.\nPlease move near ${cabin}.`;
        break;

      case 'TOKEN_CALLED_NOW':
        templateName = 'clinic_token_turn_active_v1';
        bodyParams = [token.patientName, token.tokenNumber, cabin, doctorName];
        messageText = `🔔 *IT'S YOUR TURN NOW!*\nToken *#${token.tokenNumber}* (${token.patientName}) is now being called to *${cabin}* with Dr. ${doctorName}. Please step in.`;
        break;

      case 'DOCTOR_DELAY_ALERT':
        templateName = 'clinic_doctor_delay_broadcast_v1';
        bodyParams = [token.patientName, token.tokenNumber, extraParam || '20 minutes', clinicName];
        messageText = `⚠️ *Clinic Schedule Update*\nDear ${token.patientName}, Dr. ${doctorName} is running approx *${extraParam || '20 mins'}* delayed due to an emergency case. We appreciate your patience!`;
        break;

      case 'TOKEN_HOLD_ALERT':
        templateName = 'clinic_token_hold_notice_v1';
        bodyParams = [token.patientName, token.tokenNumber, clinicName];
        messageText = `⏸️ *Token on Hold*\nToken *#${token.tokenNumber}* was momentarily passed as you weren't present. Please notify reception when you return to reactivate your slot!`;
        break;
    }

    const payload: MetaWhatsAppMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US',
        },
        components: [
          {
            type: 'body',
            parameters: bodyParams.map(p => ({
              type: 'text',
              text: p,
            })),
          },
        ],
      },
    };

    return { payload, messageText, templateName };
  }

  /**
   * Dispatches or simulates sending the WhatsApp message, storing a full audit log in Firestore
   */
  static async sendWhatsAppNotification(
    token: TokenItem,
    trigger: WhatsAppTriggerType,
    clinicName: string = 'Apex Specialty Clinic',
    doctorName: string = 'Dr. Aryan Sharma',
    cabin: string = 'Cabin 1',
    extraParam?: string
  ): Promise<WhatsAppLog> {
    const { messageText, templateName } = this.buildMetaPayload(
      token.patientPhone,
      trigger,
      token,
      clinicName,
      doctorName,
      cabin,
      extraParam
    );

    const logId = 'wa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const metaMessageId = 'wamid.HBgL' + Math.random().toString(36).substring(2, 12).toUpperCase();

    const logEntry: WhatsAppLog = {
      id: logId,
      tokenId: token.id,
      patientName: token.patientName,
      phone: token.patientPhone,
      templateName,
      messageBody: messageText,
      status: 'DELIVERED',
      timestamp: new Date().toISOString(),
      metaMessageId,
    };

    try {
      await setDoc(doc(db, 'whatsapp_logs', logId), logEntry);
    } catch {
      // Offline fallback
    }

    return logEntry;
  }
}
