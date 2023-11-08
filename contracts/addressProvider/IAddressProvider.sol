// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../debt/IDebtController.sol";
import "../fees/IFeeController.sol";

interface IAddressProvider {

    /// @notice Returns the debt controller
    function getDebtController() external view returns (IDebtController);

    /// @notice Returns the fee controller
    function getFeeController() external view returns (IFeeController);
}