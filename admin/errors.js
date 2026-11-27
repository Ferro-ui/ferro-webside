export class AdminError extends Error {}
// Main moved and touched the same files, or the ref update was refused.
export class ConflictError extends AdminError {
  constructor() { super('Innholdet er endret et annet sted etter at du åpnet det.') }
}
