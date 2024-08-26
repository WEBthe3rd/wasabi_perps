import type { Address } from 'abitype'
import hre from "hardhat";
import { Hex, WalletClient, parseSignature, getAddress, Account} from "viem";
import { constants } from '@1inch/solidity-utils';
import { ClosePositionRequest, OpenPositionRequest, ClosePositionOrder } from '../../test/utils/PerpStructUtils';
import { Signature, EIP712Domain, EIP712TypeField, OpenPositionRequestTypes, FunctionCallDataTypes, ClosePositionRequestTypes, ClosePositionOrderTypes, PositionTypes, getDomainData } from '../../test/utils/SigningUtils';
import { Order, buildOrderData } from './LimitOrderUtils';

type EIP712SignatureParams<T> = {
    account: Account;
    domain: EIP712Domain;
    primaryType: string;
    message: T;
    types: Record<string, EIP712TypeField[]>;
}

/**
 * Signs an Order using EIP712
 * @param order the limit order
 * @param chainId the chain id
 * @param verifyingContract the verifying contract
 * @param signer the signing wallet
 * @returns signature as a bytes string
 */
export async function signLimitOrder (
    order: Order, 
    chainId: number, 
    verifyingContract: Address, 
    signer: WalletClient
): Promise<`0x${string}`> {
    const orderData = buildOrderData(chainId, verifyingContract, order);
    return await signer.signTypedData({
        account: signer.account!,
        domain: orderData.domain, 
        types: orderData.types,
        primaryType: "Order",
        message: orderData.value
    });
}

/**
 * Signs an OpenPositionRequest using EIP712
 * @param signer the signing wallet
 * @param contractName the contract name
 * @param verifyingContract the verifying contract
 * @param request the open position request
 * @returns a signature object
 */
export async function signOpenPositionRequest(
    signer: WalletClient,
    contractName: string,
    verifyingContract: Address, 
    request: OpenPositionRequest
  ): Promise<Signature> {
    const domain = getDomainData(contractName, verifyingContract);
    const typeData: EIP712SignatureParams<OpenPositionRequest>  = {
      account: signer.account!,
      types: {
        OpenPositionRequest: OpenPositionRequestTypes,
        FunctionCallData: FunctionCallDataTypes,
      },
      primaryType: "OpenPositionRequest",
      domain,
      message: request,
    };
  
    const signature = await signer.signTypedData(typeData);
    const signatureData = parseSignature(signature);
    return {
      v: Number(signatureData.v),
      r: signatureData.r,
      s: signatureData.s,
    };
  }
  
  export async function signClosePositionRequest(
    signer: WalletClient,
    contractName: string,
    verifyingContract: Address, 
    request: ClosePositionRequest
  ): Promise<Signature> {
    const domain = getDomainData(contractName, verifyingContract);
    const typeData: EIP712SignatureParams<ClosePositionRequest>  = {
      account: signer.account!,
      types: {
        ClosePositionRequest: ClosePositionRequestTypes,
        Position: PositionTypes,
        FunctionCallData: FunctionCallDataTypes,
      },
      primaryType: "ClosePositionRequest",
      domain,
      message: request,
    };
  
    const signature = await signer.signTypedData(typeData);
    const signatureData = parseSignature(signature);
    return {
      v: Number(signatureData.v),
      r: signatureData.r,
      s: signatureData.s,
    };
  }
  
  export async function signClosePositionOrder(
    signer: WalletClient,
    contractName: string,
    verifyingContract: Address, 
    order: ClosePositionOrder
  ): Promise<Signature> {
    const domain = getDomainData(contractName, verifyingContract);
    const typeData: EIP712SignatureParams<ClosePositionOrder>  = {
      account: signer.account!,
      types: {
        ClosePositionOrder: ClosePositionOrderTypes,
      },
      primaryType: "ClosePositionOrder",
      domain,
      message: order,
    };
  
    const signature = await signer.signTypedData(typeData);
    const signatureData = parseSignature(signature);
    return {
      v: Number(signatureData.v),
      r: signatureData.r,
      s: signatureData.s,
    };
  }