// Tracks group IDs created by THIS client to avoid double-playing the replay
// for the admin who actually pressed "Sortear".
const selfGroups = new Set<string>();

export function markSelfSorteo(groupId: string) {
  selfGroups.add(groupId);
  // Keep the set small; entries can expire after 5 min.
  setTimeout(() => selfGroups.delete(groupId), 5 * 60 * 1000);
}

export function isSelfSorteo(groupId: string) {
  return selfGroups.has(groupId);
}
