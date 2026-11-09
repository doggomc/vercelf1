import { slugify } from '../data/slugs';
import type { DriverRef } from '../pages/driver-core';

export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string));
export const driverSlug = (driver: DriverRef) => slugify(`${driver.givenName} ${driver.familyName}`);
