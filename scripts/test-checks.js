export async function runChecks(checks) {
  const failures = [];
  for (const [name, action] of checks) {
    try {
      await action();
    } catch (error) {
      failures.push(new Error(name, { cause: error }));
    }
  }
  if (failures.length) throw new AggregateError(failures, `${failures.length} checks failed`);
}
