/** Serialize encryption and local write dispatch, never remote acknowledgements.
 * Waiting for an acknowledgement would strand subsequent offline edits in memory.
 */
export function dispatchJotSave(
  previous: Promise<void>,
  prepare: () => Promise<(() => Promise<void>) | null>,
  onSaved: () => void,
  onError: (error: unknown) => void,
): Promise<void> {
  return previous.catch(() => undefined).then(async () => {
    const commit = await prepare();
    if (commit) void commit().then(onSaved, onError);
  });
}
