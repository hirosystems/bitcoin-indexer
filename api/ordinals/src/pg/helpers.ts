export function objRemoveUndefinedValues(obj: object) {
  Object.keys(obj).forEach(key => (obj as any)[key] === undefined && delete (obj as any)[key]);
}
