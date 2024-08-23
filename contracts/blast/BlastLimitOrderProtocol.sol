// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AbstractBlastContract.sol";
import "@1inch/limit-order-protocol-contract/contracts/LimitOrderProtocol.sol";

contract BlastLimitOrderProtocol is AbstractBlastContract, LimitOrderProtocol {
    /// @dev non-upgradeable constructor
    /// @param _weth the WETH contract
    constructor(IWETH _weth) LimitOrderProtocol(_weth) {
        __AbstractBlastContract_init();
        _configurePointsOperator(msg.sender);
    }

    /// @dev claim all gas
    function claimAllGas(address contractAddress, address recipientOfGas) external onlyOwner returns (uint256) {
        return _getBlast().claimAllGas(contractAddress, recipientOfGas);
    }
}