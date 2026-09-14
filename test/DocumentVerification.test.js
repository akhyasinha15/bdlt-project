const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentVerification", function () {
  let contract, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DocumentVerification");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  it("registers a document and verifies it as authentic", async function () {
    const hash = "abc123hash";
    await contract.registerDocument(hash, "CERT-001");

    const [isValid, certId, issuer] = await contract.verifyDocument(hash);
    expect(isValid).to.equal(true);
    expect(certId).to.equal("CERT-001");
    expect(issuer).to.equal(owner.address);
  });

  it("reports a tampered/unregistered document as invalid", async function () {
    const [isValid] = await contract.verifyDocument("some-hash-that-was-never-registered");
    expect(isValid).to.equal(false);
  });

  it("prevents unauthorized wallets from registering documents", async function () {
    await expect(
      contract.connect(other).registerDocument("hash2", "CERT-002")
    ).to.be.revertedWith("Not an authorized issuer");
  });

  it("prevents registering the same hash twice", async function () {
    await contract.registerDocument("dup-hash", "CERT-003");
    await expect(
      contract.registerDocument("dup-hash", "CERT-003")
    ).to.be.revertedWith("Document already registered");
  });

  it("lets admin authorize a new issuer, who can then register documents", async function () {
    await contract.authorizeIssuer(other.address);
    await contract.connect(other).registerDocument("hash-by-other", "CERT-004");

    const [isValid, , issuer] = await contract.verifyDocument("hash-by-other");
    expect(isValid).to.equal(true);
    expect(issuer).to.equal(other.address);
  });
});
