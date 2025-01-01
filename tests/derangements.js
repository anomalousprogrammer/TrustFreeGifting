/*************************************************************
 * Derangement Functions
 *************************************************************/

/**
 * subfactorial(n):
 * Returns the number of derangements of n items (!n).
 * Uses the inclusion-exclusion formula:
 *   !n = n! * (1 - 1/1! + 1/2! - 1/3! + ... + (-1)^n / n!)
 */
function subfactorial(n) {
    // Calculate n!
    let factorial = 1;
    for (let i = 2; i <= n; i++) {
      factorial *= i;
    }
  
    // Sum up the series (1 - 1/1! + 1/2! - ... )
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      // Compute k!
      let kFactorial = 1;
      for (let j = 2; j <= k; j++) {
        kFactorial *= j;
      }
      sum += ((-1) ** k) / kFactorial;
    }
  
    // Round to handle floating-point errors
    return Math.round(factorial * sum);
  }
  
  /**
   * createDpTable(n):
   * Precomputes dp(i, usedMask) = # of ways to fill positions [i..n-1]
   * with unused items, subject to the derangement constraint (item j != position j).
   * Returns a function dp(i, usedMask) that reads from the internal memo.
   */
  function createDpTable(n) {
    // We store dp values in an array. Each state is identified by (i, usedMask).
    // We'll map that to a single index: i*(1<<n) + usedMask.
    const dpSize = n * (1 << n);
    const dpMemo = new Array(dpSize).fill(-1);
  
    // Helper to convert (i, used) -> index
    function stateIndex(i, used) {
      return i * (1 << n) + used;
    }
  
    function countDerangements(i, used) {
      // If we've assigned all positions, return 1 if we've used all items, else 0
      if (i === n) {
        return used === (1 << n) - 1 ? 1 : 0;
      }
      const idx = stateIndex(i, used);
      if (dpMemo[idx] !== -1) {
        return dpMemo[idx];
      }
  
      let ways = 0;
      // Try placing each item c in position i
      for (let c = 0; c < n; c++) {
        // We cannot put c in position i if c == i (derangement condition)
        // We cannot use c if it's already used (check bitmask)
        if (c !== i && (used & (1 << c)) === 0) {
          ways += countDerangements(i + 1, used | (1 << c));
        }
      }
      dpMemo[idx] = ways;
      return ways;
    }
  
    // Fill out the DP table by calling countDerangements(0, 0)
    countDerangements(0, 0);
  
    // Return a reader function
    return (i, used) => dpMemo[stateIndex(i, used)];
  }
  
  /**
   * nthDerangement(n, a):
   * Returns the "a-th" derangement in lexicographic order for n items labeled 0..n-1.
   * We reduce 'a' modulo !n so it's guaranteed to be within [0, !n - 1].
   */
  function nthDerangement(n, a) {
    const totalDer = subfactorial(n);
    a = a % totalDer; // wrap 'a' if it's >= !n
  
    // Build the DP table
    const dp = createDpTable(n);
  
    const result = new Array(n);
    let used = 0; // bitmask of used elements
  
    for (let i = 0; i < n; i++) {
      // Try each candidate c in ascending order
      for (let c = 0; c < n; c++) {
        // Conditions:
        // (1) c != i
        // (2) c is not already used (bitmask check)
        if (c !== i && (used & (1 << c)) === 0) {
          const countIfChosen = dp(i + 1, used | (1 << c));
          if (a < countIfChosen || i == n-1) {
            // The a-th derangement is in this branch
            result[i] = c;
            used |= (1 << c);
            break;
          } else {
            // Otherwise, skip this branch and subtract its size
            a -= countIfChosen;
          }
        }
      }
    }
    return result;
  }
  
  /*************************************************************
   * Test Functions
   *************************************************************/
  
  /**
   * testAllDerangements(n):
   * Generates ALL derangements for a given n by calling nthDerangement
   * from a=0..(!n - 1) and checks:
   *   1. Each result is truly a derangement (der[i] !== i)
   *   2. No duplicates (all are unique).
   */
  function testAllDerangements(n) {
    console.log(`\nTesting all derangements for n=${n}...`);
    const totalDer = subfactorial(n);
    console.log(`Expected number of derangements: !${n} = ${totalDer}`);
  
    const seen = new Set();
    let pass = true;
  
    for (let a = 0; a < totalDer; a++) {
      const der = nthDerangement(n, a);
      
      // Check correctness: der[i] != i
      for (let i = 0; i < n; i++) {
        if (der[i] === i) {
          console.error(`ERROR: Not a derangement at seed=${a}. Position i=${i} has value i.`);
          pass = false;
          break;
        } 
      }
  
      // Check uniqueness
      const signature = der.join(",");
      if (seen.has(signature)) {
        console.error(`ERROR: Duplicate derangement at seed=${a}: [${signature}]`);
        pass = false;
        break;
      }
      seen.add(signature);
      console.log(der);
    }
  
    // Check we got exactly totalDer unique results
    if (seen.size !== totalDer) {
      console.error(`ERROR: We only got ${seen.size} unique results, expected ${totalDer}.`);
      pass = false;
    }
  
    if (pass) {
      console.log(`SUCCESS: Generated ${totalDer} unique derangements for n=${n}, all correct.`);
    } else {
      console.error("FAILURE in testAllDerangements");
    }
  }
  
  /**
   * runTests():
   * Calls testAllDerangements for chosen values of n.
   */
  function runTests() {
    testAllDerangements(1); //0
    testAllDerangements(2); //1
    testAllDerangements(3); //2
    testAllDerangements(4); //9
    /*
    testAllDerangements(5); //44
    testAllDerangements(6); //265
    testAllDerangements(7); //1854
    testAllDerangements(8); //14833
    testAllDerangements(9); //133496
    testAllDerangements(10); //1334961
    */
  }
  
  /*************************************************************
   * Run tests if this file is executed directly
   *************************************************************/
  
  runTests();
  