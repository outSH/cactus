export function assertFabricFunctionIsAvailable(
  fun: unknown,
  functionName: string,
) {
  if (typeof fun !== "function") {
    throw new Error(`${functionName} could not be imported from fabric SDK`);
  }
}
