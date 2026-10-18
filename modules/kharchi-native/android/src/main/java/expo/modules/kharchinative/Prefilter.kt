package expo.modules.kharchinative

import java.util.Locale

/**
 * Cheap on-device gate. Anything that does not look like a completed bank/UPI transaction is dropped
 * immediately: never queued, never stored, never logged. The authoritative parser is the TypeScript one.
 */
object Prefilter {
  data class Candidate(
    val amountMinor: Long,
    val direction: String, // "debit" | "credit"
    val merchant: String?,
    val categoryKey: String,
  )

  private val SENDER = Regex("^[A-Za-z]{2}-[A-Za-z0-9]{3,9}(-[A-Za-z])?$")
  private val BANK_TOKENS = listOf("HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "PNB", "BARODA", "BOB", "YESB", "IDFC", "INDUS", "FEDERAL", "AUBANK", "CANARA", "PAYTM", "UPI")
  private val AMOUNT = Regex("(?i)(?:rs\\.?|inr|₹)\\s*[:.-]?\\s*(\\d[\\d,]*(?:\\.\\d{1,2})?)")
  private val DEBIT = Regex("(?i)\\b(debited|spent|withdrawn|paid|sent|purchase[d]?|deducted|thank you for using)\\b")
  private val CREDIT = Regex("(?i)\\b(credited|received|deposited|refund of|cashback of)\\b")
  private val OTP = Regex("(?i)\\b(otp|one[- ]?time|verification code|passcode)\\b")
  private val PROMO = Regex("(?i)(pre-?approved|apply now|click |https?://|offer valid|use code|t&c|cashback up to|get up to)")
  private val FAILED = Regex("(?i)\\b(fail(ed|ure)?|declin(ed|e)|unsuccessful|insufficient|revers(ed|al)|rejected|cancell?ed)\\b")
  private val BAL_CONTEXT = Regex("(?i)(bal(ance)?|avl|avail(able)?|limit|outstanding|due)[^.]{0,14}$")
  private val MERCHANT = Regex("(?:\\bat|\\bto|\\bfrom|VPA)\\s+([A-Za-z][A-Za-z0-9 &.'*_@-]{1,30}?)(?=\\s+(?:on|via|using|ref|upi|avl|bal|credited|debited)\\b|[.,(\\[]|\\s*$)")

  fun looksLikeBankSender(sender: String?): Boolean {
    if (sender.isNullOrBlank()) return false
    val s = sender.trim()
    if (Regex("^\\+?\\d{8,}$").matches(s)) return false
    if (SENDER.matches(s)) return true
    val up = s.uppercase(Locale.ROOT)
    return BANK_TOKENS.any { up.contains(it) }
  }

  fun senderAllowed(sender: String?, allowlist: List<String>): Boolean {
    if (allowlist.isEmpty()) return true
    val up = (sender ?: "").uppercase(Locale.ROOT)
    return allowlist.any { up.contains(it) }
  }

  /** Returns null when the text is not a financial transaction candidate. */
  fun evaluate(textRaw: String): Candidate? {
    val text = textRaw.replace(Regex("\\s+"), " ").trim()
    if (text.length < 15) return null
    val hasDebit = DEBIT.containsMatchIn(text)
    val hasCredit = CREDIT.containsMatchIn(text)
    if (!hasDebit && !hasCredit) return null
    if (OTP.containsMatchIn(text) && !Regex("(?i)\\b(debited|credited|spent)\\b").containsMatchIn(text)) return null
    if (FAILED.containsMatchIn(text)) return null
    if (PROMO.containsMatchIn(text) && !Regex("(?i)\\b(debited|credited|spent)\\b").containsMatchIn(text)) return null
    var amount: Long? = null
    for (m in AMOUNT.findAll(text)) {
      val before = text.substring(maxOf(0, m.range.first - 28), m.range.first)
      if (BAL_CONTEXT.containsMatchIn(before)) continue
      val clean = m.groupValues[1].replace(",", "")
      val parts = clean.split(".")
      val whole = parts[0].toLongOrNull() ?: continue
      val frac = (parts.getOrNull(1) ?: "").padEnd(2, '0').take(2).toLongOrNull() ?: 0L
      amount = whole * 100 + frac
      break
    }
    if (amount == null || amount <= 0) return null
    val dIdx = DEBIT.find(text)?.range?.first ?: -1
    val cIdx = CREDIT.find(text)?.range?.first ?: -1
    val debit = dIdx >= 0 && (cIdx < 0 || dIdx < cIdx)
    val merchant = MERCHANT.find(text)?.groupValues?.get(1)?.trim()?.let { cleanMerchant(it) }
    return Candidate(amount, if (debit) "debit" else "credit", merchant, guessCategory(merchant ?: text, debit))
  }

  private fun cleanMerchant(s: String): String? {
    val t = s.substringBefore("@").trim().trim('.', ',', '-', '*')
    if (t.length < 2 || t.all { it.isDigit() }) return null
    if (t == t.uppercase(Locale.ROOT)) return t.lowercase(Locale.ROOT).split(" ").joinToString(" ") { w -> w.replaceFirstChar { it.uppercase() } }
    return t
  }

  /** Mirrors a few keywords from src/features/tracker/defaults.ts so the notification can offer a sensible one-tap chip. */
  fun guessCategory(text: String, debit: Boolean): String {
    val t = text.lowercase(Locale.ROOT)
    if (!debit) return if (t.contains("salary")) "salary" else if (t.contains("refund")) "refund" else "income_other"
    return when {
      Regex("swiggy|zomato|restaurant|cafe|coffee|starbucks|dominos|pizza|kfc|chai|food").containsMatchIn(t) -> "food"
      Regex("bigbasket|blinkit|zepto|dmart|grocer|instamart").containsMatchIn(t) -> "groceries"
      Regex("uber|ola|rapido|metro|irctc|petrol|fuel|fastag").containsMatchIn(t) -> "transport"
      Regex("amazon|flipkart|myntra|ajio|nykaa|meesho").containsMatchIn(t) -> "shopping"
      Regex("electricity|bescom|airtel|jio|recharge|broadband|bill").containsMatchIn(t) -> "bills"
      Regex("netflix|spotify|hotstar|prime|bookmyshow").containsMatchIn(t) -> "entertainment"
      Regex("pharmacy|apollo|medplus|hospital|clinic").containsMatchIn(t) -> "health"
      else -> "other"
    }
  }

  fun categoryLabel(key: String) = when (key) {
    "food" -> "Food"; "groceries" -> "Groceries"; "transport" -> "Transport"; "shopping" -> "Shopping"
    "bills" -> "Bills"; "entertainment" -> "Fun"; "health" -> "Health"; "salary" -> "Salary"
    "refund" -> "Refund"; "income_other" -> "Income"; else -> "Other"
  }
}
