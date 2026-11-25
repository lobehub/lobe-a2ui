/** Only https: media and links leave the conversation for hosts we know nothing about. */
export const isHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.host !== '';
  } catch {
    return false;
  }
};
