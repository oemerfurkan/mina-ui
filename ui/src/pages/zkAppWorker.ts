import { Mina, PublicKey, fetchAccount, Field } from "o1js";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import {
  Airdrop,
  HumanIDWitness,
  Signatures,
} from "../../../contracts/build/src/Airdrop";
import { MerkleTree, PrivateKey, Signature } from "o1js";

const state = {
  Airdrop: null as null | typeof Airdrop,
  zkapp: null as null | Airdrop,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToDevnet: async (args: {}) => {
    const Network = Mina.Network(
      'https://api.minascan.io/node/devnet/v1/graphql'
    );
    console.log("Devnet network instance configured.");
    Mina.setActiveInstance(Network);
  },
  loadContract: async (args: {}) => {
    const { Airdrop } = await import("../../../contracts/build/src/Airdrop.js");
    state.Airdrop = Airdrop;
  },
  compileContract: async (args: {}) => {
    await state.Airdrop!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.Airdrop!(publicKey);
  },
  getTreeRoot: async (args: {}) => {
    const currentTreeRoot = state.zkapp!.treeRoot.get();
    return JSON.stringify(currentTreeRoot.toJSON());
  },
  claimReward: async (args: {
    humanIDv1: Field;
    sigs: Signatures;
    witness: HumanIDWitness;
  }) => {
    await state.zkapp!.claimReward(args.humanIDv1, args.sigs, args.witness);
  },
  createClaimTransaction: async (args: {feePayer: PublicKey}) => {
    const transaction = await Mina.transaction(PublicKey.fromBase58("B62qku2ZHH6S5MArxe2GqH1HCc3WfVfnYwMWRHY3aPvV2bPXvi6TpxE"), async () => {
        await state.zkapp!.claimReward(id1, sigs, witness);
      }
    );
    state.transaction = transaction;
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== "undefined") {
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

let tree = new MerkleTree(33);
export const id1 = Field(100);
const privKey1 = PrivateKey.fromBigInt(1n);
const privKey2 = PrivateKey.fromBigInt(2n);
const privKey3 = PrivateKey.fromBigInt(3n);

export const sigs = new Signatures({
  sig1: Signature.create(privKey1, [
    id1,
    PublicKey.fromBase58(
      "B62qku2ZHH6S5MArxe2GqH1HCc3WfVfnYwMWRHY3aPvV2bPXvi6TpxE"
    ).x.add(
      PublicKey.fromBase58(
        "B62qku2ZHH6S5MArxe2GqH1HCc3WfVfnYwMWRHY3aPvV2bPXvi6TpxE"
      ).isOdd.toField()
    ),
  ]),
  sig2: Signature.create(privKey2, [
    id1,
    PublicKey.fromBase58(
      "B62qku2ZHH6S5MArxe2GqH1HCc3WfVfnYwMWRHY3aPvV2bPXvi6TpxE"
    ).x.add(
      PublicKey.fromBase58(
        "B62qku2ZHH6S5MArxe2GqH1HCc3WfVfnYwMWRHY3aPvV2bPXvi6TpxE"
      ).isOdd.toField()
    ),
  ]),
  sig3: Signature.create(privKey3, [
    id1,
    PublicKey.fromBase58(
      "B62qku2ZHH6S5MArxe2GqH1HCc3WfVfnYwMWRHY3aPvV2bPXvi6TpxE"
    ).x.add(
      PublicKey.fromBase58(
        "B62qku2ZHH6S5MArxe2GqH1HCc3WfVfnYwMWRHY3aPvV2bPXvi6TpxE"
      ).isOdd.toField()
    ),
  ]),
});

export const witness = new HumanIDWitness(tree.getWitness(100n));

console.log("Web Worker Successfully Initialized.");
