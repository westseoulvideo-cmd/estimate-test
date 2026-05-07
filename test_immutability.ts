import { PRICES } from './src/lib/pricing';

// This should fail at compile time
// PRICES.shooting = 600000;

console.log(PRICES);
console.log('PRICES is readonly at compile time with "as const"');
