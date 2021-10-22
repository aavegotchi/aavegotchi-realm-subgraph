import { BigInt } from "@graphprotocol/graph-ts"
import {
  RealmDiamond,
  DiamondCut,
  OwnershipTransferred,
  OwnershipTransferred1,
  Approval,
  ApprovalForAll,
  MintParcel,
  Transfer,
  OwnershipTransferred2,
  Approval1,
  ApprovalForAll1,
  MintParcel1,
  Transfer1
} from "../generated/RealmDiamond/RealmDiamond"
import { ExampleEntity } from "../generated/schema"

export function handleDiamondCut(event: DiamondCut): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity._init = event.params._init
  entity._calldata = event.params._calldata

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.facetAddress(...)
  // - contract.facetAddresses(...)
  // - contract.facetFunctionSelectors(...)
  // - contract.supportsInterface(...)
  // - contract.balanceOf(...)
  // - contract.getApproved(...)
  // - contract.isApprovedForAll(...)
  // - contract.name(...)
  // - contract.ownerOf(...)
  // - contract.symbol(...)
  // - contract.tokenByIndex(...)
  // - contract.tokenIdsOfOwner(...)
  // - contract.tokenURI(...)
  // - contract.totalSupply(...)
  // - contract.owner(...)
  // - contract.getParcelInfo(...)
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleOwnershipTransferred1(
  event: OwnershipTransferred1
): void {}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}

export function handleMintParcel(event: MintParcel): void {}

export function handleTransfer(event: Transfer): void {}

export function handleOwnershipTransferred2(
  event: OwnershipTransferred2
): void {}

export function handleApproval1(event: Approval1): void {}

export function handleApprovalForAll1(event: ApprovalForAll1): void {}

export function handleMintParcel1(event: MintParcel1): void {}

export function handleTransfer1(event: Transfer1): void {}
