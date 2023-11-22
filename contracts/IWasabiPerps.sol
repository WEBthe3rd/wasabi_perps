// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./vaults/IWasabiVault.sol";

interface IWasabiPerps {

    error LiquidationThresholdNotReached();
    error InvalidSignature();
    error PositionAlreadyTaken();
    error SwapFunctionNeeded();
    error OrderExpired();
    error InvalidCurrency();
    error InvalidTargetCurrency();
    error InsufficientAmountProvided();
    error PrincipalTooHigh();
    error InsufficientAvailablePrincipal();
    error InsufficientCollateralReceived();
    error SenderNotTrader();
    error InvalidPosition();
    error IncorrectSwapParameter();
    error EthTransferFailed(uint256 amount, address _target);
    error InvalidVault();
    error VaultAlreadyExists();
    error WithdrawerNotVault();
    error WithdrawalNotAllowed();

    event PositionOpened(
        uint256 positionId,
        address trader,
        address currency,
        address collateralCurrency,
        uint256 downPayment,
        uint256 principal,
        uint256 collateralAmount,
        uint256 feesToBePaid
    );

    event PositionClosed(
        uint256 id,
        address trader,
        uint256 payout,
        uint256 principalRepaid,
        uint256 interestPaid,
        uint256 feeAmount
    );

    event PositionLiquidated(
        uint256 id,
        address trader,
        uint256 payout,
        uint256 principalRepaid,
        uint256 interestPaid,
        uint256 feeAmount
    );

    /// @notice Emitted when a new vault is created
    event NewVault(address indexed pool, address indexed asset, address vault);

    /// @notice Defines a function call
    struct FunctionCallData {
        address to;
        uint256 value;
        bytes data;
    }

    /// @notice Defines a position
    /// @param id The unique identifier for the position.
    /// @param trader The address of the trader who opened the position.
    /// @param currency The address of the currency to be paid for the position.
    /// @param collateralCurrency The address of the currency to be received for the position.
    /// @param lastFundingTimestamp The timestamp of the last funding payment.
    /// @param downPayment The initial down payment amount required to open the position (is in `currency` for long, `collateralCurrency` for short positions)
    /// @param principal The total principal amount to be borrowed for the position (is in `currency`)
    /// @param collateralAmount The total collateral amount to be received for the position (is in `collateralCurrency`)
    /// @param feesToBePaid The total fees to be paid for the position (is in `currency`)
    struct Position {
        uint256 id;
        address trader;
        address currency;
        address collateralCurrency;
        uint256 lastFundingTimestamp;
        uint256 downPayment;
        uint256 principal;
        uint256 collateralAmount;
        uint256 feesToBePaid;
    }

    /// @notice Defines a request to open a position.
    /// @param id The unique identifier for the position.
    /// @param currency The address of the currency to be paid for the position.
    /// @param targetCurrency The address of the currency to be received for the position.
    /// @param downPayment The initial down payment amount required to open the position (is in `currency` for long, `collateralCurrency` for short positions)
    /// @param principal The total principal amount to be borrowed for the position.
    /// @param minTargetAmount The minimum amount of target currency to be received for the position to be valid.
    /// @param expiration The timestamp when this position request expires.
    /// @param swapPrice The swap price used to convert the down payment to the target currency (should be 0 for long positions).
    /// @param swapPriceDenominator The denominator for the swap price (should be 0 for long positions).
    /// @param functionCallDataList A list of FunctionCallData structures representing functions to call to open the position.
    struct OpenPositionRequest {
        uint256 id;                 // 3x uPPG Short, price: 1=1
        address currency;           // uPPG
        address targetCurrency;     // ETH
        uint256 downPayment;        // 1 ETH
        uint256 principal;          // 3 uPPG
        uint256 minTargetAmount;    // 2.95 ETH
        uint256 expiration;
        uint256 swapPrice;
        uint256 swapPriceDenominator;
        FunctionCallData[] functionCallDataList;
    }

    /// @notice Degines a request to close a position.
    /// @param _expiration The timestamp when this position request expires.
    /// @param _interest The interest to be paid for the position.
    /// @param _position The position to be closed.
    /// @param _functionCallDataList A list of FunctionCallData structures representing functions to call to close the position.
    struct ClosePositionRequest {
        uint256 expiration;
        uint256 interest;
        Position position;
        FunctionCallData[] functionCallDataList;
    }

    /// @notice Defines a signature
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @notice Opens a position
    /// @param _request the request to open a position
    /// @param _signature the signature of the request
    function openPosition(
        OpenPositionRequest calldata _request,
        Signature calldata _signature
    ) external payable;

    /// @notice Closes a position
    /// @param _request the request to close a position
    /// @param _signature the signature of the request
    function closePosition(
        ClosePositionRequest calldata _request,
        Signature calldata _signature
    ) external payable;

    /// @notice Liquidates a position
    /// @param _interest the interest to be paid
    /// @param _position the position to liquidate
    /// @param _swapFunctions the swap functions to use to liquidate the position
    function liquidatePosition(
        uint256 _interest,
        Position calldata _position,
        FunctionCallData[] calldata _swapFunctions
    ) external payable;

    /// @dev Withdraws any stuck ERC721 in this contract
    function withdrawERC721(IERC721 _token, uint256 _tokenId) external;

    /// @dev Withdraws the given amount for the ERC20 token (or ETH) to the receiver
    /// @param _token the token to withdraw (zero address for ETH)
    /// @param _amount the amount to withdraw
    /// @param _receiver the receiver of the token
    function withdraw(address _token, uint256 _amount, address _receiver) external;

    /// @notice Returns the vault used for the given asset
    function getVault(address _asset) external view returns (IWasabiVault);

    /// @notice Adds a new vault
    function addVault(IWasabiVault _vault) external;

    /// @notice Unwraps all of WETH in this contract
    function unwrapWETH() external;
}