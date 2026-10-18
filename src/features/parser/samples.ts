/** Realistic SYNTHETIC bank/UPI SMS samples (no real personal data). Used by tests and the Developer > Simulate SMS panel. */
export interface Sample {
  name: string;
  sender: string;
  body: string;
  expect:
    | { amount: number; direction: 'debit' | 'credit'; last4?: string | null; merchant?: string | RegExp | null; ref?: string | null; balance?: number | null; currency?: string; instrument?: string }
    | { reject: string };
}

export const SAMPLES: Sample[] = [
  // ---------------- HDFC
  { name: 'HDFC UPI debit to VPA', sender: 'AX-HDFCBK', body: 'Rs.450.00 debited from a/c **1234 on 18-10-26 to VPA swiggy@ybl (UPI Ref No 629415370122). If not you, call 18002586161', expect: { amount: 45000, direction: 'debit', last4: '1234', merchant: 'Swiggy', ref: '629415370122', instrument: 'upi' } },
  { name: 'HDFC UPI sent with name', sender: 'VM-HDFCBK', body: 'Sent Rs.1,250.00 From HDFC Bank A/C *1234 To BIGBASKET On 18/10/26 Ref 629415370199 Not You? Call 18002586161', expect: { amount: 125000, direction: 'debit', last4: '1234', merchant: 'Bigbasket', ref: '629415370199' } },
  { name: 'HDFC credit from VPA', sender: 'AX-HDFCBK', body: 'Credit Alert! Rs.5,000.00 credited to HDFC Bank A/c XX1234 on 17-10-26 from VPA rahul.k@oksbi (UPI 629415370333)', expect: { amount: 500000, direction: 'credit', last4: '1234', merchant: 'Rahul K', ref: '629415370333' } },
  { name: 'HDFC card spend', sender: 'AD-HDFCBK', body: 'Rs.2,499.00 spent on HDFC Bank Card XX5678 at AMAZON PAY INDIA on 16-10-2026:14:22:05. Avl Lmt: Rs.1,45,000.00', expect: { amount: 249900, direction: 'debit', last4: '5678', merchant: 'Amazon Pay India', instrument: 'card' } },
  { name: 'HDFC salary credit', sender: 'AX-HDFCBK', body: 'Update! INR 85,000.00 deposited in HDFC Bank A/c XX1234 on 01-10-26 for NEFT Cr-ACME CORP-SALARY. Avl bal INR 1,02,345.67', expect: { amount: 8500000, direction: 'credit', last4: '1234', balance: 10234567 } },
  { name: 'HDFC ATM withdrawal', sender: 'VK-HDFCBK', body: 'Rs.5000.00 withdrawn from HDFC Bank A/c XX1234 at ATM on 15-10-26 10:15. Avl bal Rs.20,000.50', expect: { amount: 500000, direction: 'debit', last4: '1234', instrument: 'atm', balance: 2000050 } },
  // ---------------- SBI
  { name: 'SBI UPI debit', sender: 'VM-SBIUPI', body: 'Dear UPI user A/C X1234 debited by 450.0 on date 18Oct26 trf to ZOMATO Refno 629415370555. If not u? call 1800111109. -SBI', expect: { amount: 45000, direction: 'debit', last4: '1234', merchant: 'Zomato', ref: '629415370555' } },
  { name: 'SBI UPI credit', sender: 'VM-SBIUPI', body: 'Dear UPI user A/C X1234 credited by Rs 1200.00 on 18Oct26 transfer from PRIYA SHARMA Ref No 629415370666. -SBI', expect: { amount: 120000, direction: 'credit', last4: '1234', merchant: 'Priya Sharma', ref: '629415370666' } },
  { name: 'SBI card spend', sender: 'VK-SBICRD', body: 'Rs 1,299.00 spent on your SBI Credit Card ending 5678 at FLIPKART on 18/10/26. Avail Lmt Rs 90,000.00', expect: { amount: 129900, direction: 'debit', last4: '5678', merchant: 'Flipkart', instrument: 'card' } },
  { name: 'SBI YONO debit', sender: 'AD-SBIINB', body: 'Your A/c XXXXXXXX1234 is debited by Rs.3,000.00 on 18-10-26 and credited to A/c XXXXXX9876 (UPI Ref no 629415370777)-SBI', expect: { amount: 300000, direction: 'debit', last4: '1234', ref: '629415370777' } },
  { name: 'SBI ATM', sender: 'JD-SBIINB', body: 'Rs 10000 withdrawn from A/c XXXXXXXX1234 at SBI ATM on 14Oct26 18:30. Bal Rs 45,210.55', expect: { amount: 1000000, direction: 'debit', last4: '1234', instrument: 'atm', balance: 4521055 } },
  // ---------------- ICICI
  { name: 'ICICI debit info form', sender: 'JD-ICICIT', body: 'ICICI Bank Acct XX234 debited for Rs 1,899.00 on 18-Oct-26; PHONEPE-NETFLIX credited. UPI:629415370888. Call 18002662 for dispute.', expect: { amount: 189900, direction: 'debit', last4: '234', ref: '629415370888' } },
  { name: 'ICICI card txn', sender: 'AX-ICICIB', body: 'INR 749.00 spent using ICICI Bank Card XX9012 on 17-Oct-26 on UBER INDIA. Avl Limit: INR 1,20,000.00', expect: { amount: 74900, direction: 'debit', last4: '9012', merchant: 'Uber India', instrument: 'card' } },
  { name: 'ICICI credit', sender: 'JD-ICICIT', body: 'Dear Customer, Acct XX234 is credited with Rs 7,500.00 on 16-Oct-26 from ANITA ROY. UPI:629415370999. -ICICI Bank', expect: { amount: 750000, direction: 'credit', last4: '234', merchant: 'Anita Roy', ref: '629415370999' } },
  { name: 'ICICI info narration', sender: 'VM-ICICIT', body: 'Acct XX234 debited with INR 320.00 on 15-Oct-26. Info: UPI/P2M/629415371000/BLINKIT. Avl Bal INR 12,000.00.', expect: { amount: 32000, direction: 'debit', last4: '234', merchant: 'Blinkit', balance: 1200000 } },
  // ---------------- Axis
  { name: 'Axis debit', sender: 'AX-AXISBK', body: 'INR 600.00 debited from A/c no. XX4455 on 18-10-26 12:05:11 for UPI/P2M/629415371111/DOMINOS. Avl Bal INR 8,400.00', expect: { amount: 60000, direction: 'debit', last4: '4455', merchant: 'Dominos', balance: 840000 } },
  { name: 'Axis credit', sender: 'VM-AXISBK', body: 'INR 2,000.00 credited to A/c no. XX4455 on 18-10-26 at 09:30:00 through UPI-629415371222-Amit Verma. Avl Bal INR 10,400.00', expect: { amount: 200000, direction: 'credit', last4: '4455', ref: '629415371222' } },
  { name: 'Axis card', sender: 'JM-AXISBK', body: 'Spent INR 3,450.00 on Axis Bank Card no. XX7788 at MAKEMYTRIP on 12-10-26 Avl limit INR 80,000.00', expect: { amount: 345000, direction: 'debit', last4: '7788', merchant: 'Makemytrip', instrument: 'card' } },
  // ---------------- Kotak
  { name: 'Kotak UPI debit', sender: 'VM-KOTAKB', body: 'Sent Rs.299.00 from Kotak Bank AC X9988 to netflix@icici on 18-10-26.UPI Ref 629415371333. Not you? Call 1860 266 2666', expect: { amount: 29900, direction: 'debit', last4: '9988', merchant: 'Netflix', ref: '629415371333' } },
  { name: 'Kotak received', sender: 'VM-KOTAKB', body: 'Received Rs.1,500.00 in your Kotak Bank AC X9988 from sunil@okaxis on 18-10-26.UPI Ref:629415371444', expect: { amount: 150000, direction: 'credit', last4: '9988', merchant: 'Sunil', ref: '629415371444' } },
  { name: 'Kotak card', sender: 'AD-KOTAKB', body: 'Rs 899.00 spent on Kotak Credit Card XX3344 at SPOTIFY on 18-OCT-26. Avl Cr Lmt Rs 55,000', expect: { amount: 89900, direction: 'debit', last4: '3344', merchant: 'Spotify', instrument: 'card' } },
  // ---------------- PNB
  { name: 'PNB debit', sender: 'VM-PNBSMS', body: 'A/c XX5566 debited INR 1,100.00 Dt 18-10-26 12:00:00 by UPI Ref 629415371555. Avl Bal INR 7,100.00 -PNB', expect: { amount: 110000, direction: 'debit', last4: '5566', ref: '629415371555', balance: 710000 } },
  { name: 'PNB credit', sender: 'VM-PNBSMS', body: 'A/c XX5566 credited INR 25,000.00 on 18-10-26 by NEFT. Avl Bal INR 32,100.00 -PNB', expect: { amount: 2500000, direction: 'credit', last4: '5566', balance: 3210000 } },
  // ---------------- BoB
  { name: 'BoB debit', sender: 'VM-BOBSMS', body: 'Rs.780.00 Dr. from A/C XXXXXX2211 and Cr. to paytm.s1abc@paytm. Ref:629415371666. AvlBal:Rs5,420.00(2026:10:18 11:11:11) - Bank of Baroda', expect: { amount: 78000, direction: 'debit', last4: '2211', ref: '629415371666' } },
  { name: 'BoB credit', sender: 'VM-BOBSMS', body: 'Rs.4,000.00 Cr. to A/C XXXXXX2211 on 18-10-26 by UPI Ref:629415371777. AvlBal:Rs9,420.00 - Bank of Baroda', expect: { amount: 400000, direction: 'credit', last4: '2211', ref: '629415371777' } },
  // ---------------- Yes
  { name: 'Yes Bank debit', sender: 'VM-YESBNK', body: 'INR 1,350.00 debited from Yes Bank A/c XX7777 on 18-10-2026 towards UPI-629415371888-INDIAN OIL. Bal INR 22,000.00', expect: { amount: 135000, direction: 'debit', last4: '7777', balance: 2200000 } },
  { name: 'Yes Bank credit', sender: 'VM-YESBNK', body: 'Your Yes Bank A/c XX7777 is credited with INR 600.00 on 18-10-2026 via IMPS Ref 629415371999 from MEERA IYER', expect: { amount: 60000, direction: 'credit', last4: '7777', ref: '629415371999', merchant: 'Meera Iyer' } },
  // ---------------- IDFC
  { name: 'IDFC debit', sender: 'VM-IDFCFB', body: 'Your A/C XXXX5050 is debited by INR 2,200.00 on 18-10-2026 at 08:45 for UPI-629415372000-ZEPTO. Avl Bal INR 3,300.00', expect: { amount: 220000, direction: 'debit', last4: '5050', balance: 330000 } },
  { name: 'IDFC credit', sender: 'VM-IDFCFB', body: 'IDFC FIRST Bank: INR 10,000.00 credited to A/C XXXX5050 on 18-10-2026 from UPI Ref 629415372111', expect: { amount: 1000000, direction: 'credit', last4: '5050', ref: '629415372111' } },
  // ---------------- IndusInd
  { name: 'IndusInd card', sender: 'VM-INDUSB', body: 'Transaction of INR 1,725.00 done on IndusInd Bank Credit Card XX6161 at BIG BAZAAR on 18-10-26. Debited', expect: { amount: 172500, direction: 'debit', last4: '6161', instrument: 'card' } },
  { name: 'IndusInd debit', sender: 'VM-INDUSB', body: 'INR 500.00 debited from your IndusInd Bank A/c no. XX0909 on 18-10-26 UPI Ref 629415372222. Avl bal INR 4,500.00', expect: { amount: 50000, direction: 'debit', last4: '0909', ref: '629415372222', balance: 450000 } },
  // ---------------- Federal
  { name: 'Federal debit', sender: 'VM-FEDBNK', body: 'Rs 650.00 debited from your Federal Bank A/c XX8899 on 18-10-26 to VPA kfc@paytm. Ref No 629415372333', expect: { amount: 65000, direction: 'debit', last4: '8899', merchant: 'Kfc', ref: '629415372333' } },
  { name: 'Federal credit', sender: 'VM-FEDBNK', body: 'Rs 3,000.00 credited to your Federal Bank A/c XX8899 on 18-10-26 by VPA deepak@ybl. Ref No 629415372444', expect: { amount: 300000, direction: 'credit', last4: '8899', merchant: 'Deepak', ref: '629415372444' } },
  // ---------------- AU
  { name: 'AU debit', sender: 'VM-AUBANK', body: 'Rs. 999.00 debited from AU Bank A/c XX3030 on 18-10-26 for UPI txn to HOTSTAR. UPI Ref 629415372555', expect: { amount: 99900, direction: 'debit', last4: '3030', ref: '629415372555' } },
  { name: 'AU credit', sender: 'VM-AUBANK', body: 'Rs. 12,500.00 credited to AU Bank A/c XX3030 on 18-10-26. UPI Ref 629415372666. Bal Rs. 40,000.00', expect: { amount: 1250000, direction: 'credit', last4: '3030', ref: '629415372666', balance: 4000000 } },
  // ---------------- Cards / misc formats
  { name: 'Amex-style foreign', sender: 'AD-AMEXIN', body: 'Alert: You have spent USD 12.50 on your card ending 1005 at OPENAI on 18-10-26.', expect: { amount: 1250, direction: 'debit', last4: '1005', currency: 'USD', merchant: 'Openai' } },
  { name: 'Card spent INR prefix', sender: 'VM-HDFCBK', body: 'INR 1,299.00 spent on Card XX5678 at AMAZON on 18-10-26 12:30:11', expect: { amount: 129900, direction: 'debit', last4: '5678', merchant: 'Amazon' } },
  { name: 'Card contactless', sender: 'AX-HDFCBK', body: 'Thank you for using your HDFC Bank Card ending 5678 for Rs 180.00 at STARBUCKS on 18-10-26 at 16:20.', expect: { amount: 18000, direction: 'debit', last4: '5678', merchant: 'Starbucks', instrument: 'card' } },
  { name: 'Rupee symbol', sender: 'AX-HDFCBK', body: '₹320.50 debited from A/c XX1234 on 18-10-26 to VPA ola@ybl. UPI Ref 629415372777', expect: { amount: 32050, direction: 'debit', last4: '1234', merchant: 'Ola', ref: '629415372777' } },
  { name: 'Paid prefix', sender: 'VM-HDFCBK', body: 'Paid Rs. 85.00 to Local Chai Stall from A/c XX1234 on 18-10-26. UPI Ref 629415372888', expect: { amount: 8500, direction: 'debit', last4: '1234', merchant: 'Local Chai Stall', ref: '629415372888' } },
  { name: 'Mobile number VPA', sender: 'VM-HDFCBK', body: 'Rs.200.00 debited from a/c **1234 on 18-10-26 to VPA 9876543210@ybl (UPI Ref No 629415372999)', expect: { amount: 20000, direction: 'debit', last4: '1234', merchant: null, ref: '629415372999' } },
  { name: 'Large amount lakhs', sender: 'AX-HDFCBK', body: 'Rs.12,34,567.89 debited from a/c XX1234 on 18-10-26 to VPA builder@icici. UPI Ref 629415373000', expect: { amount: 123456789, direction: 'debit', last4: '1234', ref: '629415373000' } },
  { name: 'No decimals', sender: 'AX-HDFCBK', body: 'Rs 75 debited from A/c XX1234 on 18-10-26 to VPA metro@upi', expect: { amount: 7500, direction: 'debit', last4: '1234' } },
  { name: 'Rs glued', sender: 'AX-HDFCBK', body: 'Rs450 spent on Card XX5678 at ZOMATO on 18-10-26', expect: { amount: 45000, direction: 'debit', last4: '5678', merchant: 'Zomato' } },
  { name: 'Autopay debit', sender: 'AX-HDFCBK', body: 'Rs.199.00 debited from a/c XX1234 on 18-10-26 towards AUTOPAY mandate for GOOGLE PLAY. UPI Ref 629415373111', expect: { amount: 19900, direction: 'debit', last4: '1234', ref: '629415373111' } },
  { name: 'Bill pay', sender: 'AX-HDFCBK', body: 'Payment of Rs.1,250.00 towards BESCOM Electricity bill debited from a/c XX1234 on 18-10-26', expect: { amount: 125000, direction: 'debit', last4: '1234' } },
  { name: 'Refund credit', sender: 'AX-HDFCBK', body: 'Refund of Rs.699.00 from MYNTRA credited to your a/c XX1234 on 18-10-26', expect: { amount: 69900, direction: 'credit', last4: '1234', merchant: 'Myntra' } },
  { name: 'Interest credit', sender: 'AX-HDFCBK', body: 'Interest of Rs.123.45 credited to a/c XX1234 on 30-09-26', expect: { amount: 12345, direction: 'credit', last4: '1234' } },
  { name: 'Cashback credit', sender: 'VM-AXISBK', body: 'Cashback of Rs 25.00 credited to your Axis Bank A/c XX4455 on 18-10-26', expect: { amount: 2500, direction: 'credit', last4: '4455' } },
  { name: 'Wallet-style paytm', sender: 'VM-PAYTMB', body: 'Paid Rs.60 to Moti Dairy using Paytm Payments Bank A/c XX0001. UPI Ref 629415373222', expect: { amount: 6000, direction: 'debit', ref: '629415373222', merchant: 'Moti Dairy' } },
  { name: 'Canara', sender: 'VM-CANBNK', body: 'An amount of INR 1,000.00 has been DEBITED to your account XXX4321 on 18/10/2026 Total Avail.bal INR 5,000.00 - Canara Bank', expect: { amount: 100000, direction: 'debit', last4: '4321', balance: 500000 } },
  { name: 'Union', sender: 'VM-UBINBK', body: 'A/c *8765 Debited for Rs:350.00 on 18-10-2026 by Transfer (Ref 629415373333). Avl Bal Rs:900.00', expect: { amount: 35000, direction: 'debit', last4: '8765', ref: '629415373333', balance: 90000 } },
  { name: 'Lowercase bank text', sender: 'VM-HDFCBK', body: 'rs.150 debited from a/c xx1234 on 18-10-26 to vpa chaayos@ybl. upi ref 629415373444', expect: { amount: 15000, direction: 'debit', last4: '1234', ref: '629415373444' } },
  // ---------------- Rejections: OTP
  { name: 'OTP login', sender: 'AX-HDFCBK', body: '482915 is your OTP for login to HDFC Bank NetBanking. Valid for 10 mins. Do not share with anyone.', expect: { reject: 'otp' } },
  { name: 'OTP txn', sender: 'VM-ICICIB', body: 'OTP is 771234 for txn of INR 4,999.00 at MYNTRA on ICICI Bank Card XX9012. Valid 5 mins. Never share OTP', expect: { reject: 'otp' } },
  { name: 'OTP upi pin', sender: 'VM-SBIUPI', body: 'Your one time password 120345 for adding beneficiary is valid for 10 minutes. Do not share.', expect: { reject: 'otp' } },
  // ---------------- Rejections: promos
  { name: 'Promo loan', sender: 'VM-HDFCBK', body: 'Pre-approved personal loan of Rs 5,00,000 for you! Apply now at hdfcbank.com/loan. T&C apply', expect: { reject: 'promo' } },
  { name: 'Promo cashback', sender: 'AX-ICICIB', body: 'Get up to Rs 500 cashback on your next UPI payment. Offer valid till 31 Oct. Use code SAVE500', expect: { reject: 'promo' } },
  { name: 'Promo emi', sender: 'AX-AXISBK', body: 'Convert your purchase of Rs 25,000 to EMI at 12% p.a. Click https://axis.bank/emi to avail now', expect: { reject: 'promo' } },
  // ---------------- Rejections: balance only
  { name: 'Balance check', sender: 'AX-HDFCBK', body: 'Available balance in your HDFC Bank A/c XX1234 is Rs.22,450.00 as on 18-10-26', expect: { reject: 'balance_only' } },
  { name: 'Mini statement', sender: 'VM-SBIINB', body: 'Your A/c XXXXXXXX1234 Avl Bal Rs 15,000.50 as of 18Oct26. -SBI', expect: { reject: 'balance_only' } },
  // ---------------- Rejections: failed / declined / reversed
  { name: 'Failed upi', sender: 'AX-HDFCBK', body: 'Your UPI transaction of Rs.450.00 to swiggy@ybl has failed. Amount not debited. Ref 629415373555', expect: { reject: 'failed' } },
  { name: 'Declined card', sender: 'AX-ICICIB', body: 'Your transaction of INR 2,500.00 on ICICI Bank Card XX9012 at AMAZON was declined due to insufficient funds.', expect: { reject: 'failed' } },
  { name: 'Reversed', sender: 'AX-HDFCBK', body: 'Rs.450.00 debited earlier from a/c XX1234 has been reversed. UPI Ref 629415373666', expect: { reject: 'reversed' } },
  { name: 'Reversal', sender: 'VM-AXISBK', body: 'Reversal of INR 600.00 for txn at DOMINOS on card XX7788 has been initiated.', expect: { reject: 'reversed' } },
  // ---------------- Rejections: other
  { name: 'Mandate created', sender: 'AX-HDFCBK', body: 'You have successfully created a UPI mandate for Rs 199.00 with GOOGLE PLAY. Approve in your UPI app.', expect: { reject: 'not_financial' } },
  { name: 'Card bill payment received', sender: 'AX-HDFCBK', body: 'Payment of Rs 15,000.00 received on your HDFC Bank Credit Card XX5678 on 18-10-26. Thank you.', expect: { reject: 'card_payment' } },
  { name: 'Bill due reminder', sender: 'AX-ICICIB', body: 'Your credit card statement is generated. Total amount due Rs 12,340.00, minimum due Rs 620.00 by 28-10-26.', expect: { reject: 'not_financial' } },
  { name: 'Plain chat', sender: '+919876543210', body: 'Hey are we still meeting for lunch tomorrow? I will pay for the coffee though', expect: { reject: 'not_financial' } },
  { name: 'Delivery msg', sender: 'VM-AMAZON', body: 'Your Amazon order #123-456 is out for delivery today. Pay Rs 499 cash on delivery.', expect: { reject: 'not_financial' } },
];
