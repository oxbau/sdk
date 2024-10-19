import chai from "chai";
import { createMock } from "../testUtils";
import * as sinon from "sinon";
import { LicenseClient } from "../../../src";
import { PublicClient, WalletClient, Account, zeroAddress, Hex } from "viem";
import chaiAsPromised from "chai-as-promised";
import {
  PiLicenseTemplateGetLicenseTermsResponse,
  RoyaltyPolicyLapClient,
} from "../../../src/abi/generated";
import { LicenseTerms } from "../../../src/types/resources/license";
import { MockERC20 } from "../../integration/utils/mockERC20";
chai.use(chaiAsPromised);
const expect = chai.expect;
const txHash = "0x129f7dd802200f096221dd89d5b086e4bd3ad6eafb378a0c75e3b04fc375f997";

describe("Test LicenseClient", () => {
  let licenseClient: LicenseClient;
  let rpcMock: PublicClient;
  let walletMock: WalletClient;

  beforeEach(() => {
    rpcMock = createMock<PublicClient>();
    walletMock = createMock<WalletClient>();
    const accountMock = createMock<Account>();
    accountMock.address = "0x73fcb515cee99e4991465ef586cfe2b072ebb512";
    walletMock.account = accountMock;
    licenseClient = new LicenseClient(rpcMock, walletMock);
    licenseClient.royaltyPolicyLAPClient = new RoyaltyPolicyLapClient(
      rpcMock,
      walletMock,
      zeroAddress,
    );

    expect(licenseClient.licensingModuleClient).to.exist;
    expect(licenseClient.licenseRegistryClient).to.exist;
    expect(licenseClient.piLicenseTemplateReadOnlyClient).to.exist;
    expect(licenseClient.licenseTemplateClient).to.exist;
    expect(licenseClient.royaltyPolicyLAPClient).to.exist;
    expect(licenseClient.royaltyModuleReadOnlyClient).to.exist;
    expect(licenseClient.licenseRegistryReadOnlyClient).to.exist;
    expect(licenseClient.ipAssetRegistryClient).to.exist;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("Test licenseClient.registerPILTerms", async () => {
    const licenseTerms: LicenseTerms = {
      defaultMintingFee: 1513n,
      currency: MockERC20.address,
      royaltyPolicy: zeroAddress,
      transferable: false,
      expiration: 0n,
      commercialUse: false,
      commercialAttribution: false,
      commercializerChecker: zeroAddress,
      commercializerCheckerData: "0x",
      commercialRevShare: 0,
      commercialRevCeiling: 0n,
      derivativesAllowed: false,
      derivativesAttribution: false,
      derivativesApproval: false,
      derivativesReciprocal: false,
      derivativeRevCeiling: 0n,
      uri: "",
    };

    it("should throw royalty error when call registerRILTerms with invalid royalty policy address", async () => {
      await expect(
        licenseClient.registerPILTerms({
          ...licenseTerms,
          royaltyPolicy: "0x",
        }),
      ).to.be.rejectedWith(
        "Failed to register license terms: request.royaltyPolicy address is invalid: 0x, Address must be a hex value of 20 bytes (40 hex characters) and match its checksum counterpart.",
      );
    });

    it("should throw royalty whitelist error when call registerRILTerms with invalid royalty whitelist address", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(false);
      await expect(
        licenseClient.registerPILTerms({
          ...licenseTerms,
          royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
        }),
      ).to.be.rejectedWith(
        "Failed to register license terms: The royalty policy is not whitelisted.",
      );
    });

    it("should throw currency error when call registerRILTerms with invalid currency address", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      await expect(
        licenseClient.registerPILTerms({
          ...licenseTerms,
          currency: "0x",
        }),
      ).to.be.rejectedWith(
        "Failed to register license terms: request.currency address is invalid: 0x, Address must be a hex value of 20 bytes (40 hex characters) and match its checksum counterpart.",
      );
    });

    it("should throw currency whitelist error when call registerRILTerms with invalid currency whitelist address", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(false);
      await expect(
        licenseClient.registerPILTerms({
          ...licenseTerms,
          currency: MockERC20.address,
        }),
      ).to.be.rejectedWith(
        "Failed to register license terms: The currency token is not whitelisted.",
      );
    });

    it("should throw royalty policy requires currency token error when call registerRILTerms given royaltyPolicy is not zero address and current is zero address", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(true);
      await expect(
        licenseClient.registerPILTerms({
          ...licenseTerms,
          currency: zeroAddress,
          royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
        }),
      ).to.be.rejectedWith(
        "Failed to register license terms: Royalty policy requires currency token.",
      );
    });

    // Test registerPILTerms - @boris added test cases

    it("should handle unexpected errors in registerPILTerms gracefully", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .throws(new Error("Unexpected Error"));

      try {
        await licenseClient.registerPILTerms({
          defaultMintingFee: 1n,
          currency: zeroAddress,
          royaltyPolicy: zeroAddress,
          transferable: true,
          expiration: 0n,
          commercialUse: true,
          commercialAttribution: false,
          commercializerChecker: zeroAddress,
          commercializerCheckerData: "0x",
          commercialRevShare: 0,
          commercialRevCeiling: 0n,
          derivativesAllowed: false,
          derivativesAttribution: false,
          derivativesApproval: false,
          derivativesReciprocal: false,
          derivativeRevCeiling: 0n,
          uri: "",
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to register license terms: Royalty policy is required when commercial use is enabled.",
        );
      }
    });

    describe("verify commercial use", () => {
      beforeEach(() => {
        sinon
          .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
          .resolves(true);
        sinon
          .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
          .resolves(true);
      });
      it("should throw commercialAttribution error when call registerRILTerms given commercialUse is false and commercialAttribution is true", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: false,
            commercialAttribution: true,
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add commercial attribution when commercial use is disabled.",
        );
      });

      it("should throw commercializerChecker error when call registerRILTerms given commercialUse is false and commercialChecker is not zero address", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: false,
            commercializerChecker: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add commercializerChecker when commercial use is disabled.",
        );
      });
      it("should throw commercialRevShare error when call registerRILTerms given commercialUse is false and commercialRevShare is more than 0 ", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: false,
            commercializerChecker: zeroAddress,
            commercialRevShare: 1,
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add commercial revenue share when commercial use is disabled.",
        );
      });

      it("should throw commercialRevCeiling error when call registerRILTerms given commercialUse is false and commercialRevCeiling is more than 0", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: false,
            commercialRevCeiling: 1,
            commercializerChecker: zeroAddress,
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add commercial revenue ceiling when commercial use is disabled.",
        );
      });

      it("should throw derivativeRevCeiling error when call registerRILTerms given commercialUse is false and derivativeRevCeiling is more than 0", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: false,
            derivativeRevCeiling: 1,
            commercializerChecker: zeroAddress,
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add derivative revenue ceiling share when commercial use is disabled.",
        );
      });

      it("should throw royaltyPolicy error when call registerRILTerms given commercialUse is false and royaltyPolicy is not zero address", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: false,
            royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
            commercializerChecker: zeroAddress,
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add commercial royalty policy when commercial use is disabled.",
        );
      });

      it("should throw royaltyPolicy error when call registerRILTerms given commercialUse is true and royaltyPolicy is zero address", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: true,
            royaltyPolicy: zeroAddress,
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Royalty policy is required when commercial use is enabled.",
        );
      });
    });

    describe("verify derivatives", () => {
      beforeEach(() => {
        sinon
          .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
          .resolves(true);
        sinon
          .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
          .resolves(true);
      });
      it("should throw derivativesAttribution error when call registerRILTerms given derivativesAllowed is false and derivativesAttribution is true", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: true,
            derivativesAllowed: false,
            derivativesAttribution: true,
            royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add derivative attribution when derivative use is disabled.",
        );
      });

      it("should throw derivativesApproval error when call registerRILTerms given derivativesAllowed is false and derivativesApproval is true", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: true,
            derivativesAllowed: false,
            derivativesApproval: true,
            royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add derivative approval when derivative use is disabled.",
        );
      });

      it("should throw derivativesReciprocal error when call registerRILTerms given derivativesAllowed is false and derivativesReciprocal is true", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: true,
            derivativesAllowed: false,
            derivativesReciprocal: true,
            royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add derivative reciprocal when derivative use is disabled.",
        );
      });

      it("should throw derivativeRevCeiling error when call registerRILTerms given derivativesAllowed is false and derivativeRevCeiling is more than 0", async () => {
        await expect(
          licenseClient.registerPILTerms({
            ...licenseTerms,
            commercialUse: true,
            derivativesAllowed: false,
            derivativeRevCeiling: 1,
            royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
          }),
        ).to.be.rejectedWith(
          "Failed to register license terms: Cannot add derivative revenue ceiling when derivative use is disabled.",
        );
      });
    });

    it("should return directly licenseTermsId when call registerPILTerms given request have already registered", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(true);
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(1) });

      const result = await licenseClient.registerPILTerms(licenseTerms);

      expect(result.licenseTermsId).to.equal(1n);
      expect(result.txHash).to.equal(undefined);
    });

    it("should throw commercialRevShare error when call registerPILTerms given commercialRevShare is more than 100", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(true);
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      await expect(
        licenseClient.registerPILTerms({
          ...licenseTerms,
          commercialUse: true,
          defaultMintingFee: 1,
          currency: MockERC20.address,
          commercialRevShare: 101,
          royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
        }),
      ).to.be.rejectedWith(
        "Failed to register license terms: CommercialRevShare should be between 0 and 100.",
      );
    });
    it("should throw commercialRevShare error when call registerPILTerms given commercialRevShare is less than 0", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(true);
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      await expect(
        licenseClient.registerPILTerms({
          ...licenseTerms,
          commercialUse: true,
          defaultMintingFee: 1,
          currency: MockERC20.address,
          commercialRevShare: -1,
          royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
        }),
      ).to.be.rejectedWith(
        "Failed to register license terms: CommercialRevShare should be between 0 and 100.",
      );
    });
    it("should return encodedTxData when call registerPILTerms given txOptions.encodedTxDataOnly of true and args is correct", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(true);
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon
        .stub(licenseClient.licenseTemplateClient, "registerLicenseTermsEncode")
        .returns({ to: zeroAddress, data: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c" });

      const result = await licenseClient.registerPILTerms({
        ...licenseTerms,
        txOptions: {
          encodedTxDataOnly: true,
        },
      });
      expect(result.encodedTxData).to.deep.equal({
        to: zeroAddress,
        data: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
      });
    });

    it("should return txHash when call registerPILTerms given args is correct", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(true);
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);
      sinon
        .stub(licenseClient.licenseTemplateClient, "parseTxLicenseTermsRegisteredEvent")
        .returns([
          {
            licenseTermsId: BigInt(1),
            licenseTemplate: zeroAddress,
            licenseTerms: zeroAddress,
          },
        ]);

      const result = await licenseClient.registerPILTerms({
        ...licenseTerms,
      });

      expect(result.txHash).to.equal(txHash);
    });

    it("should return txHash when call registerPILTerms given args is correct and waitForTransaction of true", async () => {
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyPolicy")
        .resolves(true);
      sinon
        .stub(licenseClient.royaltyModuleReadOnlyClient, "isWhitelistedRoyaltyToken")
        .resolves(true);
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);
      sinon
        .stub(licenseClient.licenseTemplateClient, "parseTxLicenseTermsRegisteredEvent")
        .returns([
          {
            licenseTermsId: BigInt(1),
            licenseTemplate: zeroAddress,
            licenseTerms: zeroAddress,
          },
        ]);

      const result = await licenseClient.registerPILTerms({
        ...licenseTerms,
        commercialUse: true,
        defaultMintingFee: 1,
        currency: MockERC20.address,
        commercialRevShare: 90,
        royaltyPolicy: "0x1daAE3197Bc469Cb97B917aa460a12dD95c6627c",
        txOptions: {
          waitForTransaction: true,
        },
      });

      expect(result.txHash).to.equal(txHash);
      expect(result.licenseTermsId).to.equal(1n);
    });
  });
  describe("Test licenseClient.registerNonComSocialRemixingPIL", async () => {
    it("should return licenseTermsId when call registerNonComSocialRemixingPIL given licenseTermsId is registered", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(1) });

      const result = await licenseClient.registerNonComSocialRemixingPIL();

      expect(result.licenseTermsId).to.equal(1n);
    });

    it("should return txhash when call registerNonComSocialRemixingPIL given licenseTermsId is not registered", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);

      const result = await licenseClient.registerNonComSocialRemixingPIL();

      expect(result.txHash).to.equal(txHash);
    });
    it("should return txhash when call registerNonComSocialRemixingPIL given licenseTermsId is not registered and waitForTransaction of true", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);
      sinon
        .stub(licenseClient.licenseTemplateClient, "parseTxLicenseTermsRegisteredEvent")
        .returns([
          {
            licenseTermsId: BigInt(1),
            licenseTemplate: zeroAddress,
            licenseTerms: zeroAddress,
          },
        ]);

      const result = await licenseClient.registerNonComSocialRemixingPIL({
        txOptions: {
          waitForTransaction: true,
        },
      });

      expect(result.txHash).to.equal(txHash);
      expect(result.licenseTermsId).to.equal(1n);
    });
    it("should return throw error when call registerNonComSocialRemixingPIL given request fail", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon
        .stub(licenseClient.licenseTemplateClient, "registerLicenseTerms")
        .throws(new Error("request fail."));
      try {
        await licenseClient.registerNonComSocialRemixingPIL({
          txOptions: {
            waitForTransaction: true,
          },
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to register non commercial social remixing PIL: request fail.",
        );
      }
    });
  });

  describe("Test licenseClient.registerCommercialUsePIL", async () => {
    it("should return licenseTermsId when call registerCommercialUsePIL given licenseTermsId is registered", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(1) });

      const result = await licenseClient.registerCommercialUsePIL({
        defaultMintingFee: 1,
        currency: zeroAddress,
      });

      expect(result.licenseTermsId).to.equal(1n);
    });

    it("should return txhash when call registerCommercialUsePIL given licenseTermsId is not registered", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);

      const result = await licenseClient.registerCommercialUsePIL({
        defaultMintingFee: "1",
        currency: zeroAddress,
      });

      expect(result.txHash).to.equal(txHash);
    });

    it("should return txhash when call registerCommercialUsePIL given licenseTermsId is not registered and waitForTransaction of true", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);
      sinon
        .stub(licenseClient.licenseTemplateClient, "parseTxLicenseTermsRegisteredEvent")
        .returns([
          {
            licenseTermsId: BigInt(1),
            licenseTemplate: zeroAddress,
            licenseTerms: zeroAddress,
          },
        ]);

      const result = await licenseClient.registerCommercialUsePIL({
        defaultMintingFee: "1",
        currency: zeroAddress,
        txOptions: {
          waitForTransaction: true,
        },
      });

      expect(result.txHash).to.equal(txHash);
      expect(result.licenseTermsId).to.equal(1n);
    });

    it("should return throw error when call registerCommercialUsePIL given request fail", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon
        .stub(licenseClient.licenseTemplateClient, "registerLicenseTerms")
        .throws(new Error("request fail."));

      try {
        await licenseClient.registerCommercialUsePIL({
          defaultMintingFee: "1",
          currency: zeroAddress,
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to register commercial use PIL: request fail.",
        );
      }
    });
  });

  describe("Test licenseClient.registerCommercialRemixPIL", async () => {
    it("should return licenseTermsId when call registerCommercialRemixPIL given licenseTermsId is registered", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(1) });

      const result = await licenseClient.registerCommercialRemixPIL({
        defaultMintingFee: "1",
        commercialRevShare: 100,
        currency: zeroAddress,
      });

      expect(result.licenseTermsId).to.equal(1n);
    });

    it("should return txhash when call registerCommercialRemixPIL given licenseTermsId is not registered", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);

      const result = await licenseClient.registerCommercialRemixPIL({
        defaultMintingFee: "1",
        commercialRevShare: 100,
        currency: zeroAddress,
      });

      expect(result.txHash).to.equal(txHash);
    });

    it("should return txhash when call registerCommercialRemixPIL given licenseTermsId is not registered and waitForTransaction of true", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon.stub(licenseClient.licenseTemplateClient, "registerLicenseTerms").resolves(txHash);
      sinon
        .stub(licenseClient.licenseTemplateClient, "parseTxLicenseTermsRegisteredEvent")
        .returns([
          {
            licenseTermsId: BigInt(1),
            licenseTemplate: zeroAddress,
            licenseTerms: zeroAddress,
          },
        ]);

      const result = await licenseClient.registerCommercialRemixPIL({
        defaultMintingFee: "1",
        commercialRevShare: 100,
        currency: zeroAddress,
        txOptions: {
          waitForTransaction: true,
        },
      });

      expect(result.txHash).to.equal(txHash);
      expect(result.licenseTermsId).to.equal(1n);
    });

    it("should return throw error when call registerCommercialRemixPIL given request fail", async () => {
      sinon
        .stub(licenseClient.licenseTemplateClient, "getLicenseTermsId")
        .resolves({ selectedLicenseTermsId: BigInt(0) });
      sinon
        .stub(licenseClient.licenseTemplateClient, "registerLicenseTerms")
        .throws(new Error("request fail."));

      try {
        await licenseClient.registerCommercialRemixPIL({
          defaultMintingFee: "1",
          commercialRevShare: 100,
          currency: zeroAddress,
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to register commercial remix PIL: request fail.",
        );
      }
    });
  });

  describe("Test licenseClient.attachLicenseTerms", async () => {
    it("should throw ipId is not registered when call attachLicenseTerms given ipId is not registered", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(false);

      try {
        await licenseClient.attachLicenseTerms({
          ipId: zeroAddress,
          licenseTermsId: "1",
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to attach license terms: The IP with id 0x0000000000000000000000000000000000000000 is not registered.",
        );
      }
    });

    it("should throw licenseTermsId error when call attachLicenseTerms given licenseTermsId is not exist", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(false);

      try {
        await licenseClient.attachLicenseTerms({
          ipId: zeroAddress,
          licenseTermsId: "1",
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to attach license terms: License terms id 1 do not exist.",
        );
      }
    });

    it("should return txHash of empty and success of false when call attachLicenseTerms given licenseTermsId is already attached", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(true);
      const result = await licenseClient.attachLicenseTerms({
        ipId: zeroAddress,
        licenseTermsId: "1",
      });
      expect(result).to.deep.equal({
        txHash: "",
        success: false,
      });
    });

    it("should return txHash when call attachLicenseTerms given args is correct", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(false);
      sinon.stub(licenseClient.licensingModuleClient, "attachLicenseTerms").resolves(txHash);

      const result = await licenseClient.attachLicenseTerms({
        ipId: zeroAddress,
        licenseTermsId: "1",
      });

      expect(result.txHash).to.equal(txHash);
    });

    it("should throw invalid address when call when call attachLicenseTerms given a invalid licenseTemplate address", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(true);

      try {
        await licenseClient.attachLicenseTerms({
          ipId: zeroAddress,
          licenseTermsId: "1",
          licenseTemplate: "invalid address" as Hex,
        });
      } catch (error) {
        expect((error as Error).message).equal(
          `Failed to attach license terms: request.licenseTemplate address is invalid: invalid address, Address must be a hex value of 20 bytes (40 hex characters) and match its checksum counterpart.`,
        );
      }
    });
    it("should return txHash when call attachLicenseTerms given args is correct and waitForTransaction of true", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(false);
      sinon.stub(licenseClient.licensingModuleClient, "attachLicenseTerms").resolves(txHash);

      const result = await licenseClient.attachLicenseTerms({
        ipId: zeroAddress,
        licenseTermsId: "1",
        txOptions: {
          waitForTransaction: true,
        },
      });

      expect(result.txHash).to.equal(txHash);
    });

    // Test attachLicenseTokens - @boris added test cases

    it("should throw error when attachLicenseTerms is called with an invalid license template", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(false);

      await expect(
        licenseClient.attachLicenseTerms({
          ipId: zeroAddress,
          licenseTermsId: "1",
          licenseTemplate: "invalid_address" as Hex,
        }),
      ).to.be.rejectedWith(
        "Failed to attach license terms: request.licenseTemplate address is invalid: invalid_address, Address must be a hex value of 20 bytes (40 hex characters) and match its checksum counterpart.",
      );
    });
  });

  describe("Test licenseClient.mintLicenseTokens", async () => {
    it("should throw licensor ipId error when call mintLicenseTokens given licensorIpId is not registered", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(false);

      try {
        await licenseClient.mintLicenseTokens({
          licensorIpId: zeroAddress,
          licenseTermsId: "1",
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to mint license tokens: The licensor IP with id 0x0000000000000000000000000000000000000000 is not registered.",
        );
      }
    });

    it("should throw invalid address when call mintLicenseTokens given invalid licenseTemplate address", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);

      try {
        await licenseClient.mintLicenseTokens({
          licensorIpId: zeroAddress,
          licenseTermsId: "1",
          licenseTemplate: "invalid address" as Hex,
        });
      } catch (error) {
        expect((error as Error).message).equal(
          `Failed to mint license tokens: request.licenseTemplate address is invalid: invalid address, Address must be a hex value of 20 bytes (40 hex characters) and match its checksum counterpart.`,
        );
      }
    });

    it("should throw invalid address when call mintLicenseTokens given invalid receiver address", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(true);

      try {
        await licenseClient.mintLicenseTokens({
          licensorIpId: zeroAddress,
          licenseTermsId: "1",
          receiver: "invalid address" as Hex,
        });
      } catch (error) {
        expect((error as Error).message).equal(
          `Failed to mint license tokens: request.receiver address is invalid: invalid address, Address must be a hex value of 20 bytes (40 hex characters) and match its checksum counterpart.`,
        );
      }
    });

    it("should throw licenseTermsId error when call mintLicenseTokens given licenseTermsId is not exist", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(false);

      try {
        await licenseClient.mintLicenseTokens({
          licensorIpId: zeroAddress,
          licenseTermsId: "1",
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to mint license tokens: License terms id 1 do not exist.",
        );
      }
    });

    it("should throw attached error when call mintLicenseTokens given licenseTermsId is not attached", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(false);

      try {
        await licenseClient.mintLicenseTokens({
          licensorIpId: zeroAddress,
          licenseTermsId: "1",
        });
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to mint license tokens: License terms id 1 is not attached to the IP with id 0x0000000000000000000000000000000000000000.",
        );
      }
    });

    it("should return txHash when call mintLicenseTokens given args is correct", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(true);
      sinon.stub(licenseClient.licensingModuleClient, "mintLicenseTokens").resolves(txHash);

      const result = await licenseClient.mintLicenseTokens({
        licensorIpId: zeroAddress,
        licenseTermsId: "1",
      });

      expect(result.txHash).to.equal(txHash);
    });

    it("should return txHash when call mintLicenseTokens given args is correct and waitForTransaction of true", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(true);
      sinon.stub(licenseClient.licensingModuleClient, "mintLicenseTokens").resolves(txHash);
      sinon.stub(licenseClient.licensingModuleClient, "parseTxLicenseTokensMintedEvent").returns([
        {
          caller: zeroAddress,
          licensorIpId: zeroAddress,
          licenseTemplate: zeroAddress,
          licenseTermsId: BigInt(1),
          amount: BigInt(1),
          receiver: zeroAddress,
          startLicenseTokenId: BigInt(1),
        },
      ]);

      const result = await licenseClient.mintLicenseTokens({
        licensorIpId: zeroAddress,
        licenseTermsId: "1",
        txOptions: {
          waitForTransaction: true,
        },
      });

      expect(result.txHash).to.equal(txHash);
      expect(result.licenseTokenIds).to.deep.equal([1n]);
    });

    it("should return txHash when call mintLicenseTokens given args is correct and waitForTransaction of true, amount of 5", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(true);
      sinon.stub(licenseClient.licensingModuleClient, "mintLicenseTokens").resolves(txHash);
      sinon.stub(licenseClient.licensingModuleClient, "parseTxLicenseTokensMintedEvent").returns([
        {
          caller: zeroAddress,
          licensorIpId: zeroAddress,
          licenseTemplate: zeroAddress,
          licenseTermsId: BigInt(1),
          amount: BigInt(1),
          receiver: zeroAddress,
          startLicenseTokenId: BigInt(1),
        },
      ]);

      const result = await licenseClient.mintLicenseTokens({
        licensorIpId: zeroAddress,
        licenseTermsId: "1",
        amount: 5,
        txOptions: {
          waitForTransaction: true,
        },
      });

      expect(result.txHash).to.equal(txHash);
      expect(result.licenseTokenIds).to.deep.equal([1n, 2n, 3n, 4n, 5n]);
    });

    // Test mintLicenseTokens - @boris added test cases

    // Failing - should it fail with amount 0?
    it.skip("should throw error when mintLicenseTokens is called with amount 0", async () => {
      sinon.stub(licenseClient.ipAssetRegistryClient, "isRegistered").resolves(true);
      sinon.stub(licenseClient.piLicenseTemplateReadOnlyClient, "exists").resolves(true);
      sinon
        .stub(licenseClient.licenseRegistryReadOnlyClient, "hasIpAttachedLicenseTerms")
        .resolves(true);
      sinon.stub(licenseClient.licensingModuleClient, "mintLicenseTokens").resolves(txHash);
      await expect(
        licenseClient.mintLicenseTokens({
          licensorIpId: zeroAddress,
          licenseTermsId: "1",
          amount: 0,
        }),
      ).to.be.rejectedWith("Failed to mint license tokens: Amount must be greater than 0.");
    });
  });

  describe("Test licenseClient.getLicenseTerms", async () => {
    it("should return license terms when call getLicenseTerms given licenseTermsId is exist", async () => {
      const mockLicenseTermsResponse: PiLicenseTemplateGetLicenseTermsResponse = {
        terms: {
          transferable: true,
          royaltyPolicy: zeroAddress,
          defaultMintingFee: BigInt(1),
          expiration: BigInt(1),
          commercialUse: true,
          commercialAttribution: true,
          commercializerChecker: zeroAddress,
          commercializerCheckerData: zeroAddress,
          commercialRevShare: 100,
          commercialRevCeiling: BigInt(1),
          derivativesAllowed: true,
          derivativesAttribution: true,
          derivativesApproval: true,
          derivativesReciprocal: true,
          derivativeRevCeiling: BigInt(1),
          currency: zeroAddress,
          uri: "string",
        },
      };
      sinon
        .stub(licenseClient.piLicenseTemplateReadOnlyClient, "getLicenseTerms")
        .resolves(mockLicenseTermsResponse);

      const result = await licenseClient.getLicenseTerms("1");

      expect(result).to.equal(mockLicenseTermsResponse);
    });

    it("should throw error when call getLicenseTerms given licenseTermsId is not exist", async () => {
      sinon
        .stub(licenseClient.piLicenseTemplateReadOnlyClient, "getLicenseTerms")
        .throws(new Error("Given licenseTermsId is not exist."));

      try {
        await licenseClient.getLicenseTerms("1");
      } catch (error) {
        expect((error as Error).message).equal(
          "Failed to get license terms: Given licenseTermsId is not exist.",
        );
      }
    });
  });

  // Test getLicenseTokens - @boris added test cases

  it("should throw error when getLicenseTerms is called with non-existent license terms id", async () => {
    sinon
      .stub(licenseClient.piLicenseTemplateReadOnlyClient, "getLicenseTerms")
      .throws(new Error("License terms not found"));

    await expect(licenseClient.getLicenseTerms("9999999999999")).to.be.rejectedWith(
      "Failed to get license terms: License terms not found",
    );
  });
});
