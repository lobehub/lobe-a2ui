import { createContext, use } from 'react';

import type { A2uiSurfaceRecord } from '../types';

/** The stored surface a component belongs to, for components that talk to the host themselves. */
export const A2uiRecordContext = createContext<A2uiSurfaceRecord | undefined>(undefined);

export const useA2uiRecord = () => use(A2uiRecordContext);
