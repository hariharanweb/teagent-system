import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-registers cleanup when vitest runs with `globals: true`, which this
// project doesn't — without this, a second render() in the same file sees the first one's DOM.
afterEach(cleanup);
