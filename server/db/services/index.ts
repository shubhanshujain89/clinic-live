/**
 * Services Index
 * Exports all services for easy importing
 */

export * from './bookingService.js';
export * from './trackingService.js';
export * from './queueService.js';

import { bookingService } from './bookingService.js';
import { trackingService } from './trackingService.js';
import { queueService } from './queueService.js';

export const services = {
  booking: bookingService,
  tracking: trackingService,
  queue: queueService,
};