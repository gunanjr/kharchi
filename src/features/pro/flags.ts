/**
 * Launch switch for BruhMe Pro (founder decision, 20 Oct: launch free first, add Pro in an update).
 * While false, Pro is hidden in store builds: no Pro card, no Vault entry, no Pro screen links. The code stays built and
 * tested; development builds still show Pro so the team can keep working on it. Flip to true when Google Play billing
 * and the three products are live.
 */
export const PRO_LAUNCHED = false;
export const showPro = () => PRO_LAUNCHED || __DEV__;
