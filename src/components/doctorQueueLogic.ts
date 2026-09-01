export type DoctorQueueAction = 'CALL_NEXT' | 'COMPLETE_AND_CALL_NEXT' | 'COMPLETE_ONLY';

export function getDoctorQueueAction({
  activeToken,
  nextToken,
}: {
  activeToken: { id: string } | null;
  nextToken: { id: string } | null;
}): DoctorQueueAction {
  if (!activeToken && nextToken) return 'CALL_NEXT';
  if (activeToken && nextToken) return 'COMPLETE_AND_CALL_NEXT';
  if (activeToken && !nextToken) return 'COMPLETE_ONLY';
  return 'CALL_NEXT';
}
