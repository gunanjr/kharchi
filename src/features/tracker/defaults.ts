import type { AccountType } from '@/domain/types';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { key: 'food', name: 'Food & Dining', icon: '🍜', color: '#C2501A' },
  { key: 'groceries', name: 'Groceries', icon: '🥬', color: '#7A8B2E' },
  { key: 'transport', name: 'Transport', icon: '🚕', color: '#3F7CAC' },
  { key: 'shopping', name: 'Shopping', icon: '🛍️', color: '#B83A5B' },
  { key: 'bills', name: 'Bills & Utilities', icon: '💡', color: '#D19A1E' },
  { key: 'rent', name: 'Rent & Home', icon: '🏠', color: '#8C5A3C' },
  { key: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#6C5B9E' },
  { key: 'health', name: 'Health', icon: '💊', color: '#2F9E8F' },
  { key: 'travel', name: 'Travel', icon: '✈️', color: '#0E7C70' },
  { key: 'education', name: 'Education', icon: '📚', color: '#A0527C' },
  { key: 'subscriptions', name: 'Subscriptions', icon: '🔁', color: '#5B6FB0' },
  { key: 'other', name: 'Other', icon: '🧾', color: '#8A7F6E' },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { key: 'salary', name: 'Salary', icon: '💼', color: '#0E6B4F' },
  { key: 'freelance', name: 'Freelance', icon: '🧑‍💻', color: '#2F9E8F' },
  { key: 'interest', name: 'Interest & Returns', icon: '📈', color: '#7A8B2E' },
  { key: 'refund', name: 'Refunds', icon: '↩️', color: '#3F7CAC' },
  { key: 'gift', name: 'Gifts', icon: '🎁', color: '#B83A5B' },
  { key: 'income_other', name: 'Other income', icon: '💰', color: '#8A7F6E' },
] as const;

export const DEFAULT_ACCOUNTS: { name: string; type: AccountType; icon: string }[] = [
  { name: 'Cash', type: 'cash', icon: '💵' },
  { name: 'UPI', type: 'upi', icon: '📲' },
  { name: 'Bank account', type: 'bank', icon: '🏦' },
];

/** Keyword -> category key for first-time suggestions before the user has taught us anything. */
export const KEYWORD_CATEGORY: [RegExp, string][] = [
  [/swiggy|zomato|restaurant|cafe|coffee|starbucks|mcdonald|dominos|kfc|pizza|biryani|lunch|dinner|breakfast|chai|food/i, 'food'],
  [/bigbasket|blinkit|zepto|dmart|instamart|grocer|vegetable|milk|kirana|reliance fresh/i, 'groceries'],
  [/uber|ola|rapido|metro|irctc|petrol|fuel|diesel|parking|fastag|cab|auto|bus/i, 'transport'],
  [/amazon|flipkart|myntra|ajio|nykaa|meesho|shop|mall|clothes/i, 'shopping'],
  [/electricity|bescom|recharge|airtel|jio|vodafone|broadband|gas|water bill|dth|bill/i, 'bills'],
  [/rent|maintenance|society|furniture|plumber/i, 'rent'],
  [/netflix|spotify|prime|hotstar|youtube|bookmyshow|movie|pvr|inox|game/i, 'entertainment'],
  [/pharmacy|apollo|medplus|doctor|hospital|clinic|medicine|lab|1mg|pharmeasy/i, 'health'],
  [/makemytrip|goibibo|airbnb|hotel|flight|indigo|oyo|trip/i, 'travel'],
  [/course|udemy|school|college|tuition|book|coursera/i, 'education'],
  [/subscription|membership|icloud|google one|chatgpt/i, 'subscriptions'],
  [/salary|payroll/i, 'salary'],
];
