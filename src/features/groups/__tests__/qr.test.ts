import makeQr from 'qrcode-generator';
import { upiLink } from '../nudge';

test('a UPI pay link fits in a QR code and round-trips its size', () => {
  const link = upiLink({ upiId: 'asha.rao@okaxis', payeeName: 'Asha Rao', amount: 123456, note: 'Dinner + Cab' })!;
  const qr = makeQr(0, 'M');
  qr.addData(link);
  qr.make();
  expect(qr.getModuleCount()).toBeGreaterThanOrEqual(21);
  expect(qr.getModuleCount()).toBeLessThanOrEqual(73);
});
