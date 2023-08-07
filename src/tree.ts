import { MerkleProof, Poseidon } from "@personaelabs/spartan-ecdsa";
import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree";

/**
 * Slightly updated class to allow bulk insertion of leaves. Original from https://github.com/personaelabs/spartan-ecdsa/blob/5dae5e1aa4eda726ddffc08eaec0144d003a98a0/packages/lib/src/helpers/tree.ts#L5
 */
export default class Tree {
  depth: number;
  poseidon: Poseidon;
  private treeInner!: IncrementalMerkleTree;

  constructor(depth: number, poseidon: Poseidon, leaves?: bigint[]) {
    this.depth = depth;

    this.poseidon = poseidon;
    const hash = poseidon.hash.bind(poseidon);
    const arity = 2;
    this.treeInner = leaves
      ? new IncrementalMerkleTree(hash, this.depth, BigInt(0), arity, leaves)
      : new IncrementalMerkleTree(hash, this.depth, BigInt(0));
  }

  insert(leaf: bigint) {
    this.treeInner.insert(leaf);
  }

  delete(index: number) {
    this.treeInner.delete(index);
  }

  leaves(): bigint[] {
    return this.treeInner.leaves;
  }

  root(): bigint {
    return this.treeInner.root;
  }

  indexOf(leaf: bigint): number {
    return this.treeInner.indexOf(leaf);
  }

  createProof(index: number): MerkleProof {
    const proof = this.treeInner.createProof(index);
    return {
      siblings: proof.siblings,
      pathIndices: proof.pathIndices,
      root: proof.root,
    };
  }

  verifyProof(proof: MerkleProof, leaf: bigint): boolean {
    return this.treeInner.verifyProof({ ...proof, leaf });
  }
}
