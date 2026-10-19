/** Synthetic receipts (no real data) used by tests and by the "Try a sample bill" button (works in Expo Go). */
export interface SampleBill { name: string; rows: string[]; expect: { items: [string, number][]; total: number; store?: string } }

export const SAMPLE_BILLS: SampleBill[] = [
  {
    name: 'Supermarket (DMart style)',
    rows: [
      'AVENUE SUPERMARTS LIMITED', 'DMART KORAMANGALA BANGALORE', 'GSTIN 29AAACA1234B1Z5', 'Bill No: 10234  Date: 18/10/2026 14:32',
      'ITEM HSN QTY RATE AMOUNT',
      'AASHIRVAAD ATTA 5KG 11010000 1 265.00 265.00',
      'TATA SALT 1KG 25010010 2 28.00 56.00',
      'AMUL TAAZA MILK 1L 04012000 3 68.00 204.00',
      'BRITANNIA BREAD 19059010 1 45.00 45.00',
      'ONION LOOSE 07031010 0.850 KG 40.00 34.00',
      'DOVE SHAMPOO 340ML 33051090 1 349.00 349.00',
      'SUB TOTAL 953.00', 'CGST 2.5% 5.12', 'SGST 2.5% 5.12', 'ROUND OFF -0.24',
      'NET AMOUNT 963.00', 'ITEMS: 6  QTY: 8', 'CARD PAYMENT 963.00', 'THANK YOU VISIT AGAIN',
    ],
    expect: { store: 'Avenue Supermarts', total: 96300, items: [['Aashirvaad Atta 5kg', 26500], ['Tata Salt 1kg', 5600], ['Amul Taaza Milk 1l', 20400], ['Britannia Bread', 4500], ['Onion Loose', 3400], ['Dove Shampoo 340ml', 34900]] },
  },
  {
    name: 'Restaurant (qty first, GST + service)',
    rows: [
      'Spice Garden Restaurant', 'Table 7   Steward: Ravi', 'Date: 17-10-2026',
      'Qty Item Rate Amount',
      '2 Butter Naan 40.00 80.00',
      '1 Paneer Tikka Masala 280.00 280.00',
      '2 Masala Dosa 90.00 180.00',
      '3 Fresh Lime Soda 60.00 180.00',
      'Sub Total 720.00', 'Service Charge 5% 36.00', 'CGST 2.5% 18.90', 'SGST 2.5% 18.90',
      'Grand Total 793.80', 'Thank you',
    ],
    expect: { store: 'Spice Garden Restaurant', total: 79380, items: [['Butter Naan', 8000], ['Paneer Tikka Masala', 28000], ['Masala Dosa', 18000], ['Fresh Lime Soda', 18000]] },
  },
  {
    name: 'Cafe (x qty, discount)',
    rows: [
      'BLUE TOKAI COFFEE', 'Order #4412', '2 x Flat White 220.00 440.00', '1 x Cold Brew 260.00', '1 x Almond Croissant 190.00',
      'Discount -89.00', 'Total 801.00',
    ],
    expect: { total: 80100, items: [['Flat White', 44000], ['Cold Brew', 26000], ['Almond Croissant', 19000]] },
  },
  {
    name: 'Kirana (whole rupees, handwritten style)',
    rows: ['Sharma General Store', 'Rice 5kg 320', 'Dal 2kg 240', 'Oil 1L 180', 'Sugar 1kg 48', 'Total 788'],
    expect: { total: 78800, items: [['Rice 5kg', 32000], ['Dal 2kg', 24000], ['Oil 1l', 18000], ['Sugar 1kg', 4800]] },
  },
  {
    name: 'Two-line items',
    rows: [
      'FRESH MART', 'Date 19/10/26',
      'ORGANIC BASMATI RICE 5KG PREMIUM', '1 650.00 650.00',
      'COLD PRESSED COCONUT OIL 1L', '2 399.00 798.00',
      'Net Payable 1448.00',
    ],
    expect: { total: 144800, items: [['Organic Basmati Rice 5kg Premium', 65000], ['Cold Pressed Coconut Oil 1l', 79800]] },
  },
];
