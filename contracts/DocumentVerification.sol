// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Blockchain-Based Document Verification and Trust Management System
/// @notice Stores a document's cryptographic fingerprint (SHA-256 hash) on-chain,
///         not the document itself, and lets anyone verify whether a document
///         they hold is authentic (unmodified) and who issued it.
contract DocumentVerification {

    /// @notice One record per registered document.
    struct DocumentRecord {
        string documentHash;   // SHA-256 hash of the document (hex string)
        string certificateId;  // human-readable ID, e.g. roll number / cert number
        address issuer;        // wallet address of whoever registered it
        uint256 timestamp;     // block time of registration
        bool exists;           // guards against uninitialized structs
    }

    /// @notice Only these wallet addresses are allowed to register documents.
    mapping(address => bool) public authorizedIssuers;

    /// @notice hash => record. This is the actual "ledger" of fingerprints.
    mapping(string => DocumentRecord) private documents;

    /// @notice Keeps a list of all hashes so the admin/UI can enumerate records.
    string[] private allHashes;

    address public admin;

    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event DocumentRegistered(
        string documentHash,
        string certificateId,
        address indexed issuer,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not an authorized issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
        // Deployer is automatically an authorized issuer so the system is usable immediately.
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorized(msg.sender);
    }

    /// @notice Admin can whitelist another wallet (e.g. a college registrar) as an issuer.
    function authorizeIssuer(address _issuer) external onlyAdmin {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }

    /// @notice Admin can remove an issuer's permission.
    function revokeIssuer(address _issuer) external onlyAdmin {
        authorizedIssuers[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }

    /// @notice Register a document's fingerprint on-chain. Called by the backend
    ///         right after it computes SHA-256 of the uploaded file.
    /// @param _documentHash SHA-256 hash of the document, as a hex string.
    /// @param _certificateId Any human-readable identifier for the document.
    function registerDocument(string memory _documentHash, string memory _certificateId)
        external
        onlyAuthorizedIssuer
    {
        require(bytes(_documentHash).length > 0, "Hash cannot be empty");
        require(!documents[_documentHash].exists, "Document already registered");

        documents[_documentHash] = DocumentRecord({
            documentHash: _documentHash,
            certificateId: _certificateId,
            issuer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        allHashes.push(_documentHash);

        emit DocumentRegistered(_documentHash, _certificateId, msg.sender, block.timestamp);
    }

    /// @notice Core verification check: does this hash exist on-chain?
    /// @return isValid true if the hash is registered
    /// @return certificateId the stored certificate ID (empty if not found)
    /// @return issuer the wallet that registered it (zero address if not found)
    /// @return timestamp when it was registered (0 if not found)
    function verifyDocument(string memory _documentHash)
        external
        view
        returns (bool isValid, string memory certificateId, address issuer, uint256 timestamp)
    {
        DocumentRecord memory record = documents[_documentHash];
        if (record.exists) {
            return (true, record.certificateId, record.issuer, record.timestamp);
        }
        return (false, "", address(0), 0);
    }

    /// @notice Total number of documents registered so far.
    function totalDocuments() external view returns (uint256) {
        return allHashes.length;
    }

    /// @notice Fetch a hash by its index — useful for an admin dashboard listing all records.
    function getHashAtIndex(uint256 index) external view returns (string memory) {
        require(index < allHashes.length, "Index out of range");
        return allHashes[index];
    }
}
