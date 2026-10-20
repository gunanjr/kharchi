/** What the Groups tab shows at the top: across every friend, how much is owed to you and how much you owe. */
export interface Overview { owed: number; owe: number; net: number; owedBy: number; oweTo: number }

export function overview(friends: { net: number }[]): Overview {
  let owed = 0, owe = 0, owedBy = 0, oweTo = 0;
  for (const f of friends) {
    if (f.net > 0) { owed += f.net; owedBy++; }
    else if (f.net < 0) { owe += -f.net; oweTo++; }
  }
  return { owed, owe, net: owed - owe, owedBy, oweTo };
}

/** Groups with something outstanding come first (largest balance first), settled ones after, keeping their own order. */
export function sortByOutstanding<T extends { myBalance: number }>(groups: T[]): T[] {
  const open = groups.filter((g) => g.myBalance !== 0).sort((a, b) => Math.abs(b.myBalance) - Math.abs(a.myBalance));
  return [...open, ...groups.filter((g) => g.myBalance === 0)];
}

/** "Asha", "Asha and Ravi", "Asha, Ravi and 2 more": the first names of the other members. */
export function memberLine(names: string[], max = 2): string {
  const n = names.filter(Boolean);
  if (n.length === 0) return 'Just you';
  if (n.length <= max) return n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
  return `${n.slice(0, max).join(', ')} and ${n.length - max} more`;
}
