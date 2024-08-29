import chai from "chai";
import { StoryClient } from "../../src";
import { CancelDisputeRequest, RaiseDisputeRequest } from "../../src/index";
import { mockERC721, getStoryClient, getTokenId } from "./utils/util";
import chaiAsPromised from "chai-as-promised";
import { Address } from "viem";
import { MockERC20 } from "./utils/mockERC20";

chai.use(chaiAsPromised);
const expect = chai.expect;

const arbitrationPolicyAddress = "0xcaEC2bD1B1fD57bC47357F688f97d57387E68E25";
describe("Dispute Functions", () => {
  let clientA: StoryClient;
  let clientB: StoryClient;
  let disputeId: bigint;
  let ipIdB: Address;

  before(async () => {
    clientA = getStoryClient();
    clientB = getStoryClient();
    const mockERC20 = new MockERC20();
    await mockERC20.mint();
    await mockERC20.approve(arbitrationPolicyAddress);
    const tokenId = await getTokenId();
    ipIdB = (
      await clientB.ipAsset.register({
        nftContract: mockERC721,
        tokenId: tokenId!,
        txOptions: {
          waitForTransaction: true,
        },
      })
    ).ipId!;
  });

  it.only("should not throw error when raise a dispute", async () => {
    const raiseDisputeRequest: RaiseDisputeRequest = {
      targetIpId: ipIdB,
      arbitrationPolicy: arbitrationPolicyAddress,
      linkToDisputeEvidence: "foo",
      targetTag: "PLAGIARISM",
      txOptions: {
        waitForTransaction: true,
      },
    };
    const response = await clientA.dispute.raiseDispute(raiseDisputeRequest);
    disputeId = response.disputeId!;
    expect(response.txHash).to.be.a("string").and.not.empty;
    expect(response.disputeId).to.be.a("bigint");
  });

  it("should not throw error when cancel a dispute", async () => {
    const cancelDispute: CancelDisputeRequest = {
      disputeId: disputeId,
      txOptions: {
        waitForTransaction: true,
      },
    };
    const response = await clientA.dispute.cancelDispute(cancelDispute);
    expect(response.txHash).to.be.a("string").and.not.empty;
  });
});
