export interface Hint {
  trigger: string;
  approach: string;
}

export interface Note {
  id: string;
  title: string;
  blurb: string;
  tags?: string[];
  complexity?: { time?: string; space?: string };
  code?: string;
  notes?: string[];
  hints?: Hint[];
}

export interface NoteGroup {
  id: string;
  label: string;
  notes: Note[];
}

export const noteGroups: NoteGroup[] = [
  {
    id: "patterns",
    label: "Core patterns",
    notes: [
      {
        id: "pattern-hints",
        title: "Pattern hints — what to reach for",
        blurb:
          "Map the prompt's shape to the technique. Use as a first-pass filter when the interviewer hands you the problem.",
        tags: ["cheatsheet"],
        hints: [
          { trigger: "Tree / graph", approach: "DFS or BFS" },
          { trigger: "Subarray / substring output", approach: "Sliding window" },
          { trigger: "In-place on a sequence", approach: "Two pointers" },
          { trigger: "Dependencies / ordering", approach: "Topological sort" },
          { trigger: "Shortest path, unweighted", approach: "BFS" },
          { trigger: "Shortest path, weighted (non-negative)", approach: "Dijkstra" },
          { trigger: "Self-referential structure", approach: "Recursion" },
          { trigger: "Sorted input", approach: "Binary search" },
          { trigger: "Monotone feasibility on a range", approach: "Binary search on the answer" },
          { trigger: "Connectivity / cycle in undirected graph", approach: "Union-Find" },
          { trigger: "Prefix queries on strings", approach: "Trie" },
          { trigger: "Bottleneck is sorting / top-k", approach: "Heap" },
          { trigger: "Range sum / range update", approach: "Prefix sum / difference array" },
          { trigger: "Next greater / smaller element", approach: "Monotonic stack" },
          { trigger: "All combinations / permutations", approach: "Backtracking" },
          { trigger: "Greedy doesn't work / overlapping subproblems", approach: "Backtracking + memo / DP" },
          { trigger: "Recent-access lookup", approach: "LRU (Map insertion order)" },
        ],
      },
      {
        id: "binary-search",
        title: "Binary search",
        blurb:
          "Maintain an exclusive window between a known-before index l and known-after index r. Shrink until they're adjacent — r is the answer.",
        complexity: { time: "O(log n)", space: "O(1)" },
        tags: ["array", "search"],
        notes: [
          "Define isBefore(i) as the monotone predicate. The answer is the first i where isBefore(i) is false.",
          "Exclusive bounds: l = -1 (everything before is 'before'), r = n (everything after is 'after').",
          "Loop while there's still a gap (r - l > 1). Each step halves the gap.",
          "Edge cases: empty input → r = 0; all isBefore → r = n; none isBefore → r = 0.",
          "Generalises directly: lowerBound on a sorted array → isBefore = arr[i] < target. Exact match → check arr[r] === target afterwards.",
        ],
        code: `BinarySearch(n, isBefore)
  // isBefore(i): monotone predicate (true … true | false … false)
  // Returns first index r where !isBefore(r), or n if no such index.

  define isBefore(i)            // user-supplied; e.g. arr[i] < target

  l = -1                        // last known "before"  (exclusive)
  r = n                         // first known "after"  (exclusive)

  // edge cases — handled implicitly by the loop:
  //   empty:           n == 0   →  r = 0
  //   all before:      isBefore(n - 1) true   →  r = n
  //   none before:     !isBefore(0)           →  r = 0

  while r - l > 1:
    mid = floor((l + r) / 2)    // strictly between l and r
    if isBefore(mid):
      l = mid                   // mid is "before" → l moves up
    else:
      r = mid                   // mid is "after"  → r moves down

  return r                      // first index where !isBefore

// Exact match: isBefore = arr[i] < target, then return arr[r] === target ? r : -1.`,
      },
      {
        id: "binary-search-answer",
        title: "Binary search on the answer",
        blurb:
          "When feasibility is monotone in the answer (small enough capacity is infeasible, large enough is feasible). Binary search the predicate, not the value.",
        complexity: { time: "O(n · log(range))" },
        tags: ["array", "search", "greedy"],
        notes: [
          "Identify the answer space [lo, hi] and a monotone feasible(x).",
          "Write feasible(x) first — it's usually a linear sweep.",
          "Reuse the same exclusive-bounds template: isBefore(x) = !feasible(x).",
        ],
        code: `BinarySearchAnswer(lo, hi, feasible)
  // feasible(x): monotone — false … false | true … true as x grows.
  // Returns the smallest x in [lo, hi] where feasible(x) is true.

  define feasible(x)            // e.g. "can ship in D days with capacity x"

  l = lo - 1                    // exclusive: last known-infeasible
  r = hi                        // exclusive: first known-feasible (assume hi works)

  while r - l > 1:
    mid = floor((l + r) / 2)
    if feasible(mid):
      r = mid                   // can do better; shrink right
    else:
      l = mid                   // not enough; raise left

  return r

// Ship-within-D-days: lo = max(weights), hi = sum(weights),
//   feasible(cap) = packing weights left-to-right uses ≤ D batches.`,
      },
      {
        id: "two-pointers",
        title: "Two pointers",
        blurb:
          "Two indices moving over the same array. Use when a sorted array has a relation between left and right that's monotone as you advance.",
        complexity: { time: "O(n)", space: "O(1)" },
        tags: ["array"],
        code: `// Two-sum on sorted array
function twoSumSorted(
  arr: readonly number[],
  target: number,
): [number, number] | null {
  let l = 0;
  let r = arr.length - 1;
  while (l < r) {
    const sum = arr[l] + arr[r];
    if (sum === target) return [l, r];
    if (sum < target) l++;
    else r--;
  }
  return null;
}

// Remove duplicates in place — returns new length
function dedupe(arr: number[]): number {
  if (arr.length === 0) return 0;
  let write = 1;
  for (let read = 1; read < arr.length; read++) {
    if (arr[read] !== arr[read - 1]) arr[write++] = arr[read];
  }
  return write;
}`,
      },
      {
        id: "sliding-window",
        title: "Sliding window",
        blurb:
          "Maintain a window over a sequence that grows on the right and shrinks on the left when the invariant breaks.",
        complexity: { time: "O(n)", space: "O(k)" },
        tags: ["array", "string"],
        notes: [
          "Each index enters and leaves the window once.",
          "Track aggregate (sum, distinct count, max freq) incrementally.",
        ],
        code: `// Longest substring with at most k distinct characters
function longestKDistinct(s: string, k: number): number {
  const freq = new Map<string, number>();
  let best = 0;
  let l = 0;
  for (let r = 0; r < s.length; r++) {
    freq.set(s[r], (freq.get(s[r]) ?? 0) + 1);
    while (freq.size > k) {
      const c = s[l++];
      const next = (freq.get(c) ?? 0) - 1;
      if (next === 0) freq.delete(c);
      else freq.set(c, next);
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}`,
      },
      {
        id: "prefix-sum",
        title: "Prefix sum & difference array",
        blurb:
          "Precompute cumulative sums for O(1) range queries; use a difference array for O(1) range updates.",
        complexity: { time: "O(n) build, O(1) query" },
        tags: ["array"],
        code: `// Range-sum query
class PrefixSum {
  private readonly pre: number[];
  constructor(arr: readonly number[]) {
    this.pre = new Array<number>(arr.length + 1).fill(0);
    for (let i = 0; i < arr.length; i++) this.pre[i + 1] = this.pre[i] + arr[i];
  }
  // sum of arr[l..r] inclusive
  sum(l: number, r: number): number {
    return this.pre[r + 1] - this.pre[l];
  }
}

// Difference array: add +v on range [l, r] in O(1), reconstruct at end
function applyRangeAdds(
  n: number,
  ops: readonly { l: number; r: number; v: number }[],
): number[] {
  const diff = new Array<number>(n + 1).fill(0);
  for (const { l, r, v } of ops) {
    diff[l] += v;
    diff[r + 1] -= v;
  }
  const out = new Array<number>(n).fill(0);
  let run = 0;
  for (let i = 0; i < n; i++) {
    run += diff[i];
    out[i] = run;
  }
  return out;
}`,
      },
      {
        id: "backtracking",
        title: "Backtracking template",
        blurb:
          "Recursive build-and-undo. Frame the state, the choice set, and the prune condition.",
        complexity: { time: "Exponential — bounded by branching × depth" },
        tags: ["recursion"],
        code: `// Generate all subsets
function subsets<T>(arr: readonly T[]): T[][] {
  const out: T[][] = [];
  const path: T[] = [];
  const go = (i: number): void => {
    if (i === arr.length) {
      out.push([...path]);
      return;
    }
    // skip
    go(i + 1);
    // take
    path.push(arr[i]);
    go(i + 1);
    path.pop();
  };
  go(0);
  return out;
}

// Permutations with used[] tracking
function permutations<T>(arr: readonly T[]): T[][] {
  const out: T[][] = [];
  const used = new Array<boolean>(arr.length).fill(false);
  const path: T[] = [];
  const go = (): void => {
    if (path.length === arr.length) {
      out.push([...path]);
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(arr[i]);
      go();
      path.pop();
      used[i] = false;
    }
  };
  go();
  return out;
}`,
      },
      {
        id: "quickselect",
        title: "Quickselect (kth element)",
        blurb:
          "Average O(n) selection of the kth smallest. Partition like quicksort but recurse into the side that contains k.",
        complexity: { time: "O(n) avg / O(n²) worst" },
        tags: ["array"],
        code: `function quickselect(arr: number[], k: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const pivotIndex = lo + Math.floor(Math.random() * (hi - lo + 1));
    const pivot = arr[pivotIndex];
    [arr[pivotIndex], arr[hi]] = [arr[hi], arr[pivotIndex]];
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (arr[i] < pivot) {
        [arr[i], arr[store]] = [arr[store], arr[i]];
        store++;
      }
    }
    [arr[store], arr[hi]] = [arr[hi], arr[store]];
    if (store === k) return arr[store];
    if (store < k) lo = store + 1;
    else hi = store - 1;
  }
  throw new Error("unreachable");
}`,
      },
    ],
  },
  {
    id: "graphs",
    label: "Graphs & trees",
    notes: [
      {
        id: "bfs",
        title: "BFS",
        blurb:
          "Shortest path in unweighted graphs; level-order traversal. Use a queue + visited set.",
        complexity: { time: "O(V + E)", space: "O(V)" },
        tags: ["graph", "traversal"],
        notes: [
          "JS arrays as queues are O(n) on shift — use a head pointer or a deque.",
          "Mark visited at enqueue time, not dequeue, to avoid duplicates.",
        ],
        code: `// Shortest path length from start to target in an unweighted graph
function bfsShortest<N>(
  start: N,
  isTarget: (n: N) => boolean,
  neighbors: (n: N) => Iterable<N>,
  keyOf: (n: N) => string = String,
): number {
  const visited = new Set<string>([keyOf(start)]);
  const queue: { node: N; dist: number }[] = [{ node: start, dist: 0 }];
  let head = 0;
  while (head < queue.length) {
    const { node, dist } = queue[head++];
    if (isTarget(node)) return dist;
    for (const nb of neighbors(node)) {
      const k = keyOf(nb);
      if (visited.has(k)) continue;
      visited.add(k);
      queue.push({ node: nb, dist: dist + 1 });
    }
  }
  return -1;
}

// Grid neighbours helper
function* gridNeighbours(
  r: number,
  c: number,
  rows: number,
  cols: number,
): Generator<[number, number]> {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) yield [nr, nc];
  }
}`,
      },
      {
        id: "dfs",
        title: "DFS (recursive & iterative)",
        blurb:
          "Explore one branch fully before backtracking. Used for connectivity, cycle detection, and tree traversal.",
        complexity: { time: "O(V + E)", space: "O(V)" },
        tags: ["graph", "traversal"],
        code: `// Recursive DFS
function dfs<N>(
  start: N,
  neighbors: (n: N) => Iterable<N>,
  visit: (n: N) => void,
  keyOf: (n: N) => string = String,
): void {
  const seen = new Set<string>();
  const go = (n: N): void => {
    const k = keyOf(n);
    if (seen.has(k)) return;
    seen.add(k);
    visit(n);
    for (const nb of neighbors(n)) go(nb);
  };
  go(start);
}

// Iterative DFS — same shape as recursive (pre-order)
function dfsIter<N>(
  start: N,
  neighbors: (n: N) => Iterable<N>,
  visit: (n: N) => void,
  keyOf: (n: N) => string = String,
): void {
  const seen = new Set<string>();
  const stack: N[] = [start];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const k = keyOf(node);
    if (seen.has(k)) continue;
    seen.add(k);
    visit(node);
    for (const nb of neighbors(node)) stack.push(nb);
  }
}`,
      },
      {
        id: "topo-sort",
        title: "Topological sort (Kahn)",
        blurb:
          "Linear ordering of a DAG. Repeatedly remove nodes with in-degree 0. Detects cycles when result.length < n.",
        complexity: { time: "O(V + E)" },
        tags: ["graph"],
        code: `function topoSort(
  n: number,
  edges: readonly [number, number][],
): number[] | null {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Array<number>(n).fill(0);
  for (const [u, v] of edges) {
    adj[u].push(v);
    indeg[v]++;
  }
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
  }
  return order.length === n ? order : null; // null on cycle
}`,
      },
      {
        id: "union-find",
        title: "Union-Find (DSU)",
        blurb:
          "Disjoint-set union with path compression and union by rank. Use for connectivity and cycle detection in undirected graphs.",
        complexity: { time: "≈ O(α(n)) per op" },
        tags: ["graph", "data-structure"],
        code: `class UnionFind {
  private readonly parent: number[];
  private readonly rank: number[];
  private _components: number;

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array<number>(n).fill(0);
    this._components = n;
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    // path compression
    while (this.parent[x] !== root) {
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
    this._components--;
    return true;
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }

  get components(): number {
    return this._components;
  }
}`,
      },
      {
        id: "dijkstra",
        title: "Dijkstra (non-negative weights)",
        blurb:
          "Shortest path from a single source. Min-heap of (dist, node); skip stale entries on pop.",
        complexity: { time: "O((V + E) log V)" },
        tags: ["graph"],
        notes: [
          "Doesn't work with negative edges — use Bellman-Ford there.",
          "Lazy deletion: instead of decrease-key, push a fresh entry and skip when the popped dist > best.",
        ],
        code: `// Requires a MinHeap (see Heap note). Adjacency = Map<node, [neighbour, weight][]>
function dijkstra(
  source: number,
  adj: ReadonlyMap<number, readonly [number, number][]>,
): Map<number, number> {
  const dist = new Map<number, number>([[source, 0]]);
  const heap = new MinHeap<[number, number]>((a, b) => a[0] - b[0]);
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop()!;
    if (d > (dist.get(u) ?? Infinity)) continue; // stale
    for (const [v, w] of adj.get(u) ?? []) {
      const nd = d + w;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        heap.push([nd, v]);
      }
    }
  }
  return dist;
}`,
      },
      {
        id: "trie",
        title: "Trie (prefix tree)",
        blurb:
          "Tree keyed by character. Use for prefix queries and autocomplete.",
        complexity: { time: "O(L) per op", space: "O(total chars)" },
        tags: ["string", "data-structure"],
        code: `class TrieNode {
  readonly children = new Map<string, TrieNode>();
  isEnd = false;
}

class Trie {
  private readonly root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = new TrieNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    node.isEnd = true;
  }

  has(word: string): boolean {
    const node = this.walk(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== null;
  }

  private walk(s: string): TrieNode | null {
    let node = this.root;
    for (const ch of s) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }
}`,
      },
      {
        id: "tree-traversal",
        title: "Tree traversal (pre/in/post + level)",
        blurb:
          "Pre = root before children; in = left, root, right (sorted on BST); post = children before root; level = BFS.",
        complexity: { time: "O(n)", space: "O(h) recursion or O(w) queue" },
        tags: ["tree"],
        code: `interface TreeNode<T> {
  value: T;
  left: TreeNode<T> | null;
  right: TreeNode<T> | null;
}

function inorder<T>(root: TreeNode<T> | null, out: T[] = []): T[] {
  if (!root) return out;
  inorder(root.left, out);
  out.push(root.value);
  inorder(root.right, out);
  return out;
}

// Iterative inorder
function inorderIter<T>(root: TreeNode<T> | null): T[] {
  const out: T[] = [];
  const stack: TreeNode<T>[] = [];
  let cur = root;
  while (cur || stack.length > 0) {
    while (cur) {
      stack.push(cur);
      cur = cur.left;
    }
    cur = stack.pop()!;
    out.push(cur.value);
    cur = cur.right;
  }
  return out;
}

function levelOrder<T>(root: TreeNode<T> | null): T[][] {
  if (!root) return [];
  const out: T[][] = [];
  let layer: TreeNode<T>[] = [root];
  while (layer.length > 0) {
    out.push(layer.map((n) => n.value));
    const next: TreeNode<T>[] = [];
    for (const n of layer) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    layer = next;
  }
  return out;
}`,
      },
    ],
  },
  {
    id: "data-structures",
    label: "Data structures",
    notes: [
      {
        id: "min-heap",
        title: "Min heap (binary heap)",
        blurb:
          "Array-backed complete binary tree. Parent (i-1)/2, children 2i+1 and 2i+2. Sift up on push, sift down on pop.",
        complexity: { time: "O(log n) push/pop, O(1) peek" },
        tags: ["data-structure"],
        code: `class MinHeap<T> {
  private readonly data: T[] = [];
  constructor(private readonly cmp: (a: T, b: T) => number) {}

  get size(): number {
    return this.data.length;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  push(value: T): void {
    this.data.push(value);
    this.siftUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.cmp(this.data[i], this.data[parent]) >= 0) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < n && this.cmp(this.data[l], this.data[smallest]) < 0) smallest = l;
      if (r < n && this.cmp(this.data[r], this.data[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}`,
      },
      {
        id: "lru",
        title: "LRU cache",
        blurb:
          "Map + Map ordering trick: JS Map preserves insertion order, so re-inserting on access keeps the MRU at the back and the LRU at the front.",
        complexity: { time: "O(1) get/set", space: "O(capacity)" },
        tags: ["data-structure"],
        code: `class LRUCache<K, V> {
  private readonly map = new Map<K, V>();
  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    // Move to most-recent by re-inserting
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as K;
      this.map.delete(oldest);
    }
  }
}`,
      },
      {
        id: "linked-list",
        title: "Linked list helpers",
        blurb:
          "Iterative reverse and fast-slow runner are the building blocks for everything else (cycle detect, middle, kth-from-end).",
        complexity: { time: "O(n)" },
        tags: ["data-structure"],
        code: `interface ListNode<T> {
  value: T;
  next: ListNode<T> | null;
}

function reverse<T>(head: ListNode<T> | null): ListNode<T> | null {
  let prev: ListNode<T> | null = null;
  let cur = head;
  while (cur) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return prev;
}

// Floyd's cycle detection — slow moves 1, fast moves 2.
function hasCycle<T>(head: ListNode<T> | null): boolean {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

// Middle node — fast/slow runner returns the second-middle for even length.
function middle<T>(head: ListNode<T> | null): ListNode<T> | null {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow;
}`,
      },
      {
        id: "stack-queue",
        title: "Stack & monotonic stack",
        blurb:
          "Plain stack is just an array. Monotonic stack solves 'next greater element' family problems in O(n).",
        complexity: { time: "O(n) amortized" },
        tags: ["array", "data-structure"],
        code: `// Next greater element to the right — indices, -1 if none
function nextGreater(arr: readonly number[]): number[] {
  const out = new Array<number>(arr.length).fill(-1);
  const stack: number[] = []; // indices, values decreasing top-to-bottom
  for (let i = 0; i < arr.length; i++) {
    while (stack.length > 0 && arr[stack[stack.length - 1]] < arr[i]) {
      out[stack.pop()!] = i;
    }
    stack.push(i);
  }
  return out;
}

// Largest rectangle in a histogram
function largestRectangle(heights: readonly number[]): number {
  const stack: number[] = [];
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const cur = i === heights.length ? 0 : heights[i];
    while (stack.length > 0 && heights[stack[stack.length - 1]] > cur) {
      const h = heights[stack.pop()!];
      const left = stack.length === 0 ? -1 : stack[stack.length - 1];
      best = Math.max(best, h * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}`,
      },
    ],
  },
  {
    id: "system",
    label: "System-style asks",
    notes: [
      {
        id: "rate-limiter-queue",
        title: "Rate limiter — input/output pacing",
        blurb:
          "Tasks arrive with a scheduled timestamp and a run duration. Reject any task whose run window overlaps an already-accepted task.",
        complexity: { time: "O(log n) insert with a sorted structure" },
        tags: ["system", "scheduling"],
        notes: [
          "Clarify: reject vs. delay? Per-key buckets or global?",
          "Naive O(n) per task is fine to start; mention that a sorted set of non-overlapping intervals brings it to O(log n).",
          "Mention token-bucket as the alternative when input rate is bursty but the budget is averaged.",
        ],
        code: `interface Task {
  id: string;
  startMs: number; // scheduled start
  durationMs: number;
}

type Verdict =
  | { accepted: true; task: Task }
  | { accepted: false; task: Task; reason: "overlap" };

class IntervalRateLimiter {
  // Accepted tasks sorted by startMs; non-overlapping by construction.
  private readonly accepted: Task[] = [];

  submit(task: Task): Verdict {
    const end = task.startMs + task.durationMs;
    const i = this.firstAfter(task.startMs);

    // overlap with predecessor?
    if (i > 0) {
      const prev = this.accepted[i - 1];
      if (prev.startMs + prev.durationMs > task.startMs) {
        return { accepted: false, task, reason: "overlap" };
      }
    }
    // overlap with successor?
    if (i < this.accepted.length && this.accepted[i].startMs < end) {
      return { accepted: false, task, reason: "overlap" };
    }
    this.accepted.splice(i, 0, task);
    return { accepted: true, task };
  }

  // Binary search: index of first accepted task with startMs > t
  private firstAfter(t: number): number {
    let lo = 0;
    let hi = this.accepted.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (this.accepted[mid].startMs > t) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
}`,
      },
      {
        id: "rate-limiter-token",
        title: "Rate limiter — token bucket",
        blurb:
          "Bucket fills at a fixed rate up to a capacity. Each request consumes one (or more) tokens. Smoothes bursts while capping average rate.",
        complexity: { time: "O(1) per request" },
        tags: ["system", "scheduling"],
        code: `class TokenBucket {
  private tokens: number;
  private lastMs: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerMs: number,
    now: number = Date.now(),
  ) {
    this.tokens = capacity;
    this.lastMs = now;
  }

  tryConsume(cost: number = 1, now: number = Date.now()): boolean {
    this.refill(now);
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  private refill(now: number): void {
    const elapsed = now - this.lastMs;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastMs = now;
  }
}`,
      },
      {
        id: "file-system",
        title: "File system API",
        blurb:
          "In-memory hierarchical store: directories contain children, files hold bytes. Path resolution is the core of the interface.",
        tags: ["system"],
        notes: [
          "Clarify: absolute paths? Permissions? Symlinks? Atomic write?",
          "Two-step path resolve: walk parents, then look up the leaf.",
          "Talk through how a real spinning-disk layer differs: superblock, inodes, free-block bitmap, journaling.",
        ],
        code: `type DirNode = { type: "dir"; children: Map<string, FsNode> };
type FileNode = { type: "file"; content: string };
type FsNode = DirNode | FileNode;

class InMemoryFs {
  private readonly root: DirNode = { type: "dir", children: new Map() };

  mkdir(path: string): void {
    const parts = this.split(path);
    let dir = this.root;
    for (const name of parts) {
      const child = dir.children.get(name);
      if (!child) {
        const next: DirNode = { type: "dir", children: new Map() };
        dir.children.set(name, next);
        dir = next;
      } else if (child.type === "dir") {
        dir = child;
      } else {
        throw new Error(\`Not a directory: \${name}\`);
      }
    }
  }

  writeFile(path: string, content: string): void {
    const parts = this.split(path);
    const filename = parts.pop()!;
    const parent = this.resolveDir(parts);
    parent.children.set(filename, { type: "file", content });
  }

  readFile(path: string): string {
    const node = this.resolveNode(this.split(path));
    if (node.type !== "file") throw new Error("Not a file");
    return node.content;
  }

  ls(path: string): string[] {
    const node = this.resolveNode(this.split(path));
    if (node.type === "file") return [path.split("/").pop()!];
    return [...node.children.keys()].sort();
  }

  rm(path: string): void {
    const parts = this.split(path);
    const name = parts.pop()!;
    const parent = this.resolveDir(parts);
    if (!parent.children.delete(name)) throw new Error("Not found");
  }

  private split(path: string): string[] {
    return path.split("/").filter(Boolean);
  }

  private resolveDir(parts: readonly string[]): DirNode {
    let dir: DirNode = this.root;
    for (const name of parts) {
      const child = dir.children.get(name);
      if (!child || child.type !== "dir") throw new Error("Not a directory");
      dir = child;
    }
    return dir;
  }

  private resolveNode(parts: readonly string[]): FsNode {
    if (parts.length === 0) return this.root;
    const last = parts[parts.length - 1];
    const parent = this.resolveDir(parts.slice(0, -1));
    const node = parent.children.get(last);
    if (!node) throw new Error("Not found");
    return node;
  }
}`,
      },
      {
        id: "order-matching",
        title: "Order matching engine",
        blurb:
          "Limit order book with price-time priority. Two sides: buys sorted desc, sells asc; match when best buy ≥ best sell.",
        complexity: { time: "O(log n) post / O(matches) per match" },
        tags: ["system"],
        notes: [
          "Clarify: limit only or also market? Partial fills? Cancellations? IOC/FOK?",
          "Two priority queues + per-price FIFO is the standard structure.",
          "Talk about determinism — same input → same output is critical for replay.",
        ],
        code: `type Side = "buy" | "sell";

interface Order {
  id: string;
  side: Side;
  price: number;
  quantity: number;
  timestamp: number;
}

interface Trade {
  buyId: string;
  sellId: string;
  price: number;
  quantity: number;
}

class OrderBook {
  // Sorted in matching priority order: best price first.
  private readonly buys: Order[] = []; // desc by price, asc by time
  private readonly sells: Order[] = []; // asc by price, asc by time

  submit(order: Order): Trade[] {
    const trades: Trade[] = [];
    const opposite = order.side === "buy" ? this.sells : this.buys;
    const crosses = (resting: Order): boolean =>
      order.side === "buy" ? resting.price <= order.price : resting.price >= order.price;

    while (order.quantity > 0 && opposite.length > 0 && crosses(opposite[0])) {
      const top = opposite[0];
      const qty = Math.min(order.quantity, top.quantity);
      trades.push({
        buyId: order.side === "buy" ? order.id : top.id,
        sellId: order.side === "buy" ? top.id : order.id,
        price: top.price, // taker pays resting price
        quantity: qty,
      });
      top.quantity -= qty;
      order.quantity -= qty;
      if (top.quantity === 0) opposite.shift();
    }

    if (order.quantity > 0) this.rest(order);
    return trades;
  }

  cancel(id: string): boolean {
    for (const book of [this.buys, this.sells]) {
      const i = book.findIndex((o) => o.id === id);
      if (i !== -1) {
        book.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  private rest(order: Order): void {
    const book = order.side === "buy" ? this.buys : this.sells;
    const better = (a: Order, b: Order): boolean =>
      a.price === b.price
        ? a.timestamp < b.timestamp
        : order.side === "buy"
          ? a.price > b.price
          : a.price < b.price;
    const i = book.findIndex((existing) => !better(existing, order));
    if (i === -1) book.push(order);
    else book.splice(i, 0, order);
  }
}`,
      },
      {
        id: "pubsub",
        title: "Typed pub/sub",
        blurb:
          "Channel-based: each channel is its own bus. Sync delivery, ordered, easy to extend with persistence or async dispatch.",
        tags: ["system", "async"],
        code: `class PubSub<E extends Record<string, unknown>> {
  private readonly channels = new Map<keyof E, Set<(payload: never) => void>>();

  subscribe<K extends keyof E>(channel: K, handler: (payload: E[K]) => void): () => void {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(handler as (payload: never) => void);
    return () => {
      set!.delete(handler as (payload: never) => void);
      if (set!.size === 0) this.channels.delete(channel);
    };
  }

  publish<K extends keyof E>(channel: K, payload: E[K]): void {
    const set = this.channels.get(channel);
    if (!set) return;
    for (const handler of [...set]) (handler as (p: E[K]) => void)(payload);
  }
}`,
      },
      {
        id: "observable",
        title: "Mini Observable",
        blurb:
          "Push-based stream. Subscribe returns a teardown. Operators (map, filter) compose new Observables.",
        tags: ["async", "frontend"],
        code: `type Observer<T> = {
  next: (value: T) => void;
  error?: (err: unknown) => void;
  complete?: () => void;
};

class Observable<T> {
  constructor(private readonly producer: (observer: Observer<T>) => () => void) {}

  subscribe(observer: Observer<T>): () => void {
    return this.producer(observer);
  }

  map<U>(fn: (value: T) => U): Observable<U> {
    return new Observable<U>((observer) =>
      this.subscribe({
        next: (value) => {
          observer.next(fn(value));
        },
        error: observer.error,
        complete: observer.complete,
      }),
    );
  }

  filter(predicate: (value: T) => boolean): Observable<T> {
    return new Observable<T>((observer) =>
      this.subscribe({
        next: (value) => {
          if (predicate(value)) observer.next(value);
        },
        error: observer.error,
        complete: observer.complete,
      }),
    );
  }
}`,
      },
    ],
  },
];
