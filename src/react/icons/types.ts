import type { ComponentType } from 'react';

/** Loads one icon module; its default export is the icon component. */
export type IconLoader = () => Promise<{ default: ComponentType<any> }>;
