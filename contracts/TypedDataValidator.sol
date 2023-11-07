// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IWasabiPerps.sol";

abstract contract TypedDataValidator {
    bytes32 public immutable INITIAL_DOMAIN_SEPARATOR;

    constructor(string memory name) {
        INITIAL_DOMAIN_SEPARATOR = _computeDomainSeparator(name);
    }

    /// @notice Compute domain separator for EIP-712.
    /// @return The domain separator.
    function _computeDomainSeparator(string memory name) private view returns (bytes32) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return
            keccak256(
                abi.encode(
                    keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                    keccak256(bytes(name)),
                    keccak256(bytes("1")),
                    chainId,
                    address(this)
                )
            );
    }

    /// @notice Checks if the signer for the given structHash and signature is the expected signer
    /// @param _expectedSigner the expected signer
    /// @param _structHash the struct hash
    /// @param _signature the signature
    function validateSignature(
        address _expectedSigner, bytes32 _structHash, IWasabiPerps.Signature calldata _signature
    ) internal view {
        bytes32 typedDataHash = keccak256(abi.encodePacked("\x19\x01", INITIAL_DOMAIN_SEPARATOR, _structHash));
        address signer = ecrecover(typedDataHash, _signature.v, _signature.r, _signature.s);
        if (_expectedSigner != signer) {
            revert IWasabiPerps.InvalidSignature();
        }
    }
}